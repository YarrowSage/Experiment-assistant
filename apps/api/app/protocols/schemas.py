from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.projects.schemas import normalize_optional_text
from app.protocols.domain import (
    PROTOCOL_STEP_TITLE_MAX_LENGTH,
    PROTOCOL_TEXT_MAX_LENGTH,
    PROTOCOL_TITLE_MAX_LENGTH,
    ProtocolStatus,
    ProtocolTimerMode,
    ProtocolVersionStatus,
)


def validate_title(value: str, *, label: str, maximum: int) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{label} is required.")
    if len(normalized) > maximum:
        raise ValueError(f"{label} must be {maximum} characters or fewer.")
    return normalized


def validate_text(value: str | None) -> str | None:
    normalized = normalize_optional_text(value)
    if normalized is not None and len(normalized) > PROTOCOL_TEXT_MAX_LENGTH:
        raise ValueError(f"Text must be {PROTOCOL_TEXT_MAX_LENGTH} characters or fewer.")
    return normalized


class ProtocolCreate(BaseModel):
    project_id: UUID
    title: str
    description: str | None = None
    purpose: str | None = None
    precautions: str | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return validate_title(value, label="Protocol name", maximum=PROTOCOL_TITLE_MAX_LENGTH)

    @field_validator("description", "purpose", "precautions")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return validate_text(value)


class ProtocolUpdate(BaseModel):
    expected_revision: int = Field(ge=1)
    title: str | None = None
    status: ProtocolStatus | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        return (
            None
            if value is None
            else validate_title(value, label="Protocol name", maximum=PROTOCOL_TITLE_MAX_LENGTH)
        )

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set - {"expected_revision"}:
            raise ValueError("At least one Protocol field must be provided.")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Protocol name cannot be cleared.")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Protocol status cannot be cleared.")
        return self


class ProtocolVersionUpdate(BaseModel):
    expected_revision: int = Field(ge=1)
    description: str | None = None
    purpose: str | None = None
    precautions: str | None = None
    change_summary: str | None = None

    @field_validator("description", "purpose", "precautions", "change_summary")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return validate_text(value)

    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set - {"expected_revision"}:
            raise ValueError("At least one Protocol Version field must be provided.")
        return self


class ProtocolSubStepInput(BaseModel):
    title: str
    instruction: str

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return validate_title(value, label="Sub-step name", maximum=PROTOCOL_STEP_TITLE_MAX_LENGTH)

    @field_validator("instruction")
    @classmethod
    def normalize_instruction(cls, value: str) -> str:
        return validate_title(value, label="Sub-step instruction", maximum=PROTOCOL_TEXT_MAX_LENGTH)


class ProtocolStepInput(BaseModel):
    expected_version_revision: int = Field(ge=1)
    title: str
    instruction: str
    planned_duration_seconds: int | None = Field(default=None, ge=0)
    timer_mode: ProtocolTimerMode = ProtocolTimerMode.NONE
    required: bool = True
    precautions: str | None = None
    substeps: list[ProtocolSubStepInput] = Field(default_factory=list, max_length=100)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return validate_title(value, label="Step name", maximum=PROTOCOL_STEP_TITLE_MAX_LENGTH)

    @field_validator("instruction")
    @classmethod
    def normalize_instruction(cls, value: str) -> str:
        return validate_title(value, label="Step instruction", maximum=PROTOCOL_TEXT_MAX_LENGTH)

    @field_validator("precautions")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return validate_text(value)


class ProtocolStepMove(BaseModel):
    expected_version_revision: int = Field(ge=1)
    direction: str

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, value: str) -> str:
        if value not in {"up", "down"}:
            raise ValueError("Direction must be up or down.")
        return value


class ProtocolVersionPublish(BaseModel):
    expected_revision: int = Field(ge=1)


class ProtocolNewVersion(BaseModel):
    expected_protocol_revision: int = Field(ge=1)
    change_summary: str

    @field_validator("change_summary")
    @classmethod
    def normalize_change_summary(cls, value: str) -> str:
        normalized = validate_text(value)
        if normalized is None:
            raise ValueError("Change summary is required.")
        return normalized


class ProtocolSubStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    title: str
    instruction: str


class ProtocolStepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stable_key: UUID
    position: int
    title: str
    instruction: str
    planned_duration_seconds: int | None
    timer_mode: ProtocolTimerMode
    required: bool
    precautions: str | None
    substeps: list[ProtocolSubStepResponse]


class ProtocolVersionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    protocol_id: UUID
    version_number: int
    status: ProtocolVersionStatus
    change_summary: str | None
    based_on_version_id: UUID | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    revision: int


class ProtocolVersionResponse(ProtocolVersionSummary):
    description: str | None
    purpose: str | None
    precautions: str | None
    steps: list[ProtocolStepResponse]


class ProtocolResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    title: str
    status: ProtocolStatus
    created_at: datetime
    updated_at: datetime
    revision: int
    versions: list[ProtocolVersionSummary]


class ProtocolListResponse(BaseModel):
    items: list[ProtocolResponse]
    total: int
    limit: int
    offset: int
