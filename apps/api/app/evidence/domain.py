from enum import StrEnum

NOTE_MAX_LENGTH = 20_000
FILE_NAME_MAX_LENGTH = 255


class AttachmentState(StrEnum):
    PENDING = "pending"
    AVAILABLE = "available"
    FAILED = "failed"
    QUARANTINED = "quarantined"
    DELETED = "deleted"


class ActivityType(StrEnum):
    PROJECT_CREATED = "PROJECT_CREATED"
    EXPERIMENT_CREATED = "EXPERIMENT_CREATED"
    PROTOCOL_CREATED = "PROTOCOL_CREATED"
    PROTOCOL_VERSION_PUBLISHED = "PROTOCOL_VERSION_PUBLISHED"
    RUN_STARTED = "RUN_STARTED"
    RUN_PAUSED = "RUN_PAUSED"
    RUN_RESUMED = "RUN_RESUMED"
    STEP_STARTED = "STEP_STARTED"
    STEP_COMPLETED = "STEP_COMPLETED"
    NOTE_ADDED = "NOTE_ADDED"
    NOTE_UPDATED = "NOTE_UPDATED"
    ATTACHMENT_ADDED = "ATTACHMENT_ADDED"
    RUN_COMPLETED = "RUN_COMPLETED"
    AMENDMENT_CREATED = "AMENDMENT_CREATED"


def normalize_filename(value: str) -> str:
    normalized = value.replace("\\", "/").split("/")[-1].strip()
    normalized = "".join(character for character in normalized if character.isprintable())
    if not normalized:
        raise ValueError("File name is required.")
    if len(normalized) > FILE_NAME_MAX_LENGTH:
        raise ValueError(f"File name must be {FILE_NAME_MAX_LENGTH} characters or fewer.")
    return normalized
