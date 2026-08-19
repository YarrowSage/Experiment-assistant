from datetime import date, datetime
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.projects.domain import (
    PROJECT_TEXT_MAX_LENGTH,
    PROJECT_TITLE_MAX_LENGTH,
    ProjectStatus,
    normalize_project_tags,
    validate_project_date_range,
)


def normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    objective: str | None = None
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Project name is required.")
        if len(normalized) > PROJECT_TITLE_MAX_LENGTH:
            raise ValueError(
                f"Project name must be {PROJECT_TITLE_MAX_LENGTH} characters or fewer."
            )
        return normalized

    @field_validator("description", "objective")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        normalized = normalize_optional_text(value)
        if normalized is not None and len(normalized) > PROJECT_TEXT_MAX_LENGTH:
            raise ValueError(f"Text must be {PROJECT_TEXT_MAX_LENGTH} characters or fewer.")
        return normalized

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str]) -> list[str]:
        return normalize_project_tags(value)

    @field_validator("status")
    @classmethod
    def validate_initial_status(cls, value: ProjectStatus) -> ProjectStatus:
        if value is ProjectStatus.ARCHIVED:
            raise ValueError("New projects cannot start archived.")
        return value

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        validate_project_date_range(self.start_date, self.end_date)
        return self


class ProjectUpdate(BaseModel):
    expected_revision: int = Field(ge=1)
    title: str | None = None
    description: str | None = None
    objective: str | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return ProjectCreate.validate_title(value)

    @field_validator("description", "objective")
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return ProjectCreate.validate_optional_text(value)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: list[str] | None) -> list[str] | None:
        return None if value is None else normalize_project_tags(value)

    @model_validator(mode="after")
    def validate_patch(self) -> Self:
        changed_fields = self.model_fields_set - {"expected_revision"}
        if not changed_fields:
            raise ValueError("At least one project field must be provided.")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("Project name cannot be cleared.")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Project status cannot be cleared.")
        if "tags" in self.model_fields_set and self.tags is None:
            raise ValueError("Project tags must be a list. Use an empty list to clear them.")
        return self


class ProjectArchive(BaseModel):
    expected_revision: int = Field(ge=1)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    workspace_id: UUID
    title: str
    description: str | None
    objective: str | None
    status: ProjectStatus
    start_date: date | None
    end_date: date | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    revision: int


class ProjectListResponse(BaseModel):
    items: list[ProjectResponse]
    total: int
    limit: int
    offset: int
