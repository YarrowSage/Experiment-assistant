from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UTCDateTime
from app.experiment_runs.domain import ExperimentRunStatus
from app.projects.models import Project
from app.workspaces.domain import utc_now

if TYPE_CHECKING:
    from app.protocols.models import ProtocolVersion


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'planned', 'ready', 'in_progress', 'paused', "
            "'completed', 'cancelled', 'archived')",
            name="ck_experiment_runs_status",
        ),
        CheckConstraint("length(trim(title)) > 0", name="ck_experiment_runs_title_not_blank"),
        CheckConstraint("length(title) <= 200", name="ck_experiment_runs_title_length"),
        CheckConstraint(
            "planned_end_at IS NULL OR planned_start_at IS NULL "
            "OR planned_end_at >= planned_start_at",
            name="ck_experiment_runs_planned_range",
        ),
        CheckConstraint(
            "actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at",
            name="ck_experiment_runs_actual_range",
        ),
        CheckConstraint("revision >= 1", name="ck_experiment_runs_revision_positive"),
        Index("ix_experiment_runs_project_status", "project_id", "status"),
        Index("ix_experiment_runs_protocol_version", "protocol_version_id"),
        Index("ix_experiment_runs_planned_start", "planned_start_at"),
        Index("ix_experiment_runs_updated_at", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
    )
    protocol_version_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_versions.id", ondelete="RESTRICT"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ExperimentRunStatus.DRAFT.value
    )
    planned_start_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    planned_end_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    actual_start_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    actual_end_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completion_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    project: Mapped[Project] = relationship(lazy="joined")
    protocol_version: Mapped[ProtocolVersion | None] = relationship(lazy="joined")
