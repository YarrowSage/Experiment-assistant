from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.amendments.errors import CompletedRecordProtectedError
from app.evidence.activity import ActivityRecorder
from app.evidence.domain import ActivityType
from app.experiment_runs.domain import (
    ExperimentRunLifecycleError,
    ExperimentRunStatus,
    is_completed_record,
    validate_run_transition,
    validate_time_range,
)
from app.experiment_runs.errors import (
    ExperimentRunNotFoundError,
    ExperimentRunProjectConflictError,
    ExperimentRunRevisionConflictError,
    ExperimentRunStateConflictError,
)
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.repository import ExperimentRunRepository
from app.experiment_runs.schemas import (
    ExperimentRunArchive,
    ExperimentRunCreate,
    ExperimentRunUpdate,
)
from app.projects.domain import ProjectStatus
from app.projects.repository import ProjectRepository
from app.protocols.domain import ProtocolVersionStatus
from app.protocols.repository import ProtocolRepository
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ExperimentRunService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = ExperimentRunRepository(session)
        self.projects = ProjectRepository(session)
        self.protocols = ProtocolRepository(session)
        self.activity = ActivityRecorder(session, workspace_id)

    def create(self, payload: ExperimentRunCreate) -> ExperimentRun:
        project = self.projects.get(self.workspace_id, payload.project_id)
        if project is None:
            raise ExperimentRunProjectConflictError("The selected Project was not found.")
        if ProjectStatus(project.status) is ProjectStatus.ARCHIVED:
            raise ExperimentRunProjectConflictError(
                "Archived Projects cannot receive new Experiments."
            )
        self._validate_protocol_version(payload.project_id, payload.protocol_version_id)

        now = utc_now()
        run = ExperimentRun(
            project_id=payload.project_id,
            protocol_version_id=payload.protocol_version_id,
            title=payload.title,
            description=payload.description,
            purpose=payload.purpose,
            status=payload.status.value,
            planned_start_at=payload.planned_start_at,
            planned_end_at=payload.planned_end_at,
            actual_start_at=None,
            actual_end_at=None,
            completed_at=None,
            completion_note=None,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        self.repository.add(run)
        self.activity.record(
            ActivityType.EXPERIMENT_CREATED,
            f"Experiment created: {run.title}",
            project_id=run.project_id,
            experiment_run_id=run.id,
        )
        self.session.commit()
        self.session.refresh(run)
        return run

    def get(self, run_id: UUID) -> ExperimentRun:
        run = self.repository.get(self.workspace_id, run_id)
        if run is None:
            raise ExperimentRunNotFoundError(run_id)
        return run

    def list(
        self,
        *,
        project_id: UUID | None,
        status: ExperimentRunStatus | None,
        archived: bool,
        search: str | None,
        planned_from: datetime | None,
        planned_to: datetime | None,
        limit: int,
        offset: int,
    ) -> tuple[list[ExperimentRun], int]:
        return self.repository.list(
            self.workspace_id,
            project_id=project_id,
            status=status,
            archived=archived,
            search=search,
            planned_from=planned_from,
            planned_to=planned_to,
            limit=limit,
            offset=offset,
        )

    def update(self, run_id: UUID, payload: ExperimentRunUpdate) -> ExperimentRun:
        current = self.get(run_id)
        self._require_revision(current, payload.expected_revision)
        if is_completed_record(current.completed_at):
            raise CompletedRecordProtectedError
        values = payload.model_dump(exclude={"expected_revision"}, exclude_unset=True)
        if (
            "protocol_version_id" in values
            and values["protocol_version_id"] != current.protocol_version_id
        ):
            if ExperimentRunStatus(current.status) not in {
                ExperimentRunStatus.DRAFT,
                ExperimentRunStatus.PLANNED,
                ExperimentRunStatus.READY,
            }:
                raise ExperimentRunStateConflictError(
                    "The exact Protocol Version cannot change after execution begins."
                )
            self._validate_protocol_version(current.project_id, values["protocol_version_id"])
        target_status = ExperimentRunStatus(values.get("status", current.status))
        try:
            validate_run_transition(ExperimentRunStatus(current.status), target_status)
        except ExperimentRunLifecycleError as error:
            raise ExperimentRunStateConflictError(str(error)) from error

        planned_start = values.get("planned_start_at", current.planned_start_at)
        planned_end = values.get("planned_end_at", current.planned_end_at)
        try:
            validate_time_range(planned_start, planned_end, label="Planned")
        except ValueError as error:
            raise ExperimentRunStateConflictError(str(error)) from error

        if "status" in values:
            values["status"] = target_status.value
        values["updated_at"] = utc_now()
        updated = self.repository.compare_and_swap(
            self.workspace_id,
            run_id,
            payload.expected_revision,
            values,
        )
        if updated is None:
            self.session.rollback()
            if self.repository.get(self.workspace_id, run_id) is None:
                raise ExperimentRunNotFoundError(run_id)
            raise ExperimentRunRevisionConflictError
        self.session.commit()
        return updated

    def archive(self, run_id: UUID, payload: ExperimentRunArchive) -> ExperimentRun:
        current = self.get(run_id)
        self._require_revision(current, payload.expected_revision)
        if ExperimentRunStatus(current.status) is ExperimentRunStatus.ARCHIVED:
            raise ExperimentRunStateConflictError("Experiment is already archived.")
        updated = self.repository.compare_and_swap(
            self.workspace_id,
            run_id,
            payload.expected_revision,
            {"status": ExperimentRunStatus.ARCHIVED.value, "updated_at": utc_now()},
        )
        if updated is None:
            self.session.rollback()
            if self.repository.get(self.workspace_id, run_id) is None:
                raise ExperimentRunNotFoundError(run_id)
            raise ExperimentRunRevisionConflictError
        self.session.commit()
        return updated

    @staticmethod
    def _require_revision(run: ExperimentRun, expected_revision: int) -> None:
        if run.revision != expected_revision:
            raise ExperimentRunRevisionConflictError

    def _validate_protocol_version(
        self, project_id: UUID, protocol_version_id: UUID | None
    ) -> None:
        if protocol_version_id is None:
            return
        version = self.protocols.get_version(self.workspace_id, protocol_version_id)
        if version is None or version.protocol.project_id != project_id:
            raise ExperimentRunProjectConflictError(
                "The selected Protocol Version does not belong to this Project."
            )
        if ProtocolVersionStatus(version.status) is not ProtocolVersionStatus.PUBLISHED:
            raise ExperimentRunStateConflictError(
                "New Experiments can use only an exact published Protocol Version."
            )
