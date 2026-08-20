from datetime import datetime
from enum import StrEnum

EXPERIMENT_RUN_TITLE_MAX_LENGTH = 200
EXPERIMENT_RUN_TEXT_MAX_LENGTH = 10_000


class ExperimentRunStatus(StrEnum):
    DRAFT = "draft"
    PLANNED = "planned"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class ExperimentRunLifecycleError(ValueError):
    pass


def is_completed_record(completed_at: datetime | None) -> bool:
    """Return whether an Experiment has ever been explicitly completed."""

    return completed_at is not None


CREATABLE_RUN_STATUSES = frozenset(
    {
        ExperimentRunStatus.DRAFT,
        ExperimentRunStatus.PLANNED,
        ExperimentRunStatus.READY,
    }
)

ALLOWED_RUN_TRANSITIONS: dict[ExperimentRunStatus, frozenset[ExperimentRunStatus]] = {
    ExperimentRunStatus.DRAFT: frozenset(
        {
            ExperimentRunStatus.DRAFT,
            ExperimentRunStatus.PLANNED,
            ExperimentRunStatus.READY,
            ExperimentRunStatus.CANCELLED,
        }
    ),
    ExperimentRunStatus.PLANNED: frozenset(
        {
            ExperimentRunStatus.DRAFT,
            ExperimentRunStatus.PLANNED,
            ExperimentRunStatus.READY,
            ExperimentRunStatus.CANCELLED,
        }
    ),
    ExperimentRunStatus.READY: frozenset(
        {
            ExperimentRunStatus.DRAFT,
            ExperimentRunStatus.PLANNED,
            ExperimentRunStatus.READY,
            ExperimentRunStatus.CANCELLED,
        }
    ),
    ExperimentRunStatus.IN_PROGRESS: frozenset(
        {
            ExperimentRunStatus.IN_PROGRESS,
            ExperimentRunStatus.PAUSED,
            ExperimentRunStatus.CANCELLED,
        }
    ),
    ExperimentRunStatus.PAUSED: frozenset(
        {
            ExperimentRunStatus.PAUSED,
            ExperimentRunStatus.IN_PROGRESS,
            ExperimentRunStatus.CANCELLED,
        }
    ),
    ExperimentRunStatus.COMPLETED: frozenset({ExperimentRunStatus.COMPLETED}),
    ExperimentRunStatus.CANCELLED: frozenset({ExperimentRunStatus.CANCELLED}),
    ExperimentRunStatus.ARCHIVED: frozenset({ExperimentRunStatus.ARCHIVED}),
}


def validate_run_transition(
    current: ExperimentRunStatus,
    target: ExperimentRunStatus,
) -> None:
    if target is ExperimentRunStatus.ARCHIVED:
        raise ExperimentRunLifecycleError("Use the archive operation to archive an Experiment.")
    if current is ExperimentRunStatus.ARCHIVED:
        raise ExperimentRunLifecycleError("Archived Experiments cannot be edited.")
    if target not in ALLOWED_RUN_TRANSITIONS[current]:
        raise ExperimentRunLifecycleError(
            f"Experiment cannot move from {current.value} to {target.value}."
        )


def validate_time_range(
    start: datetime | None,
    end: datetime | None,
    *,
    label: str,
) -> None:
    if start is not None and end is not None and end < start:
        raise ValueError(f"{label} end cannot be earlier than {label.lower()} start.")
