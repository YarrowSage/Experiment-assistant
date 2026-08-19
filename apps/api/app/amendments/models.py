from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.amendments.domain import AmendmentTargetType
from app.core.database import Base
from app.core.types import UTCDateTime
from app.workspaces.domain import utc_now


class Amendment(Base):
    __tablename__ = "amendments"
    __table_args__ = (
        CheckConstraint(
            "(target_run_id IS NOT NULL AND target_run_step_id IS NULL) OR "
            "(target_run_id IS NULL AND target_run_step_id IS NOT NULL)",
            name="ck_amendments_exact_target",
        ),
        CheckConstraint("length(trim(target_field)) > 0", name="ck_amendments_field_not_blank"),
        CheckConstraint("length(trim(reason)) > 0", name="ck_amendments_reason_not_blank"),
        CheckConstraint("prior_revision >= 1", name="ck_amendments_prior_revision_positive"),
        CheckConstraint(
            "resulting_revision > prior_revision",
            name="ck_amendments_resulting_revision_greater",
        ),
        Index("ix_amendments_run_created", "experiment_run_id", "created_at"),
        Index("ix_amendments_target_run", "target_run_id"),
        Index("ix_amendments_target_step", "target_run_step_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    experiment_run_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("experiment_runs.id", ondelete="RESTRICT"), nullable=False
    )
    target_run_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("experiment_runs.id", ondelete="RESTRICT"), nullable=True
    )
    target_run_step_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("run_step_records.id", ondelete="RESTRICT"), nullable=True
    )
    target_field: Mapped[str] = mapped_column(String(64), nullable=False)
    original_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    corrected_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    prior_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    resulting_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)

    @property
    def target_type(self) -> AmendmentTargetType:
        return (
            AmendmentTargetType.EXPERIMENT_RUN
            if self.target_run_id is not None
            else AmendmentTargetType.RUN_STEP_RECORD
        )

    @property
    def target_id(self) -> UUID:
        target_id = self.target_run_id or self.target_run_step_id
        if target_id is None:
            raise ValueError("Amendment has no target.")
        return target_id
