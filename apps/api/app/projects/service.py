from uuid import UUID

from sqlalchemy.orm import Session

from app.evidence.activity import ActivityRecorder
from app.evidence.domain import ActivityType
from app.projects.domain import (
    ProjectLifecycleError,
    ProjectStatus,
    validate_project_date_range,
    validate_project_transition,
)
from app.projects.errors import (
    ProjectNotFoundError,
    ProjectRevisionConflictError,
    ProjectStateConflictError,
)
from app.projects.models import Project
from app.projects.repository import ProjectRepository
from app.projects.schemas import ProjectArchive, ProjectCreate, ProjectUpdate
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ProjectService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = ProjectRepository(session)
        self.activity = ActivityRecorder(session, workspace_id)

    def create(self, payload: ProjectCreate) -> Project:
        now = utc_now()
        project = Project(
            workspace_id=self.workspace_id,
            title=payload.title,
            description=payload.description,
            objective=payload.objective,
            status=payload.status.value,
            start_date=payload.start_date,
            end_date=payload.end_date,
            tags=payload.tags,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        self.repository.add(project)
        self.activity.record(
            ActivityType.PROJECT_CREATED,
            f"Project created: {project.title}",
            project_id=project.id,
        )
        self.session.commit()
        return project

    def get(self, project_id: UUID) -> Project:
        project = self.repository.get(self.workspace_id, project_id)
        if project is None:
            raise ProjectNotFoundError(project_id)
        return project

    def list(
        self,
        *,
        status: ProjectStatus | None,
        archived: bool,
        search: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Project], int]:
        return self.repository.list(
            self.workspace_id,
            status=status,
            archived=archived,
            search=search,
            limit=limit,
            offset=offset,
        )

    def update(self, project_id: UUID, payload: ProjectUpdate) -> Project:
        current = self.get(project_id)
        self._require_revision(current, payload.expected_revision)

        values = payload.model_dump(exclude={"expected_revision"}, exclude_unset=True)
        target_status = ProjectStatus(values.get("status", current.status))
        try:
            validate_project_transition(ProjectStatus(current.status), target_status)
        except ProjectLifecycleError as error:
            raise ProjectStateConflictError(str(error)) from error

        start_date = values.get("start_date", current.start_date)
        end_date = values.get("end_date", current.end_date)
        try:
            validate_project_date_range(start_date, end_date)
        except ValueError as error:
            raise ProjectStateConflictError(str(error)) from error

        if "status" in values:
            values["status"] = target_status.value
        values["updated_at"] = utc_now()
        updated = self.repository.compare_and_swap(
            self.workspace_id,
            project_id,
            payload.expected_revision,
            values,
        )
        if updated is None:
            self.session.rollback()
            if self.repository.get(self.workspace_id, project_id) is None:
                raise ProjectNotFoundError(project_id)
            raise ProjectRevisionConflictError
        self.session.commit()
        return updated

    def archive(self, project_id: UUID, payload: ProjectArchive) -> Project:
        current = self.get(project_id)
        self._require_revision(current, payload.expected_revision)
        if ProjectStatus(current.status) is ProjectStatus.ARCHIVED:
            raise ProjectStateConflictError("Project is already archived.")

        updated = self.repository.compare_and_swap(
            self.workspace_id,
            project_id,
            payload.expected_revision,
            {"status": ProjectStatus.ARCHIVED.value, "updated_at": utc_now()},
        )
        if updated is None:
            self.session.rollback()
            if self.repository.get(self.workspace_id, project_id) is None:
                raise ProjectNotFoundError(project_id)
            raise ProjectRevisionConflictError
        self.session.commit()
        return updated

    @staticmethod
    def _require_revision(project: Project, expected_revision: int) -> None:
        if project.revision != expected_revision:
            raise ProjectRevisionConflictError
