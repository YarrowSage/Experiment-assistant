from uuid import UUID


class ProtocolNotFoundError(LookupError):
    code = "protocol_not_found"

    def __init__(self, protocol_id: UUID) -> None:
        super().__init__(f"Protocol {protocol_id} was not found.")


class ProtocolVersionNotFoundError(LookupError):
    code = "protocol_version_not_found"

    def __init__(self, version_id: UUID) -> None:
        super().__init__(f"Protocol Version {version_id} was not found.")


class ProtocolStepNotFoundError(LookupError):
    code = "protocol_step_not_found"

    def __init__(self, step_id: UUID) -> None:
        super().__init__(f"Protocol Step {step_id} was not found.")


class ProtocolRevisionConflictError(RuntimeError):
    code = "protocol_revision_conflict"

    def __init__(self) -> None:
        super().__init__("This Protocol changed after it was loaded. Refresh it and try again.")


class ProtocolVersionRevisionConflictError(RuntimeError):
    code = "protocol_version_revision_conflict"

    def __init__(self) -> None:
        super().__init__(
            "This Protocol Version changed after it was loaded. Refresh it and try again."
        )


class ProtocolStateConflictError(RuntimeError):
    code = "protocol_state_conflict"

    def __init__(self, message: str) -> None:
        super().__init__(message)
