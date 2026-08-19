from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UTCDateTime
from app.execution.domain import RunStepStatus
from app.workspaces.domain import utc_now

if TYPE_CHECKING:
    from app.experiment_runs.models import ExperimentRun
    from app.protocols.models import ProtocolStep, ProtocolSubStep, ProtocolVersion


class RunStepRecord(Base):
    __tablename__ = "run_step_records"
    __table_args__ = (
        UniqueConstraint("experiment_run_id", "position", name="uq_run_step_records_position"),
        CheckConstraint("position >= 1", name="ck_run_step_records_position_positive"),
        CheckConstraint(
            "status IN ('pending', 'active', 'completed')",
            name="ck_run_step_records_status",
        ),
        CheckConstraint("revision >= 1", name="ck_run_step_records_revision_positive"),
        CheckConstraint(
            "planned_duration_seconds_snapshot IS NULL OR planned_duration_seconds_snapshot >= 0",
            name="ck_run_step_records_duration_nonnegative",
        ),
        CheckConstraint(
            "timer_mode_snapshot IN ('none', 'count_up', 'countdown')",
            name="ck_run_step_records_timer_mode",
        ),
        CheckConstraint(
            "actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at",
            name="ck_run_step_records_actual_range",
        ),
        Index("ix_run_step_records_run_status", "experiment_run_id", "status"),
        Index("ix_run_step_records_source_step", "source_protocol_step_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    experiment_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("experiment_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_protocol_version_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_versions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_protocol_step_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_steps.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_stable_key: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    instruction_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    planned_duration_seconds_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timer_mode_snapshot: Mapped[str] = mapped_column(String(24), nullable=False)
    required_snapshot: Mapped[bool] = mapped_column(Boolean, nullable=False)
    precautions_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, default=RunStepStatus.PENDING.value
    )
    actual_start_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    actual_end_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    run: Mapped[ExperimentRun] = relationship(back_populates="run_steps")
    source_protocol_version: Mapped[ProtocolVersion] = relationship()
    source_protocol_step: Mapped[ProtocolStep] = relationship()
    substeps: Mapped[list[RunSubStepRecord]] = relationship(
        back_populates="run_step",
        cascade="all, delete-orphan",
        order_by="RunSubStepRecord.position",
    )

    @property
    def duration_seconds(self) -> int | None:
        if self.actual_start_at is None:
            return None
        end = self.actual_end_at or utc_now()
        return max(0, int((end - self.actual_start_at).total_seconds()))


class RunSubStepRecord(Base):
    __tablename__ = "run_substep_records"
    __table_args__ = (
        UniqueConstraint("run_step_record_id", "position", name="uq_run_substeps_position"),
        CheckConstraint("position >= 1", name="ck_run_substeps_position_positive"),
        Index("ix_run_substeps_run_step", "run_step_record_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    run_step_record_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("run_step_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_protocol_substep_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_substeps.id", ondelete="RESTRICT"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    instruction_snapshot: Mapped[str] = mapped_column(Text, nullable=False)

    run_step: Mapped[RunStepRecord] = relationship(back_populates="substeps")
    source_protocol_substep: Mapped[ProtocolSubStep] = relationship()
