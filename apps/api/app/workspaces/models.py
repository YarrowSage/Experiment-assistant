from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.types import UTCDateTime
from app.workspaces.domain import utc_now


class Workspace(Base):
    __tablename__ = "workspaces"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('default', 'personal', 'laboratory', 'team')",
            name="ck_workspaces_kind",
        ),
        CheckConstraint("status IN ('active', 'archived')", name="ck_workspaces_status"),
        CheckConstraint("revision >= 1", name="ck_workspaces_revision_positive"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="default")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)
    revision: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
