from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.types import UTCDateTime
from app.evidence.domain import AttachmentState
from app.workspaces.domain import utc_now


class Note(Base):
    __tablename__ = "notes"
    __table_args__ = (
        CheckConstraint("length(trim(content)) > 0", name="ck_notes_content_not_blank"),
        CheckConstraint("revision >= 1", name="ck_notes_revision_positive"),
        Index("ix_notes_run_created", "experiment_run_id", "created_at"),
        Index("ix_notes_run_step", "run_step_record_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    experiment_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("experiment_runs.id", ondelete="CASCADE"), nullable=False
    )
    run_step_record_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("run_step_records.id", ondelete="CASCADE"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class FileAttachment(Base):
    __tablename__ = "file_attachments"
    __table_args__ = (
        CheckConstraint(
            "length(trim(original_filename)) > 0", name="ck_attachments_name_not_blank"
        ),
        CheckConstraint("size_bytes >= 0", name="ck_attachments_size_nonnegative"),
        CheckConstraint("length(checksum_sha256) = 64", name="ck_attachments_sha256_length"),
        CheckConstraint(
            "state IN ('pending', 'available', 'failed', 'quarantined', 'deleted')",
            name="ck_attachments_state",
        ),
        UniqueConstraint("storage_provider", "storage_key", name="uq_attachments_storage_object"),
        Index("ix_attachments_checksum", "checksum_sha256"),
        Index("ix_attachments_uploaded_at", "uploaded_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    state: Mapped[str] = mapped_column(
        String(32), nullable=False, default=AttachmentState.PENDING.value
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    uploaded_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)


class ExperimentRunAttachment(Base):
    __tablename__ = "experiment_run_attachments"
    __table_args__ = (Index("ix_run_attachments_run", "experiment_run_id"),)

    attachment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("file_attachments.id", ondelete="CASCADE"), primary_key=True
    )
    experiment_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("experiment_runs.id", ondelete="CASCADE"), nullable=False
    )
    linked_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)


class RunStepAttachment(Base):
    __tablename__ = "run_step_attachments"
    __table_args__ = (Index("ix_step_attachments_step", "run_step_record_id"),)

    attachment_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("file_attachments.id", ondelete="CASCADE"), primary_key=True
    )
    run_step_record_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("run_step_records.id", ondelete="CASCADE"), nullable=False
    )
    linked_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_workspace_created", "workspace_id", "created_at"),
        Index("ix_activity_project_created", "project_id", "created_at"),
        Index("ix_activity_run_created", "experiment_run_id", "created_at"),
        Index("ix_activity_step_created", "run_step_record_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    workspace_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("workspaces.id", ondelete="RESTRICT"), nullable=False
    )
    project_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="RESTRICT"), nullable=True
    )
    protocol_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("protocols.id", ondelete="RESTRICT"), nullable=True
    )
    experiment_run_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("experiment_runs.id", ondelete="RESTRICT"), nullable=True
    )
    run_step_record_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("run_step_records.id", ondelete="RESTRICT"), nullable=True
    )
    note_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("notes.id", ondelete="RESTRICT"), nullable=True
    )
    attachment_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("file_attachments.id", ondelete="RESTRICT"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    actor_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
