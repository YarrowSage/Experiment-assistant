from collections.abc import Mapping
from datetime import datetime
from typing import Any, cast
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session

from app.experiment_runs.domain import ExperimentRunStatus
from app.experiment_runs.models import ExperimentRun
from app.projects.models import Project


class ExperimentRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, run: ExperimentRun) -> ExperimentRun:
        self.session.add(run)
        self.session.flush()
        return run

    def get(self, workspace_id: UUID, run_id: UUID) -> ExperimentRun | None:
        return self.session.scalar(
            select(ExperimentRun)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(ExperimentRun.id == run_id, Project.workspace_id == workspace_id)
        )

    def list(
        self,
        workspace_id: UUID,
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
        conditions: list[Any] = [Project.workspace_id == workspace_id]
        conditions.append(
            ExperimentRun.status == ExperimentRunStatus.ARCHIVED.value
            if archived
            else ExperimentRun.status != ExperimentRunStatus.ARCHIVED.value
        )
        if project_id is not None:
            conditions.append(ExperimentRun.project_id == project_id)
        if status is not None:
            conditions.append(ExperimentRun.status == status.value)
        if planned_from is not None:
            conditions.append(ExperimentRun.planned_start_at >= planned_from)
        if planned_to is not None:
            conditions.append(ExperimentRun.planned_start_at < planned_to)
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
                    func.lower(ExperimentRun.title).like(pattern, escape="\\"),
                    func.lower(ExperimentRun.description).like(pattern, escape="\\"),
                    func.lower(ExperimentRun.purpose).like(pattern, escape="\\"),
                )
            )

        base = select(ExperimentRun).join(Project, ExperimentRun.project_id == Project.id)
        total = (
            self.session.scalar(
                select(func.count())
                .select_from(ExperimentRun)
                .join(Project, ExperimentRun.project_id == Project.id)
                .where(*conditions)
            )
            or 0
        )
        runs = list(
            self.session.scalars(
                base.where(*conditions)
                .order_by(
                    ExperimentRun.planned_start_at.is_(None),
                    ExperimentRun.planned_start_at.asc(),
                    ExperimentRun.updated_at.desc(),
                )
                .limit(limit)
                .offset(offset)
            )
        )
        return runs, total

    def compare_and_swap(
        self,
        workspace_id: UUID,
        run_id: UUID,
        expected_revision: int,
        values: Mapping[str, Any],
    ) -> ExperimentRun | None:
        project_ids = select(Project.id).where(Project.workspace_id == workspace_id)
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(ExperimentRun)
                .where(
                    ExperimentRun.id == run_id,
                    ExperimentRun.project_id.in_(project_ids),
                    ExperimentRun.revision == expected_revision,
                )
                .values(**values, revision=ExperimentRun.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get(workspace_id, run_id)
