from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.experiment_runs.domain import (
    ExperimentRunLifecycleError,
    ExperimentRunStatus,
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
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ExperimentRunService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = ExperimentRunRepository(session)
        self.projects = ProjectRepository(session)

    def create(self, payload: ExperimentRunCreate) -> ExperimentRun:
        project = self.projects.get(self.workspace_id, payload.project_id)
        if project is None:
            raise ExperimentRunProjectConflictError("The selected Project was not found.")
        if ProjectStatus(project.status) is ProjectStatus.ARCHIVED:
            raise ExperimentRunProjectConflictError(
                "Archived Projects cannot receive new Experiments."
            )

        now = utc_now()
        run = ExperimentRun(
            project_id=payload.project_id,
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
        values = payload.model_dump(exclude={"expected_revision"}, exclude_unset=True)
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
