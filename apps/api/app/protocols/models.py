from __future__ import annotations

from datetime import datetime
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
from app.projects.models import Project
from app.protocols.domain import ProtocolStatus, ProtocolTimerMode, ProtocolVersionStatus
from app.workspaces.domain import utc_now


class Protocol(Base):
    __tablename__ = "protocols"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'retired', 'archived')", name="ck_protocols_status"),
        CheckConstraint("length(trim(title)) > 0", name="ck_protocols_title_not_blank"),
        CheckConstraint("length(title) <= 200", name="ck_protocols_title_length"),
        CheckConstraint("revision >= 1", name="ck_protocols_revision_positive"),
        Index("ix_protocols_project_status", "project_id", "status"),
        Index("ix_protocols_updated_at", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ProtocolStatus.ACTIVE.value
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    project: Mapped[Project] = relationship(lazy="joined")
    versions: Mapped[list[ProtocolVersion]] = relationship(
        back_populates="protocol",
        cascade="all, delete-orphan",
        order_by="ProtocolVersion.version_number",
    )


class ProtocolVersion(Base):
    __tablename__ = "protocol_versions"
    __table_args__ = (
        UniqueConstraint("protocol_id", "version_number", name="uq_protocol_versions_number"),
        CheckConstraint("version_number >= 1", name="ck_protocol_versions_number_positive"),
        CheckConstraint(
            "status IN ('draft', 'published', 'superseded', 'retired')",
            name="ck_protocol_versions_status",
        ),
        CheckConstraint("revision >= 1", name="ck_protocol_versions_revision_positive"),
        Index("ix_protocol_versions_protocol_status", "protocol_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    protocol_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("protocols.id", ondelete="CASCADE"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ProtocolVersionStatus.DRAFT.value
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    precautions: Mapped[str | None] = mapped_column(Text, nullable=True)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    based_on_version_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_versions.id", ondelete="RESTRICT"),
        nullable=True,
    )
    published_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    protocol: Mapped[Protocol] = relationship(back_populates="versions", lazy="joined")
    steps: Mapped[list[ProtocolStep]] = relationship(
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="ProtocolStep.position",
    )


class ProtocolStep(Base):
    __tablename__ = "protocol_steps"
    __table_args__ = (
        UniqueConstraint("protocol_version_id", "position", name="uq_protocol_steps_position"),
        CheckConstraint("position >= 1", name="ck_protocol_steps_position_positive"),
        CheckConstraint("length(trim(title)) > 0", name="ck_protocol_steps_title_not_blank"),
        CheckConstraint("length(title) <= 200", name="ck_protocol_steps_title_length"),
        CheckConstraint(
            "length(trim(instruction)) > 0", name="ck_protocol_steps_instruction_not_blank"
        ),
        CheckConstraint(
            "timer_mode IN ('none', 'count_up', 'countdown')",
            name="ck_protocol_steps_timer_mode",
        ),
        CheckConstraint(
            "planned_duration_seconds IS NULL OR planned_duration_seconds >= 0",
            name="ck_protocol_steps_duration_nonnegative",
        ),
        Index("ix_protocol_steps_version", "protocol_version_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    stable_key: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False, default=uuid4)
    protocol_version_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("protocol_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)
    planned_duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timer_mode: Mapped[str] = mapped_column(
        String(24), nullable=False, default=ProtocolTimerMode.NONE.value
    )
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    precautions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)

    version: Mapped[ProtocolVersion] = relationship(back_populates="steps")
    substeps: Mapped[list[ProtocolSubStep]] = relationship(
        back_populates="step",
        cascade="all, delete-orphan",
        order_by="ProtocolSubStep.position",
    )


class ProtocolSubStep(Base):
    __tablename__ = "protocol_substeps"
    __table_args__ = (
        UniqueConstraint("protocol_step_id", "position", name="uq_protocol_substeps_position"),
        CheckConstraint("position >= 1", name="ck_protocol_substeps_position_positive"),
        CheckConstraint("length(trim(title)) > 0", name="ck_protocol_substeps_title_not_blank"),
        CheckConstraint(
            "length(trim(instruction)) > 0", name="ck_protocol_substeps_instruction_not_blank"
        ),
        Index("ix_protocol_substeps_step", "protocol_step_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    protocol_step_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("protocol_steps.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)

    step: Mapped[ProtocolStep] = relationship(back_populates="substeps")
