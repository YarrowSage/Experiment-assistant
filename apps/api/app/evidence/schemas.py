from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.evidence.domain import NOTE_MAX_LENGTH, ActivityType, AttachmentState, normalize_filename
from app.projects.schemas import normalize_optional_text


def normalize_note_content(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Note content is required.")
    if len(normalized) > NOTE_MAX_LENGTH:
        raise ValueError(f"Note content must be {NOTE_MAX_LENGTH} characters or fewer.")
    return normalized


class NoteCreate(BaseModel):
    content: str
    run_step_record_id: UUID | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        return normalize_note_content(value)


class NoteUpdate(BaseModel):
    expected_revision: int = Field(ge=1)
    content: str | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str | None:
        return None if value is None else normalize_note_content(value)

    @model_validator(mode="after")
    def require_content(self) -> Self:
        if "content" not in self.model_fields_set or self.content is None:
            raise ValueError("Updated Note content is required.")
        return self


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    experiment_run_id: UUID
    run_step_record_id: UUID | None
    content: str
    created_by: UUID | None
    created_at: datetime
    updated_at: datetime
    revision: int


class AttachmentUploadMetadata(BaseModel):
    filename: str
    run_step_record_id: UUID | None = None
    description: str | None = None
    captured_at: datetime | None = None

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        return normalize_filename(value)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class AttachmentResponse(BaseModel):
    id: UUID
    original_filename: str
    media_type: str
    size_bytes: int
    checksum_sha256: str
    storage_provider: str
    state: AttachmentState
    description: str | None
    captured_at: datetime | None
    uploaded_at: datetime | None
    created_at: datetime
    updated_at: datetime
    experiment_run_id: UUID
    run_step_record_id: UUID | None
    download_url: str


class ActivityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    project_id: UUID | None
    protocol_id: UUID | None
    experiment_run_id: UUID | None
    run_step_record_id: UUID | None
    note_id: UUID | None
    attachment_id: UUID | None
    event_type: ActivityType
    message: str
    actor_id: UUID | None
    created_at: datetime


class EvidenceBundleResponse(BaseModel):
    notes: list[NoteResponse]
    attachments: list[AttachmentResponse]
    activity: list[ActivityEventResponse]
