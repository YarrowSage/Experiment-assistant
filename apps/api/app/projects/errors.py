from uuid import UUID


class ProjectNotFoundError(LookupError):
    code = "project_not_found"

    def __init__(self, project_id: UUID) -> None:
        super().__init__(f"Project {project_id} was not found.")


class ProjectRevisionConflictError(RuntimeError):
    code = "project_revision_conflict"

    def __init__(self) -> None:
        super().__init__("This project changed after it was loaded. Refresh it and try again.")


class ProjectStateConflictError(RuntimeError):
    code = "project_state_conflict"

    def __init__(self, message: str) -> None:
        super().__init__(message)
