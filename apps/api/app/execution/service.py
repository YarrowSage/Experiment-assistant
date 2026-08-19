from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.execution.domain import ExecutionStateError, RunStepStatus, require_step_transition
from app.execution.errors import (
    ExecutionRevisionConflictError,
    ExecutionStateConflictError,
    RunStepNotFoundError,
)
from app.execution.models import RunStepRecord, RunSubStepRecord
from app.execution.repository import ExecutionRepository
from app.execution.schemas import RunExecutionAction, RunStepAction
from app.experiment_runs.domain import ExperimentRunStatus
from app.experiment_runs.errors import ExperimentRunNotFoundError
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.repository import ExperimentRunRepository
from app.protocols.errors import ProtocolVersionNotFoundError
from app.protocols.repository import ProtocolRepository
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ExecutionService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = ExecutionRepository(session)
        self.runs = ExperimentRunRepository(session)
        self.protocols = ProtocolRepository(session)

    def get(self, run_id: UUID) -> ExperimentRun:
        run = self.repository.get_run(self.workspace_id, run_id)
        if run is None:
            raise ExperimentRunNotFoundError(run_id)
        return run

    def start(self, run_id: UUID, payload: RunExecutionAction) -> ExperimentRun:
        run = self.get(run_id)
        self._require_run_revision(run, payload.expected_run_revision)
        if ExperimentRunStatus(run.status) not in {
            ExperimentRunStatus.PLANNED,
            ExperimentRunStatus.READY,
        }:
            raise ExecutionStateConflictError("Only a planned or ready Experiment can start.")
        if run.actual_start_at is not None or run.run_steps:
            raise ExecutionStateConflictError("This Experiment execution has already started.")

        source_version = None
        if run.protocol_version_id is not None:
            source_version = self.protocols.get_version(self.workspace_id, run.protocol_version_id)
            if source_version is None:
                raise ProtocolVersionNotFoundError(run.protocol_version_id)

        now = utc_now()
        updated = self.runs.compare_and_swap(
            self.workspace_id,
            run.id,
            payload.expected_run_revision,
            {
                "status": ExperimentRunStatus.IN_PROGRESS.value,
                "actual_start_at": now,
                "updated_at": now,
            },
        )
        if updated is None:
            self.session.rollback()
            raise ExecutionRevisionConflictError

        if source_version is not None:
            for source_step in source_version.steps:
                snapshot = RunStepRecord(
                    experiment_run_id=run.id,
                    source_protocol_version_id=source_version.id,
                    source_protocol_step_id=source_step.id,
                    source_stable_key=source_step.stable_key,
                    position=source_step.position,
                    title_snapshot=source_step.title,
                    instruction_snapshot=source_step.instruction,
                    planned_duration_seconds_snapshot=source_step.planned_duration_seconds,
                    timer_mode_snapshot=source_step.timer_mode,
                    required_snapshot=source_step.required,
                    precautions_snapshot=source_step.precautions,
                    status=RunStepStatus.PENDING.value,
                    actual_start_at=None,
                    actual_end_at=None,
                    completed_at=None,
                    created_at=now,
                    updated_at=now,
                    revision=1,
                )
                for source_substep in source_step.substeps:
                    snapshot.substeps.append(
                        RunSubStepRecord(
                            source_protocol_substep_id=source_substep.id,
                            position=source_substep.position,
                            title_snapshot=source_substep.title,
                            instruction_snapshot=source_substep.instruction,
                        )
                    )
                self.session.add(snapshot)
        self.session.commit()
        return self.get(run.id)

    def pause(self, run_id: UUID, payload: RunExecutionAction) -> ExperimentRun:
        return self._change_run_state(
            run_id,
            payload,
            expected=ExperimentRunStatus.IN_PROGRESS,
            target=ExperimentRunStatus.PAUSED,
        )

    def resume(self, run_id: UUID, payload: RunExecutionAction) -> ExperimentRun:
        return self._change_run_state(
            run_id,
            payload,
            expected=ExperimentRunStatus.PAUSED,
            target=ExperimentRunStatus.IN_PROGRESS,
        )

    def start_step(self, step_id: UUID, payload: RunStepAction) -> ExperimentRun:
        step, run = self._prepare_step_action(step_id, payload)
        try:
            require_step_transition(RunStepStatus(step.status), RunStepStatus.ACTIVE)
        except ExecutionStateError as error:
            raise ExecutionStateConflictError(str(error)) from error
        if any(item.status == RunStepStatus.ACTIVE.value for item in run.run_steps):
            raise ExecutionStateConflictError("Complete the active step before starting another.")
        first_pending = next(
            (item for item in run.run_steps if item.status == RunStepStatus.PENDING.value),
            None,
        )
        if first_pending is None or first_pending.id != step.id:
            raise ExecutionStateConflictError("Start the next pending step in protocol order.")
        now = utc_now()
        self._touch_run(run, payload.expected_run_revision, now)
        updated = self.repository.compare_and_swap_step(
            self.workspace_id,
            step.id,
            payload.expected_step_revision,
            {"status": RunStepStatus.ACTIVE.value, "actual_start_at": now, "updated_at": now},
        )
        if updated is None:
            self.session.rollback()
            raise ExecutionRevisionConflictError
        self.session.commit()
        return self.get(run.id)

    def complete_step(self, step_id: UUID, payload: RunStepAction) -> ExperimentRun:
        step, run = self._prepare_step_action(step_id, payload)
        try:
            require_step_transition(RunStepStatus(step.status), RunStepStatus.COMPLETED)
        except ExecutionStateError as error:
            raise ExecutionStateConflictError(str(error)) from error
        now = utc_now()
        self._touch_run(run, payload.expected_run_revision, now)
        updated = self.repository.compare_and_swap_step(
            self.workspace_id,
            step.id,
            payload.expected_step_revision,
            {
                "status": RunStepStatus.COMPLETED.value,
                "actual_end_at": now,
                "completed_at": now,
                "updated_at": now,
            },
        )
        if updated is None:
            self.session.rollback()
            raise ExecutionRevisionConflictError
        self.session.commit()
        return self.get(run.id)

    def _change_run_state(
        self,
        run_id: UUID,
        payload: RunExecutionAction,
        *,
        expected: ExperimentRunStatus,
        target: ExperimentRunStatus,
    ) -> ExperimentRun:
        run = self.get(run_id)
        self._require_run_revision(run, payload.expected_run_revision)
        if ExperimentRunStatus(run.status) is not expected:
            raise ExecutionStateConflictError(
                f"Experiment must be {expected.value} before it can become {target.value}."
            )
        now = utc_now()
        updated = self.runs.compare_and_swap(
            self.workspace_id,
            run.id,
            payload.expected_run_revision,
            {"status": target.value, "updated_at": now},
        )
        if updated is None:
            self.session.rollback()
            raise ExecutionRevisionConflictError
        self.session.commit()
        return self.get(run.id)

    def _prepare_step_action(
        self, step_id: UUID, payload: RunStepAction
    ) -> tuple[RunStepRecord, ExperimentRun]:
        step = self.repository.get_step(self.workspace_id, step_id)
        if step is None:
            raise RunStepNotFoundError(step_id)
        run = self.get(step.experiment_run_id)
        self._require_run_revision(run, payload.expected_run_revision)
        if step.revision != payload.expected_step_revision:
            raise ExecutionRevisionConflictError
        if ExperimentRunStatus(run.status) is not ExperimentRunStatus.IN_PROGRESS:
            raise ExecutionStateConflictError(
                "Step actions require an in-progress Experiment. Resume it first if paused."
            )
        return step, run

    def _touch_run(self, run: ExperimentRun, expected_revision: int, now: datetime) -> None:
        updated = self.runs.compare_and_swap(
            self.workspace_id,
            run.id,
            expected_revision,
            {"updated_at": now},
        )
        if updated is None:
            self.session.rollback()
            raise ExecutionRevisionConflictError

    @staticmethod
    def _require_run_revision(run: ExperimentRun, expected_revision: int) -> None:
        if run.revision != expected_revision:
            raise ExecutionRevisionConflictError
