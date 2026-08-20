import pytest

from app.protocols.domain import (
    ProtocolStateError,
    ProtocolVersionStatus,
    require_editable_version,
)


def test_only_draft_protocol_versions_are_editable() -> None:
    require_editable_version(ProtocolVersionStatus.DRAFT)
    for status in (
        ProtocolVersionStatus.PUBLISHED,
        ProtocolVersionStatus.SUPERSEDED,
        ProtocolVersionStatus.RETIRED,
    ):
        with pytest.raises(ProtocolStateError, match="immutable"):
            require_editable_version(status)
