from collections.abc import Mapping
from typing import Any, cast
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session

from app.projects.domain import ProjectStatus
from app.projects.models import Project


class ProjectRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, project: Project) -> Project:
        self.session.add(project)
        self.session.flush()
        return project

    def get(self, workspace_id: UUID, project_id: UUID) -> Project | None:
        return self.session.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.workspace_id == workspace_id,
            )
        )

    def list(
        self,
        workspace_id: UUID,
        *,
        status: ProjectStatus | None,
        archived: bool,
        search: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Project], int]:
        conditions: list[Any] = [Project.workspace_id == workspace_id]
        conditions.append(
            Project.status == ProjectStatus.ARCHIVED.value
            if archived
            else Project.status != ProjectStatus.ARCHIVED.value
        )
        if status is not None:
            conditions.append(Project.status == status.value)
        if search:
            escaped = (
                search.strip()
                .casefold()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )
            pattern = f"%{escaped}%"
            conditions.append(
                or_(
                    func.lower(Project.title).like(pattern, escape="\\"),
                    func.lower(Project.description).like(pattern, escape="\\"),
                    func.lower(Project.objective).like(pattern, escape="\\"),
                )
            )

        total = (
            self.session.scalar(select(func.count()).select_from(Project).where(*conditions)) or 0
        )
        projects = list(
            self.session.scalars(
                select(Project)
                .where(*conditions)
                .order_by(Project.updated_at.desc(), Project.title.asc())
                .limit(limit)
                .offset(offset)
            )
        )
        return projects, total

    def compare_and_swap(
        self,
        workspace_id: UUID,
        project_id: UUID,
        expected_revision: int,
        values: Mapping[str, Any],
    ) -> Project | None:
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(Project)
                .where(
                    Project.id == project_id,
                    Project.workspace_id == workspace_id,
                    Project.revision == expected_revision,
                )
                .values(**values, revision=Project.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get(workspace_id, project_id)
