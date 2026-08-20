from uuid import UUID


class ExperimentRunNotFoundError(LookupError):
    code = "experiment_run_not_found"

    def __init__(self, run_id: UUID) -> None:
        super().__init__(f"Experiment {run_id} was not found.")


class ExperimentRunRevisionConflictError(RuntimeError):
    code = "experiment_run_revision_conflict"

    def __init__(self) -> None:
        super().__init__("This Experiment changed after it was loaded. Refresh it and try again.")


class ExperimentRunStateConflictError(RuntimeError):
    code = "experiment_run_state_conflict"

    def __init__(self, message: str) -> None:
        super().__init__(message)


class ExperimentRunProjectConflictError(RuntimeError):
    code = "experiment_run_project_conflict"

    def __init__(self, message: str) -> None:
        super().__init__(message)
