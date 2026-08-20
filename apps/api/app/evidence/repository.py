from typing import Any, cast
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session

from app.evidence.models import (
    ActivityEvent,
    ExperimentRunAttachment,
    FileAttachment,
    Note,
    RunStepAttachment,
)
from app.execution.models import RunStepRecord
from app.experiment_runs.models import ExperimentRun
from app.projects.models import Project


class EvidenceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, record: object) -> None:
        self.session.add(record)
        self.session.flush()

    def list_notes(self, workspace_id: UUID, run_id: UUID, run_step_id: UUID | None) -> list[Note]:
        conditions: list[Any] = [
            Note.experiment_run_id == run_id,
            Project.workspace_id == workspace_id,
        ]
        if run_step_id is not None:
            conditions.append(Note.run_step_record_id == run_step_id)
        return list(
            self.session.scalars(
                select(Note)
                .join(ExperimentRun, Note.experiment_run_id == ExperimentRun.id)
                .join(Project, ExperimentRun.project_id == Project.id)
                .where(*conditions)
                .order_by(Note.created_at.desc())
            )
        )

    def get_note(self, workspace_id: UUID, note_id: UUID) -> Note | None:
        return self.session.scalar(
            select(Note)
            .join(ExperimentRun, Note.experiment_run_id == ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(Note.id == note_id, Project.workspace_id == workspace_id)
        )

    def compare_and_swap_note(
        self, workspace_id: UUID, note_id: UUID, expected_revision: int, content: str
    ) -> Note | None:
        run_ids = (
            select(ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(Note)
                .where(
                    Note.id == note_id,
                    Note.experiment_run_id.in_(run_ids),
                    Note.revision == expected_revision,
                )
                .values(content=content, updated_at=func.now(), revision=Note.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get_note(workspace_id, note_id)

    def list_attachments(
        self, workspace_id: UUID, run_id: UUID, run_step_id: UUID | None
    ) -> list[tuple[FileAttachment, UUID | None]]:
        if run_step_id is not None:
            rows = self.session.execute(
                select(FileAttachment, RunStepAttachment.run_step_record_id)
                .join(RunStepAttachment, FileAttachment.id == RunStepAttachment.attachment_id)
                .join(RunStepRecord, RunStepAttachment.run_step_record_id == RunStepRecord.id)
                .join(ExperimentRun, RunStepRecord.experiment_run_id == ExperimentRun.id)
                .join(Project, ExperimentRun.project_id == Project.id)
                .where(
                    RunStepRecord.experiment_run_id == run_id,
                    RunStepRecord.id == run_step_id,
                    Project.workspace_id == workspace_id,
                )
            ).all()
            return [(attachment, step_id) for attachment, step_id in rows]

        run_rows = self.session.execute(
            select(FileAttachment)
            .join(
                ExperimentRunAttachment,
                FileAttachment.id == ExperimentRunAttachment.attachment_id,
            )
            .join(
                ExperimentRun,
                ExperimentRunAttachment.experiment_run_id == ExperimentRun.id,
            )
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(ExperimentRun.id == run_id, Project.workspace_id == workspace_id)
        ).scalars()
        step_rows = self.session.execute(
            select(FileAttachment, RunStepAttachment.run_step_record_id)
            .join(RunStepAttachment, FileAttachment.id == RunStepAttachment.attachment_id)
            .join(RunStepRecord, RunStepAttachment.run_step_record_id == RunStepRecord.id)
            .join(ExperimentRun, RunStepRecord.experiment_run_id == ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(ExperimentRun.id == run_id, Project.workspace_id == workspace_id)
        ).all()
        combined = [(attachment, None) for attachment in run_rows]
        combined.extend((attachment, step_id) for attachment, step_id in step_rows)
        return sorted(combined, key=lambda row: row[0].created_at, reverse=True)

    def get_attachment(self, workspace_id: UUID, attachment_id: UUID) -> FileAttachment | None:
        run_attachment_ids = (
            select(ExperimentRunAttachment.attachment_id)
            .join(ExperimentRun, ExperimentRunAttachment.experiment_run_id == ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        step_attachment_ids = (
            select(RunStepAttachment.attachment_id)
            .join(RunStepRecord, RunStepAttachment.run_step_record_id == RunStepRecord.id)
            .join(ExperimentRun, RunStepRecord.experiment_run_id == ExperimentRun.id)
            .join(Project, ExperimentRun.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        return self.session.scalar(
            select(FileAttachment).where(
                FileAttachment.id == attachment_id,
                or_(
                    FileAttachment.id.in_(run_attachment_ids),
                    FileAttachment.id.in_(step_attachment_ids),
                ),
            )
        )

    def list_activity(self, workspace_id: UUID, run_id: UUID) -> list[ActivityEvent]:
        return list(
            self.session.scalars(
                select(ActivityEvent)
                .where(
                    ActivityEvent.workspace_id == workspace_id,
                    ActivityEvent.experiment_run_id == run_id,
                )
                .order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
            )
        )

    def list_workspace_activity(self, workspace_id: UUID, limit: int) -> list[ActivityEvent]:
        return list(
            self.session.scalars(
                select(ActivityEvent)
                .where(ActivityEvent.workspace_id == workspace_id)
                .order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc())
                .limit(limit)
            )
        )
