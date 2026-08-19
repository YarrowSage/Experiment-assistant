from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.types import UTCDateTime
from app.projects.domain import ProjectStatus
from app.workspaces.domain import utc_now
from app.workspaces.models import Workspace


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('planning', 'active', 'paused', 'completed', 'archived')",
            name="ck_projects_status",
        ),
        CheckConstraint("length(trim(title)) > 0", name="ck_projects_title_not_blank"),
        CheckConstraint("length(title) <= 200", name="ck_projects_title_length"),
        CheckConstraint(
            "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
            name="ck_projects_date_range",
        ),
        CheckConstraint("revision >= 1", name="ck_projects_revision_positive"),
        Index("ix_projects_workspace_status", "workspace_id", "status"),
        Index("ix_projects_workspace_updated_at", "workspace_id", "updated_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    workspace_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=ProjectStatus.PLANNING.value
    )
    start_date: Mapped[date | None] = mapped_column(nullable=True)
    end_date: Mapped[date | None] = mapped_column(nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    workspace: Mapped[Workspace] = relationship(lazy="joined")
