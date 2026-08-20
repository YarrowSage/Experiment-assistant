import asyncio
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

from app.evidence.storage import FileStorageError, FileTooLargeError, LocalFileStorage


async def chunks(*values: bytes) -> AsyncIterator[bytes]:
    for value in values:
        yield value


def test_local_file_storage_contract_and_checksum(tmp_path: Path) -> None:
    storage = LocalFileStorage(tmp_path / "runtime", max_bytes=1024)
    stored = asyncio.run(storage.put("attachments/item/content", chunks(b"alpha", b"beta")))
    assert stored.size_bytes == 9
    assert stored.checksum_sha256 == (
        "a4c4aeb92c20500f364b12b3771ef3a11193e2cf04d0f28956a829749993b39f"
    )
    assert storage.exists("attachments/item/content")
    assert storage.create_download_reference("attachments/item/content") == (
        "attachments/item/content"
    )
    with storage.open("attachments/item/content") as source:
        assert source.read() == b"alphabeta"
    storage.delete("attachments/item/content")
    assert not storage.exists("attachments/item/content")


def test_local_file_storage_rejects_escape_and_removes_oversized_partial(tmp_path: Path) -> None:
    storage = LocalFileStorage(tmp_path / "runtime", max_bytes=4)
    with pytest.raises(FileStorageError, match="escaped"):
        storage.exists("../outside")
    with pytest.raises(FileTooLargeError):
        asyncio.run(storage.put("attachments/large/content", chunks(b"12345")))
    assert not storage.exists("attachments/large/content")
