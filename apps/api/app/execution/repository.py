from collections.abc import Mapping
from typing import Any, cast
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session, selectinload

from app.execution.models import RunStepRecord
from app.experiment_runs.models import ExperimentRun
from app.projects.models import Project


class ExecutionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_run(self, workspace_id: UUID, run_id: UUID) -> ExperimentRun | None:
        return self.session.scalar(
            select(ExperimentRun)
            .join(Project, ExperimentRun.project_id == Project.id)
            .options(selectinload(ExperimentRun.run_steps).selectinload(RunStepRecord.substeps))
            .where(ExperimentRun.id == run_id, Project.workspace_id == workspace_id)
        )

    def get_step(self, workspace_id: UUID, step_id: UUID) -> RunStepRecord | None:
        return self.session.scalar(
            select(RunStepRecord)
            .join(ExperimentRun, RunStepRecord.experiment_run_id == ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .options(selectinload(RunStepRecord.substeps), selectinload(RunStepRecord.run))
            .where(RunStepRecord.id == step_id, Project.workspace_id == workspace_id)
        )

    def compare_and_swap_step(
        self,
        workspace_id: UUID,
        step_id: UUID,
        expected_revision: int,
        values: Mapping[str, Any],
    ) -> RunStepRecord | None:
        run_ids = (
            select(ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(RunStepRecord)
                .where(
                    RunStepRecord.id == step_id,
                    RunStepRecord.experiment_run_id.in_(run_ids),
                    RunStepRecord.revision == expected_revision,
                )
                .values(**values, revision=RunStepRecord.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get_step(workspace_id, step_id)
