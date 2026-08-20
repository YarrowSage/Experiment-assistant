from enum import StrEnum

PROTOCOL_TITLE_MAX_LENGTH = 200
PROTOCOL_TEXT_MAX_LENGTH = 10_000
PROTOCOL_STEP_TITLE_MAX_LENGTH = 200


class ProtocolStatus(StrEnum):
    ACTIVE = "active"
    RETIRED = "retired"
    ARCHIVED = "archived"


class ProtocolVersionStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


class ProtocolTimerMode(StrEnum):
    NONE = "none"
    COUNT_UP = "count_up"
    COUNTDOWN = "countdown"


class ProtocolStateError(ValueError):
    pass


def require_editable_version(status: ProtocolVersionStatus) -> None:
    if status is not ProtocolVersionStatus.DRAFT:
        raise ProtocolStateError(
            "Published, superseded, and retired Protocol Versions are immutable. "
            "Create a new Draft Version to change instructions."
        )
