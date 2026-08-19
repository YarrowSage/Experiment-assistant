"""Create contextual Notes, Attachment metadata, and Activity Events.

Revision ID: 0005_notes_attachments_activity
Revises: 0004_run_execution
Create Date: 2026-08-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_notes_attachments_activity"
down_revision: str | None = "0004_run_execution"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("experiment_run_id", sa.Uuid(), nullable=False),
        sa.Column("run_step_record_id", sa.Uuid(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=True),
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
        sa.CheckConstraint("length(trim(content)) > 0", name="ck_notes_content_not_blank"),
        sa.CheckConstraint("revision >= 1", name="ck_notes_revision_positive"),
        sa.ForeignKeyConstraint(["experiment_run_id"], ["experiment_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["run_step_record_id"], ["run_step_records.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notes_run_created", "notes", ["experiment_run_id", "created_at"])
    op.create_index("ix_notes_run_step", "notes", ["run_step_record_id"])

    op.create_table(
        "file_attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("media_type", sa.String(length=255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("storage_provider", sa.String(length=64), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("state", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint(
            "length(trim(original_filename)) > 0", name="ck_attachments_name_not_blank"
        ),
        sa.CheckConstraint("size_bytes >= 0", name="ck_attachments_size_nonnegative"),
        sa.CheckConstraint("length(checksum_sha256) = 64", name="ck_attachments_sha256_length"),
        sa.CheckConstraint(
            "state IN ('pending', 'available', 'failed', 'quarantined', 'deleted')",
            name="ck_attachments_state",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "storage_provider", "storage_key", name="uq_attachments_storage_object"
        ),
    )
    op.create_index("ix_attachments_checksum", "file_attachments", ["checksum_sha256"])
    op.create_index("ix_attachments_uploaded_at", "file_attachments", ["uploaded_at"])

    op.create_table(
        "experiment_run_attachments",
        sa.Column("attachment_id", sa.Uuid(), nullable=False),
        sa.Column("experiment_run_id", sa.Uuid(), nullable=False),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["attachment_id"], ["file_attachments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["experiment_run_id"], ["experiment_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("attachment_id"),
    )
    op.create_index("ix_run_attachments_run", "experiment_run_attachments", ["experiment_run_id"])

    op.create_table(
        "run_step_attachments",
        sa.Column("attachment_id", sa.Uuid(), nullable=False),
        sa.Column("run_step_record_id", sa.Uuid(), nullable=False),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["attachment_id"], ["file_attachments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["run_step_record_id"], ["run_step_records.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("attachment_id"),
    )
    op.create_index("ix_step_attachments_step", "run_step_attachments", ["run_step_record_id"])

    op.create_table(
        "activity_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("protocol_id", sa.Uuid(), nullable=True),
        sa.Column("experiment_run_id", sa.Uuid(), nullable=True),
        sa.Column("run_step_record_id", sa.Uuid(), nullable=True),
        sa.Column("note_id", sa.Uuid(), nullable=True),
        sa.Column("attachment_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["protocol_id"], ["protocols.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["experiment_run_id"], ["experiment_runs.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["run_step_record_id"], ["run_step_records.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["note_id"], ["notes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["attachment_id"], ["file_attachments.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_activity_workspace_created", "activity_events", ["workspace_id", "created_at"]
    )
    op.create_index("ix_activity_project_created", "activity_events", ["project_id", "created_at"])
    op.create_index(
        "ix_activity_run_created", "activity_events", ["experiment_run_id", "created_at"]
    )
    op.create_index(
        "ix_activity_step_created", "activity_events", ["run_step_record_id", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_activity_step_created", table_name="activity_events")
    op.drop_index("ix_activity_run_created", table_name="activity_events")
    op.drop_index("ix_activity_project_created", table_name="activity_events")
    op.drop_index("ix_activity_workspace_created", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_index("ix_step_attachments_step", table_name="run_step_attachments")
    op.drop_table("run_step_attachments")
    op.drop_index("ix_run_attachments_run", table_name="experiment_run_attachments")
    op.drop_table("experiment_run_attachments")
    op.drop_index("ix_attachments_uploaded_at", table_name="file_attachments")
    op.drop_index("ix_attachments_checksum", table_name="file_attachments")
    op.drop_table("file_attachments")
    op.drop_index("ix_notes_run_step", table_name="notes")
    op.drop_index("ix_notes_run_created", table_name="notes")
    op.drop_table("notes")
