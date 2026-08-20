from uuid import UUID


class RunStepNotFoundError(LookupError):
    code = "run_step_not_found"

    def __init__(self, step_id: UUID) -> None:
        super().__init__(f"Run step {step_id} was not found.")


class ExecutionStateConflictError(RuntimeError):
    code = "execution_state_conflict"


class ExecutionRevisionConflictError(RuntimeError):
    code = "execution_revision_conflict"

    def __init__(self) -> None:
        super().__init__("Execution changed since it was loaded. Refresh and try again.")
