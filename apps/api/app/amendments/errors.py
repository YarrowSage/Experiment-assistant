from uuid import UUID


class AmendmentNotFoundError(LookupError):
    code = "amendment_not_found"

    def __init__(self, amendment_id: UUID) -> None:
        super().__init__(f"Amendment {amendment_id} was not found.")


class CompletionStateConflictError(RuntimeError):
    code = "completion_state_conflict"


class RequiredStepsIncompleteError(RuntimeError):
    code = "required_steps_incomplete"

    def __init__(self, count: int) -> None:
        self.count = count
        super().__init__(
            f"{count} required step(s) remain incomplete. Review them and explicitly acknowledge "
            "the incomplete required work before completing the Experiment."
        )


class CompletedRecordProtectedError(RuntimeError):
    code = "completed_record_protected"

    def __init__(self) -> None:
        super().__init__(
            "Completed scientific records cannot be overwritten through normal edit. "
            "Create an Amendment with the original value and correction reason."
        )


class AmendmentRevisionConflictError(RuntimeError):
    code = "amendment_revision_conflict"

    def __init__(self) -> None:
        super().__init__("The target record changed since it was loaded. Refresh and try again.")


class AmendmentValidationError(ValueError):
    code = "amendment_validation_error"
