from datetime import date

import pytest

from app.projects.domain import (
    ProjectLifecycleError,
    ProjectStatus,
    normalize_project_tags,
    validate_project_date_range,
    validate_project_transition,
)


def test_tags_are_trimmed_and_deduplicated_case_insensitively() -> None:
    assert normalize_project_tags(["  CCK-8 ", "", "cck-8", "Cells"]) == ["CCK-8", "Cells"]


def test_project_date_range_rejects_an_end_before_start() -> None:
    with pytest.raises(ValueError, match="End date"):
        validate_project_date_range(date(2026, 8, 20), date(2026, 8, 19))


def test_project_lifecycle_is_centralized_and_guarded() -> None:
    validate_project_transition(ProjectStatus.PLANNING, ProjectStatus.ACTIVE)

    with pytest.raises(ProjectLifecycleError, match="cannot move"):
        validate_project_transition(ProjectStatus.COMPLETED, ProjectStatus.ACTIVE)

    with pytest.raises(ProjectLifecycleError, match="archive operation"):
        validate_project_transition(ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED)
