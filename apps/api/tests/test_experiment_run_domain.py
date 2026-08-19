from datetime import UTC, datetime

import pytest

from app.experiment_runs.domain import (
    ExperimentRunLifecycleError,
    ExperimentRunStatus,
    validate_run_transition,
    validate_time_range,
)


def test_experiment_run_lifecycle_is_entity_specific() -> None:
    validate_run_transition(ExperimentRunStatus.DRAFT, ExperimentRunStatus.PLANNED)
    validate_run_transition(ExperimentRunStatus.IN_PROGRESS, ExperimentRunStatus.PAUSED)

    with pytest.raises(ExperimentRunLifecycleError, match="cannot move"):
        validate_run_transition(ExperimentRunStatus.COMPLETED, ExperimentRunStatus.READY)
    with pytest.raises(ExperimentRunLifecycleError, match="archive operation"):
        validate_run_transition(ExperimentRunStatus.PLANNED, ExperimentRunStatus.ARCHIVED)


def test_planned_range_is_validated_without_using_actual_time() -> None:
    start = datetime(2026, 8, 20, tzinfo=UTC)
    with pytest.raises(ValueError, match="Planned end"):
        validate_time_range(start, datetime(2026, 8, 19, tzinfo=UTC), label="Planned")
