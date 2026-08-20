from collections.abc import AsyncIterable, Iterator
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import BinaryIO, Protocol


class FileStorageError(RuntimeError):
    pass


class FileTooLargeError(FileStorageError):
    pass


@dataclass(frozen=True)
class StoredFile:
    size_bytes: int
    checksum_sha256: str


class FileStorage(Protocol):
    provider_key: str

    async def put(self, storage_key: str, chunks: AsyncIterable[bytes]) -> StoredFile: ...

    def open(self, storage_key: str) -> BinaryIO: ...

    def exists(self, storage_key: str) -> bool: ...

    def delete(self, storage_key: str) -> None: ...

    def create_download_reference(self, storage_key: str) -> str: ...


class LocalFileStorage:
    provider_key = "local"

    def __init__(self, root: Path, *, max_bytes: int) -> None:
        self.root = root.expanduser().resolve()
        self.max_bytes = max_bytes

    async def put(self, storage_key: str, chunks: AsyncIterable[bytes]) -> StoredFile:
        target = self._path_for(storage_key)
        target.parent.mkdir(parents=True, exist_ok=True)
        digest = sha256()
        size = 0
        try:
            with target.open("xb") as destination:
                async for chunk in chunks:
                    size += len(chunk)
                    if size > self.max_bytes:
                        raise FileTooLargeError(
                            f"File exceeds the {self.max_bytes}-byte upload limit."
                        )
                    digest.update(chunk)
                    destination.write(chunk)
        except Exception:
            if target.exists():
                target.unlink()
            raise
        return StoredFile(size_bytes=size, checksum_sha256=digest.hexdigest())

    def open(self, storage_key: str) -> BinaryIO:
        return self._path_for(storage_key).open("rb")

    def exists(self, storage_key: str) -> bool:
        return self._path_for(storage_key).is_file()

    def delete(self, storage_key: str) -> None:
        target = self._path_for(storage_key)
        if target.exists():
            target.unlink()

    def create_download_reference(self, storage_key: str) -> str:
        if not self.exists(storage_key):
            raise FileStorageError("Stored file is unavailable.")
        return storage_key

    def _path_for(self, storage_key: str) -> Path:
        if not storage_key or "\\" in storage_key:
            raise FileStorageError("Storage key is invalid.")
        target = (self.root / storage_key).resolve()
        try:
            target.relative_to(self.root)
        except ValueError as error:
            raise FileStorageError("Storage key escaped the configured storage root.") from error
        return target


def iter_file(file_object: BinaryIO, chunk_size: int = 64 * 1024) -> Iterator[bytes]:
    try:
        while chunk := file_object.read(chunk_size):
            yield chunk
    finally:
        file_object.close()
