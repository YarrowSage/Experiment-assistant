from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.amendments.models import Amendment
from app.experiment_runs.models import ExperimentRun
from app.projects.models import Project


class AmendmentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, amendment: Amendment) -> Amendment:
        self.session.add(amendment)
        self.session.flush()
        return amendment

    def list_for_run(self, workspace_id: UUID, run_id: UUID) -> list[Amendment]:
        return list(
            self.session.scalars(
                select(Amendment)
                .join(ExperimentRun, Amendment.experiment_run_id == ExperimentRun.id)
                .join(Project, ExperimentRun.project_id == Project.id)
                .where(
                    Amendment.experiment_run_id == run_id,
                    Project.workspace_id == workspace_id,
                )
                .order_by(Amendment.created_at.desc(), Amendment.id.desc())
            )
        )
