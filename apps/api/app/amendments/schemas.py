from datetime import datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.amendments.domain import AmendmentTargetType
from app.evidence.schemas import ActivityEventResponse
from app.execution.schemas import RunExecutionResponse
from app.projects.schemas import normalize_optional_text


class ExperimentComplete(BaseModel):
    expected_run_revision: int = Field(ge=1)
    completion_note: str | None = None
    acknowledge_incomplete_required_steps: bool = False

    @field_validator("completion_note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        return normalize_optional_text(value)


class AmendmentCreate(BaseModel):
    target_type: AmendmentTargetType
    target_id: UUID
    target_field: str = Field(min_length=1, max_length=64)
    corrected_value: str | None
    reason: str
    expected_target_revision: int = Field(ge=1)

    @field_validator("target_field")
    @classmethod
    def normalize_field(cls, value: str) -> str:
        return value.strip()

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Correction reason is required.")
        return normalized

    @model_validator(mode="after")
    def require_corrected_value_field(self) -> Self:
        if "corrected_value" not in self.model_fields_set:
            raise ValueError(
                "Corrected value must be provided, including null when clearing a field."
            )
        return self


class AmendmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    experiment_run_id: UUID
    target_type: AmendmentTargetType
    target_id: UUID
    target_field: str
    original_value: str | None
    corrected_value: str | None
    reason: str
    prior_revision: int
    resulting_revision: int
    created_by: UUID | None
    created_at: datetime


class AmendmentResult(BaseModel):
    amendment: AmendmentResponse
    execution: RunExecutionResponse
    activity: ActivityEventResponse
