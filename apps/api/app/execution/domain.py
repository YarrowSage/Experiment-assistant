from enum import StrEnum


class RunStepStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"


class ExecutionStateError(ValueError):
    pass


def require_step_transition(current: RunStepStatus, target: RunStepStatus) -> None:
    allowed = {
        RunStepStatus.PENDING: frozenset({RunStepStatus.ACTIVE}),
        RunStepStatus.ACTIVE: frozenset({RunStepStatus.COMPLETED}),
        RunStepStatus.COMPLETED: frozenset(),
    }
    if target not in allowed[current]:
        raise ExecutionStateError(f"Run step cannot move from {current.value} to {target.value}.")
