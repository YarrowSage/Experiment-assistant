from uuid import UUID


class EvidenceContextNotFoundError(LookupError):
    code = "evidence_context_not_found"

    def __init__(self) -> None:
        super().__init__("The Experiment or Run Step context was not found.")


class NoteNotFoundError(LookupError):
    code = "note_not_found"

    def __init__(self, note_id: UUID) -> None:
        super().__init__(f"Note {note_id} was not found.")


class AttachmentNotFoundError(LookupError):
    code = "attachment_not_found"

    def __init__(self, attachment_id: UUID) -> None:
        super().__init__(f"Attachment {attachment_id} was not found.")


class EvidenceRevisionConflictError(RuntimeError):
    code = "evidence_revision_conflict"

    def __init__(self) -> None:
        super().__init__("This record changed since it was loaded. Refresh and try again.")


class AttachmentStorageError(RuntimeError):
    code = "attachment_storage_error"
