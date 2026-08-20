from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.experiment_runs.domain import (
    CREATABLE_RUN_STATUSES,
    EXPERIMENT_RUN_TEXT_MAX_LENGTH,
    EXPERIMENT_RUN_TITLE_MAX_LENGTH,
    ExperimentRunStatus,
    validate_time_range,
)
from app.projects.schemas import normalize_optional_text


def validate_run_title(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Experiment name is required.")
    if len(normalized) > EXPERIMENT_RUN_TITLE_MAX_LENGTH:
        raise ValueError(
            f"Experiment name must be {EXPERIMENT_RUN_TITLE_MAX_LENGTH} characters or fewer."
        )
    return normalized


def validate_run_text(value: str | None) -> str | None:
    normalized = normalize_optional_text(value)
    if normalized is not None and len(normalized) > EXPERIMENT_RUN_TEXT_MAX_LENGTH:
        raise ValueError(f"Text must be {EXPERIMENT_RUN_TEXT_MAX_LENGTH} characters or fewer.")
    return normalized


class ExperimentRunCreate(BaseModel):
    project_id: UUID
    protocol_version_id: UUID | None = None
    title: str
    description: str | None = None
    purpose: str | None = None
    status: ExperimentRunStatus = ExperimentRunStatus.DRAFT
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return validate_run_title(value)

    @field_validator("description", "purpose")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return validate_run_text(value)

    @field_validator("status")
    @classmethod
    def validate_initial_status(cls, value: ExperimentRunStatus) -> ExperimentRunStatus:
        if value not in CREATABLE_RUN_STATUSES:
            raise ValueError("New Experiments must start as draft, planned, or ready.")
        return value

    @model_validator(mode="after")
    def validate_planning_range(self) -> Self:
        validate_time_range(self.planned_start_at, self.planned_end_at, label="Planned")
        return self


class ExperimentRunUpdate(BaseModel):
    expected_revision: int = Field(ge=1)
    title: str | None = None
    description: str | None = None
    purpose: str | None = None
    status: ExperimentRunStatus | None = None
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    protocol_version_id: UUID | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        return None if value is None else validate_run_title(value)

    @field_validator("description", "purpose")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return validate_run_text(value)

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        changed_fields = self.model_fields_set - {"expected_revision"}
        if not changed_fields:
            raise ValueError("At least one Experiment field must be provided.")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Experiment name cannot be cleared.")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Experiment status cannot be cleared.")
        return self


class ExperimentRunArchive(BaseModel):
    expected_revision: int = Field(ge=1)


class ExperimentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    protocol_version_id: UUID | None
    title: str
    description: str | None
    purpose: str | None
    status: ExperimentRunStatus
    planned_start_at: datetime | None
    planned_end_at: datetime | None
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    completed_at: datetime | None
    completion_note: str | None
    created_at: datetime
    updated_at: datetime
    revision: int


class ExperimentRunListResponse(BaseModel):
    items: list[ExperimentRunResponse]
    total: int
    limit: int
    offset: int
