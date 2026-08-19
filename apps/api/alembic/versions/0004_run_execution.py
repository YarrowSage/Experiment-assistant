"""Create persisted Experiment execution snapshots.

Revision ID: 0004_run_execution
Revises: 0003_protocols_versions_steps
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_run_execution"
down_revision: str | None = "0003_protocols_versions_steps"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "run_step_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experiment_run_id", sa.Uuid(), nullable=False),
        sa.Column("source_protocol_version_id", sa.Uuid(), nullable=False),
        sa.Column("source_protocol_step_id", sa.Uuid(), nullable=False),
        sa.Column("source_stable_key", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title_snapshot", sa.String(length=200), nullable=False),
        sa.Column("instruction_snapshot", sa.Text(), nullable=False),
        sa.Column("planned_duration_seconds_snapshot", sa.Integer(), nullable=True),
        sa.Column("timer_mode_snapshot", sa.String(length=24), nullable=False),
        sa.Column("required_snapshot", sa.Boolean(), nullable=False),
        sa.Column("precautions_snapshot", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
        sa.Column("actual_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint("position >= 1", name="ck_run_step_records_position_positive"),
        sa.CheckConstraint(
            "status IN ('pending', 'active', 'completed')",
            name="ck_run_step_records_status",
        ),
        sa.CheckConstraint("revision >= 1", name="ck_run_step_records_revision_positive"),
        sa.CheckConstraint(
            "planned_duration_seconds_snapshot IS NULL OR planned_duration_seconds_snapshot >= 0",
            name="ck_run_step_records_duration_nonnegative",
        ),
        sa.CheckConstraint(
            "timer_mode_snapshot IN ('none', 'count_up', 'countdown')",
            name="ck_run_step_records_timer_mode",
        ),
        sa.CheckConstraint(
            "actual_end_at IS NULL OR actual_start_at IS NULL OR actual_end_at >= actual_start_at",
            name="ck_run_step_records_actual_range",
        ),
        sa.ForeignKeyConstraint(["experiment_run_id"], ["experiment_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["source_protocol_version_id"], ["protocol_versions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["source_protocol_step_id"], ["protocol_steps.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("experiment_run_id", "position", name="uq_run_step_records_position"),
    )
    op.create_index(
        "ix_run_step_records_run_status",
        "run_step_records",
        ["experiment_run_id", "status"],
    )
    op.create_index(
        "ix_run_step_records_source_step", "run_step_records", ["source_protocol_step_id"]
    )

    op.create_table(
        "run_substep_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("run_step_record_id", sa.Uuid(), nullable=False),
        sa.Column("source_protocol_substep_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title_snapshot", sa.String(length=200), nullable=False),
        sa.Column("instruction_snapshot", sa.Text(), nullable=False),
        sa.CheckConstraint("position >= 1", name="ck_run_substeps_position_positive"),
        sa.ForeignKeyConstraint(
            ["run_step_record_id"], ["run_step_records.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["source_protocol_substep_id"], ["protocol_substeps.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_step_record_id", "position", name="uq_run_substeps_position"),
    )
    op.create_index("ix_run_substeps_run_step", "run_substep_records", ["run_step_record_id"])


def downgrade() -> None:
    op.drop_index("ix_run_substeps_run_step", table_name="run_substep_records")
    op.drop_table("run_substep_records")
    op.drop_index("ix_run_step_records_source_step", table_name="run_step_records")
    op.drop_index("ix_run_step_records_run_status", table_name="run_step_records")
    op.drop_table("run_step_records")
