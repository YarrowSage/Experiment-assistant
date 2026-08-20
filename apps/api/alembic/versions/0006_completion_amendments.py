"""Create immutable Amendment history for completed records.

Revision ID: 0006_completion_amendments
Revises: 0005_notes_attachments_activity
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_completion_amendments"
down_revision: str | None = "0005_notes_attachments_activity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "amendments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experiment_run_id", sa.Uuid(), nullable=False),
        sa.Column("target_run_id", sa.Uuid(), nullable=True),
        sa.Column("target_run_step_id", sa.Uuid(), nullable=True),
        sa.Column("target_field", sa.String(length=64), nullable=False),
        sa.Column("original_value", sa.Text(), nullable=True),
        sa.Column("corrected_value", sa.Text(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("prior_revision", sa.Integer(), nullable=False),
        sa.Column("resulting_revision", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(target_run_id IS NOT NULL AND target_run_step_id IS NULL) OR "
            "(target_run_id IS NULL AND target_run_step_id IS NOT NULL)",
            name="ck_amendments_exact_target",
        ),
        sa.CheckConstraint("length(trim(target_field)) > 0", name="ck_amendments_field_not_blank"),
        sa.CheckConstraint("length(trim(reason)) > 0", name="ck_amendments_reason_not_blank"),
        sa.CheckConstraint("prior_revision >= 1", name="ck_amendments_prior_revision_positive"),
        sa.CheckConstraint(
            "resulting_revision > prior_revision",
            name="ck_amendments_resulting_revision_greater",
        ),
        sa.ForeignKeyConstraint(["experiment_run_id"], ["experiment_runs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["target_run_id"], ["experiment_runs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["target_run_step_id"], ["run_step_records.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_amendments_run_created", "amendments", ["experiment_run_id", "created_at"])
    op.create_index("ix_amendments_target_run", "amendments", ["target_run_id"])
    op.create_index("ix_amendments_target_step", "amendments", ["target_run_step_id"])


def downgrade() -> None:
    op.drop_index("ix_amendments_target_step", table_name="amendments")
    op.drop_index("ix_amendments_target_run", table_name="amendments")
    op.drop_index("ix_amendments_run_created", table_name="amendments")
    op.drop_table("amendments")
