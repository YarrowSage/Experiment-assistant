"""Create Protocol identities, immutable versions, and ordered steps.

Revision ID: 0003_protocols_versions_steps
Revises: 0002_experiment_runs
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_protocols_versions_steps"
down_revision: str | None = "0002_experiment_runs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "protocols",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
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
            "status IN ('active', 'retired', 'archived')", name="ck_protocols_status"
        ),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_protocols_title_not_blank"),
        sa.CheckConstraint("length(title) <= 200", name="ck_protocols_title_length"),
        sa.CheckConstraint("revision >= 1", name="ck_protocols_revision_positive"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_protocols_project_status", "protocols", ["project_id", "status"])
    op.create_index("ix_protocols_updated_at", "protocols", ["updated_at"])

    op.create_table(
        "protocol_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("protocol_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=True),
        sa.Column("precautions", sa.Text(), nullable=True),
        sa.Column("change_summary", sa.Text(), nullable=True),
        sa.Column("based_on_version_id", sa.Uuid(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint("version_number >= 1", name="ck_protocol_versions_number_positive"),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'superseded', 'retired')",
            name="ck_protocol_versions_status",
        ),
        sa.CheckConstraint("revision >= 1", name="ck_protocol_versions_revision_positive"),
        sa.ForeignKeyConstraint(
            ["based_on_version_id"], ["protocol_versions.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["protocol_id"], ["protocols.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("protocol_id", "version_number", name="uq_protocol_versions_number"),
    )
    op.create_index(
        "ix_protocol_versions_protocol_status", "protocol_versions", ["protocol_id", "status"]
    )

    op.create_table(
        "protocol_steps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("stable_key", sa.Uuid(), nullable=False),
        sa.Column("protocol_version_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.Column("planned_duration_seconds", sa.Integer(), nullable=True),
        sa.Column("timer_mode", sa.String(length=24), server_default="none", nullable=False),
        sa.Column("required", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("precautions", sa.Text(), nullable=True),
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
        sa.CheckConstraint("position >= 1", name="ck_protocol_steps_position_positive"),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_protocol_steps_title_not_blank"),
        sa.CheckConstraint("length(title) <= 200", name="ck_protocol_steps_title_length"),
        sa.CheckConstraint(
            "length(trim(instruction)) > 0", name="ck_protocol_steps_instruction_not_blank"
        ),
        sa.CheckConstraint(
            "timer_mode IN ('none', 'count_up', 'countdown')", name="ck_protocol_steps_timer_mode"
        ),
        sa.CheckConstraint(
            "planned_duration_seconds IS NULL OR planned_duration_seconds >= 0",
            name="ck_protocol_steps_duration_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["protocol_version_id"], ["protocol_versions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("protocol_version_id", "position", name="uq_protocol_steps_position"),
    )
    op.create_index("ix_protocol_steps_version", "protocol_steps", ["protocol_version_id"])

    op.create_table(
        "protocol_substeps",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("protocol_step_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=False),
        sa.CheckConstraint("position >= 1", name="ck_protocol_substeps_position_positive"),
        sa.CheckConstraint("length(trim(title)) > 0", name="ck_protocol_substeps_title_not_blank"),
        sa.CheckConstraint(
            "length(trim(instruction)) > 0", name="ck_protocol_substeps_instruction_not_blank"
        ),
        sa.ForeignKeyConstraint(["protocol_step_id"], ["protocol_steps.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("protocol_step_id", "position", name="uq_protocol_substeps_position"),
    )
    op.create_index("ix_protocol_substeps_step", "protocol_substeps", ["protocol_step_id"])

    with op.batch_alter_table("experiment_runs") as batch_op:
        batch_op.add_column(sa.Column("protocol_version_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            "fk_experiment_runs_protocol_version_id",
            "protocol_versions",
            ["protocol_version_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        batch_op.create_index("ix_experiment_runs_protocol_version", ["protocol_version_id"])


def downgrade() -> None:
    with op.batch_alter_table("experiment_runs") as batch_op:
        batch_op.drop_index("ix_experiment_runs_protocol_version")
        batch_op.drop_constraint("fk_experiment_runs_protocol_version_id", type_="foreignkey")
        batch_op.drop_column("protocol_version_id")
    op.drop_index("ix_protocol_substeps_step", table_name="protocol_substeps")
    op.drop_table("protocol_substeps")
    op.drop_index("ix_protocol_steps_version", table_name="protocol_steps")
    op.drop_table("protocol_steps")
    op.drop_index("ix_protocol_versions_protocol_status", table_name="protocol_versions")
    op.drop_table("protocol_versions")
    op.drop_index("ix_protocols_updated_at", table_name="protocols")
    op.drop_index("ix_protocols_project_status", table_name="protocols")
    op.drop_table("protocols")
