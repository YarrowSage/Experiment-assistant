"""Create Workspace and Project domain tables.

Revision ID: 0001_workspace_projects
Revises:
Create Date: 2026-08-19
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

import sqlalchemy as sa

from alembic import op

DEFAULT_WORKSPACE_ID = UUID("4b8f6a4d-6bd1-5e91-a028-8d1e282b6520")
DEFAULT_WORKSPACE_NAME = "Default Workspace"

revision: str = "0001_workspace_projects"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint(
            "kind IN ('default', 'personal', 'laboratory', 'team')",
            name="ck_workspaces_kind",
        ),
        sa.CheckConstraint("status IN ('active', 'archived')", name="ck_workspaces_status"),
        sa.CheckConstraint("revision >= 1", name="ck_workspaces_revision_positive"),
        sa.PrimaryKeyConstraint("id"),
    )

    workspace_table = sa.table(
        "workspaces",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("kind", sa.String()),
        sa.column("status", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("revision", sa.Integer()),
    )
    now = datetime.now(UTC)
    op.bulk_insert(
        workspace_table,
        [
            {
                "id": DEFAULT_WORKSPACE_ID,
                "name": DEFAULT_WORKSPACE_NAME,
                "kind": "default",
                "status": "active",
                "created_at": now,
                "updated_at": now,
                "revision": 1,
            }
        ],
    )

    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("objective", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="planning", nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("tags", sa.JSON(), server_default=sa.text("'[]'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("revision", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.CheckConstraint(
            "status IN ('planning', 'active', 'paused', 'completed', 'archived')",
            name="ck_projects_status",
        ),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_projects_title_not_blank"),
        sa.CheckConstraint("length(title) <= 200", name="ck_projects_title_length"),
        sa.CheckConstraint(
            "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
            name="ck_projects_date_range",
        ),
        sa.CheckConstraint("revision >= 1", name="ck_projects_revision_positive"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_workspace_status", "projects", ["workspace_id", "status"])
    op.create_index("ix_projects_workspace_updated_at", "projects", ["workspace_id", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_projects_workspace_updated_at", table_name="projects")
    op.drop_index("ix_projects_workspace_status", table_name="projects")
    op.drop_table("projects")
    op.drop_table("workspaces")
