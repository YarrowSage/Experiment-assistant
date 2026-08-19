import pytest

from app.execution.domain import ExecutionStateError, RunStepStatus, require_step_transition


def test_run_step_transitions_are_explicit_and_terminal() -> None:
    require_step_transition(RunStepStatus.PENDING, RunStepStatus.ACTIVE)
    require_step_transition(RunStepStatus.ACTIVE, RunStepStatus.COMPLETED)
    with pytest.raises(ExecutionStateError, match="completed"):
        require_step_transition(RunStepStatus.COMPLETED, RunStepStatus.ACTIVE)
