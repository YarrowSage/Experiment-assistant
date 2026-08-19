from datetime import UTC, datetime
from uuid import UUID

DEFAULT_WORKSPACE_ID = UUID("4b8f6a4d-6bd1-5e91-a028-8d1e282b6520")
DEFAULT_WORKSPACE_NAME = "Default Workspace"


def utc_now() -> datetime:
    return datetime.now(UTC)
