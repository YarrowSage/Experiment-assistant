from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.amendments.domain import (
    AMENDABLE_RUN_FIELDS,
    AMENDABLE_STEP_FIELDS,
    AmendmentTargetType,
)
from app.amendments.errors import (
    AmendmentRevisionConflictError,
    AmendmentValidationError,
    CompletionStateConflictError,
    RequiredStepsIncompleteError,
)
from app.amendments.models import Amendment
from app.amendments.repository import AmendmentRepository
from app.amendments.schemas import AmendmentCreate, ExperimentComplete
from app.evidence.activity import ActivityRecorder
from app.evidence.domain import ActivityType
from app.evidence.models import ActivityEvent
from app.execution.domain import RunStepStatus
from app.execution.errors import RunStepNotFoundError
from app.execution.repository import ExecutionRepository
from app.experiment_runs.domain import ExperimentRunStatus, validate_time_range
from app.experiment_runs.errors import ExperimentRunNotFoundError
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.repository import ExperimentRunRepository
from app.experiment_runs.schemas import validate_run_text, validate_run_title
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class AmendmentService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = AmendmentRepository(session)
        self.runs = ExperimentRunRepository(session)
        self.execution = ExecutionRepository(session)
        self.activity = ActivityRecorder(session, workspace_id)

    def get_execution(self, run_id: UUID) -> ExperimentRun:
        run = self.execution.get_run(self.workspace_id, run_id)
        if run is None:
            raise ExperimentRunNotFoundError(run_id)
        return run

    def complete(self, run_id: UUID, payload: ExperimentComplete) -> ExperimentRun:
        run = self.get_execution(run_id)
        if run.revision != payload.expected_run_revision:
            raise AmendmentRevisionConflictError
        if ExperimentRunStatus(run.status) not in {
            ExperimentRunStatus.IN_PROGRESS,
            ExperimentRunStatus.PAUSED,
        }:
            raise CompletionStateConflictError(
                "Only an in-progress or paused Experiment can be completed."
            )
        if any(step.status == RunStepStatus.ACTIVE.value for step in run.run_steps):
            raise CompletionStateConflictError(
                "Complete the active step before completing the Experiment."
            )
        incomplete_required = [
            step
            for step in run.run_steps
            if step.required_snapshot and step.status != RunStepStatus.COMPLETED.value
        ]
        if incomplete_required and not payload.acknowledge_incomplete_required_steps:
            raise RequiredStepsIncompleteError(len(incomplete_required))
        now = utc_now()
        updated = self.runs.compare_and_swap(
            self.workspace_id,
            run.id,
            payload.expected_run_revision,
            {
                "status": ExperimentRunStatus.COMPLETED.value,
                "actual_end_at": now,
                "completed_at": now,
                "completion_note": payload.completion_note,
                "updated_at": now,
            },
        )
        if updated is None:
            self.session.rollback()
            raise AmendmentRevisionConflictError
        self.activity.record(
            ActivityType.RUN_COMPLETED,
            "Experiment completed explicitly.",
            project_id=run.project_id,
            experiment_run_id=run.id,
        )
        self.session.commit()
        return self.get_execution(run.id)

    def list_for_run(self, run_id: UUID) -> list[Amendment]:
        self.get_execution(run_id)
        return self.repository.list_for_run(self.workspace_id, run_id)

    def amend(
        self, run_id: UUID, payload: AmendmentCreate
    ) -> tuple[Amendment, ExperimentRun, ActivityEvent]:
        run = self.get_execution(run_id)
        if ExperimentRunStatus(run.status) is not ExperimentRunStatus.COMPLETED:
            raise CompletionStateConflictError(
                "Amendments are reserved for completed scientific records."
            )
        if payload.target_type is AmendmentTargetType.EXPERIMENT_RUN:
            amendment = self._amend_run(run, payload)
        else:
            amendment = self._amend_step(run, payload)
        event = self.activity.record(
            ActivityType.AMENDMENT_CREATED,
            f"Amendment recorded for {payload.target_field}.",
            project_id=run.project_id,
            experiment_run_id=run.id,
            run_step_record_id=amendment.target_run_step_id,
        )
        self.session.commit()
        return amendment, self.get_execution(run.id), event

    def _amend_run(self, run: ExperimentRun, payload: AmendmentCreate) -> Amendment:
        if payload.target_id != run.id:
            raise AmendmentValidationError("Amendment target does not match this Experiment.")
        if payload.target_field not in AMENDABLE_RUN_FIELDS:
            raise AmendmentValidationError("That Experiment field is not amendable in Phase 1.")
        if run.revision != payload.expected_target_revision:
            raise AmendmentRevisionConflictError
        original = getattr(run, payload.target_field)
        corrected = self._parse_run_value(payload.target_field, payload.corrected_value)
        values = {payload.target_field: corrected, "updated_at": utc_now()}
        if payload.target_field in {"actual_start_at", "actual_end_at"}:
            corrected_datetime = self._parse_datetime(payload.corrected_value)
            actual_start = (
                corrected_datetime
                if payload.target_field == "actual_start_at"
                else run.actual_start_at
            )
            actual_end = (
                corrected_datetime if payload.target_field == "actual_end_at" else run.actual_end_at
            )
            try:
                validate_time_range(actual_start, actual_end, label="Actual")
            except ValueError as error:
                raise AmendmentValidationError(str(error)) from error
        self._reject_noop(original, corrected)
        updated = self.runs.compare_and_swap(
            self.workspace_id, run.id, payload.expected_target_revision, values
        )
        if updated is None:
            self.session.rollback()
            raise AmendmentRevisionConflictError
        return self.repository.add(
            Amendment(
                experiment_run_id=run.id,
                target_run_id=run.id,
                target_run_step_id=None,
                target_field=payload.target_field,
                original_value=self._serialize(original),
                corrected_value=self._serialize(corrected),
                reason=payload.reason,
                prior_revision=payload.expected_target_revision,
                resulting_revision=payload.expected_target_revision + 1,
                created_by=None,
                created_at=utc_now(),
            )
        )

    def _amend_step(self, run: ExperimentRun, payload: AmendmentCreate) -> Amendment:
        if payload.target_field not in AMENDABLE_STEP_FIELDS:
            raise AmendmentValidationError("That Run Step field is not amendable in Phase 1.")
        step = self.execution.get_step(self.workspace_id, payload.target_id)
        if step is None or step.experiment_run_id != run.id:
            raise RunStepNotFoundError(payload.target_id)
        if step.revision != payload.expected_target_revision:
            raise AmendmentRevisionConflictError
        original = getattr(step, payload.target_field)
        corrected = self._parse_datetime(payload.corrected_value)
        actual_start = (
            corrected if payload.target_field == "actual_start_at" else step.actual_start_at
        )
        actual_end = corrected if payload.target_field == "actual_end_at" else step.actual_end_at
        try:
            validate_time_range(actual_start, actual_end, label="Actual")
        except ValueError as error:
            raise AmendmentValidationError(str(error)) from error
        self._reject_noop(original, corrected)
        now = utc_now()
        touched = self.runs.compare_and_swap(
            self.workspace_id,
            run.id,
            run.revision,
            {"updated_at": now},
        )
        if touched is None:
            self.session.rollback()
            raise AmendmentRevisionConflictError
        updated = self.execution.compare_and_swap_step(
            self.workspace_id,
            step.id,
            payload.expected_target_revision,
            {payload.target_field: corrected, "updated_at": now},
        )
        if updated is None:
            self.session.rollback()
            raise AmendmentRevisionConflictError
        return self.repository.add(
            Amendment(
                experiment_run_id=run.id,
                target_run_id=None,
                target_run_step_id=step.id,
                target_field=payload.target_field,
                original_value=self._serialize(original),
                corrected_value=self._serialize(corrected),
                reason=payload.reason,
                prior_revision=payload.expected_target_revision,
                resulting_revision=payload.expected_target_revision + 1,
                created_by=None,
                created_at=now,
            )
        )

    @staticmethod
    def _parse_run_value(field: str, value: str | None) -> str | datetime | None:
        if field in {"actual_start_at", "actual_end_at"}:
            return AmendmentService._parse_datetime(value)
        try:
            if field == "title":
                if value is None:
                    raise AmendmentValidationError("Experiment title cannot be cleared.")
                return validate_run_title(value)
            return validate_run_text(value)
        except ValueError as error:
            raise AmendmentValidationError(str(error)) from error

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if value is None:
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise AmendmentValidationError(
                "Corrected timestamp must be a valid ISO 8601 date and time."
            ) from error
        if parsed.tzinfo is None:
            raise AmendmentValidationError("Corrected timestamp must include a UTC offset.")
        return parsed.astimezone(UTC)

    @staticmethod
    def _serialize(value: object) -> str | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.astimezone(UTC).isoformat()
        return str(value)

    @staticmethod
    def _reject_noop(original: object, corrected: object) -> None:
        if original == corrected:
            raise AmendmentValidationError("Corrected value must differ from the original value.")
