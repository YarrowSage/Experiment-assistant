"""Create the generic ExperimentRun domain.

Revision ID: 0002_experiment_runs
Revises: 0001_workspace_projects
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_experiment_runs"
down_revision: str | None = "0001_workspace_projects"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "experiment_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("planned_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("planned_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completion_note", sa.Text(), nullable=True),
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
            "status IN ('draft', 'planned', 'ready', 'in_progress', 'paused', "
            "'completed', 'cancelled', 'archived')",
            name="ck_experiment_runs_status",
        ),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_experiment_runs_title_not_blank"),
        sa.CheckConstraint("length(title) <= 200", name="ck_experiment_runs_title_length"),
        sa.CheckConstraint(
            "planned_end_at IS NULL OR planned_start_at IS NULL "
            "OR planned_end_at >= planned_start_at",
            name="ck_experiment_runs_planned_range",
        ),
        sa.CheckConstraint(
            "actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at",
            name="ck_experiment_runs_actual_range",
        ),
        sa.CheckConstraint("revision >= 1", name="ck_experiment_runs_revision_positive"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_experiment_runs_project_status",
        "experiment_runs",
        ["project_id", "status"],
    )
    op.create_index(
        "ix_experiment_runs_planned_start",
        "experiment_runs",
        ["planned_start_at"],
    )
    op.create_index(
        "ix_experiment_runs_updated_at",
        "experiment_runs",
        ["updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_experiment_runs_updated_at", table_name="experiment_runs")
    op.drop_index("ix_experiment_runs_planned_start", table_name="experiment_runs")
    op.drop_index("ix_experiment_runs_project_status", table_name="experiment_runs")
    op.drop_table("experiment_runs")
