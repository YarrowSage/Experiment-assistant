from datetime import date
from enum import StrEnum

PROJECT_TITLE_MAX_LENGTH = 200
PROJECT_TEXT_MAX_LENGTH = 10_000
PROJECT_TAG_MAX_LENGTH = 50
PROJECT_TAG_LIMIT = 24


class ProjectStatus(StrEnum):
    PLANNING = "planning"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectLifecycleError(ValueError):
    pass


ALLOWED_PROJECT_TRANSITIONS: dict[ProjectStatus, frozenset[ProjectStatus]] = {
    ProjectStatus.PLANNING: frozenset(
        {
            ProjectStatus.PLANNING,
            ProjectStatus.ACTIVE,
            ProjectStatus.PAUSED,
            ProjectStatus.COMPLETED,
        }
    ),
    ProjectStatus.ACTIVE: frozenset(
        {ProjectStatus.ACTIVE, ProjectStatus.PAUSED, ProjectStatus.COMPLETED}
    ),
    ProjectStatus.PAUSED: frozenset(
        {ProjectStatus.PAUSED, ProjectStatus.ACTIVE, ProjectStatus.COMPLETED}
    ),
    ProjectStatus.COMPLETED: frozenset({ProjectStatus.COMPLETED}),
    ProjectStatus.ARCHIVED: frozenset({ProjectStatus.ARCHIVED}),
}


def validate_project_transition(current: ProjectStatus, target: ProjectStatus) -> None:
    if target is ProjectStatus.ARCHIVED:
        raise ProjectLifecycleError("Use the archive operation to archive a project.")
    if current is ProjectStatus.ARCHIVED:
        raise ProjectLifecycleError("Archived projects cannot be edited.")
    if target not in ALLOWED_PROJECT_TRANSITIONS[current]:
        raise ProjectLifecycleError(f"Project cannot move from {current.value} to {target.value}.")


def validate_project_date_range(start_date: date | None, end_date: date | None) -> None:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValueError("End date cannot be earlier than start date.")


def normalize_project_tags(tags: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        value = tag.strip()
        if not value:
            continue
        if len(value) > PROJECT_TAG_MAX_LENGTH:
            raise ValueError(f"Tags must be {PROJECT_TAG_MAX_LENGTH} characters or fewer.")
        identity = value.casefold()
        if identity in seen:
            continue
        seen.add(identity)
        normalized.append(value)

    if len(normalized) > PROJECT_TAG_LIMIT:
        raise ValueError(f"Projects can have at most {PROJECT_TAG_LIMIT} tags.")
    return normalized
