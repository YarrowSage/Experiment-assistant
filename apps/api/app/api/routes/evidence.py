from datetime import datetime
from typing import Annotated, NoReturn, cast
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.evidence.errors import (
    AttachmentNotFoundError,
    AttachmentStorageError,
    EvidenceContextNotFoundError,
    EvidenceRevisionConflictError,
    NoteNotFoundError,
)
from app.evidence.schemas import (
    ActivityEventResponse,
    AttachmentResponse,
    AttachmentUploadMetadata,
    EvidenceBundleResponse,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
)
from app.evidence.service import EvidenceService
from app.evidence.storage import FileStorage, iter_file

router = APIRouter()
SessionDependency = Annotated[Session, Depends(get_db)]


def get_file_storage(request: Request) -> FileStorage:
    return cast(FileStorage, request.app.state.file_storage)


StorageDependency = Annotated[FileStorage, Depends(get_file_storage)]


def get_evidence_service(session: SessionDependency, storage: StorageDependency) -> EvidenceService:
    return EvidenceService(session, storage)


EvidenceServiceDependency = Annotated[EvidenceService, Depends(get_evidence_service)]
EVIDENCE_ERRORS = (
    EvidenceContextNotFoundError,
    NoteNotFoundError,
    AttachmentNotFoundError,
    EvidenceRevisionConflictError,
    AttachmentStorageError,
)


def raise_evidence_http_error(error: Exception) -> NoReturn:
    if isinstance(
        error, (EvidenceContextNotFoundError, NoteNotFoundError, AttachmentNotFoundError)
    ):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, EvidenceRevisionConflictError):
        status_code = status.HTTP_409_CONFLICT
    else:
        status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    raise HTTPException(
        status_code=status_code,
        detail={"code": getattr(error, "code", "evidence_error"), "message": str(error)},
    ) from error


@router.get("/experiment-runs/{run_id}/evidence", response_model=EvidenceBundleResponse)
def get_evidence_bundle(run_id: UUID, service: EvidenceServiceDependency) -> EvidenceBundleResponse:
    try:
        return service.bundle(run_id)
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.get("/experiment-runs/{run_id}/notes", response_model=list[NoteResponse])
def list_notes(
    run_id: UUID,
    service: EvidenceServiceDependency,
    run_step_id: Annotated[UUID | None, Query()] = None,
) -> list[NoteResponse]:
    try:
        return [
            NoteResponse.model_validate(note) for note in service.list_notes(run_id, run_step_id)
        ]
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.post(
    "/experiment-runs/{run_id}/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_note(
    run_id: UUID, payload: NoteCreate, service: EvidenceServiceDependency
) -> NoteResponse:
    try:
        return NoteResponse.model_validate(service.create_note(run_id, payload))
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.patch("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: UUID, payload: NoteUpdate, service: EvidenceServiceDependency
) -> NoteResponse:
    try:
        return NoteResponse.model_validate(service.update_note(note_id, payload))
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.get("/experiment-runs/{run_id}/attachments", response_model=list[AttachmentResponse])
def list_attachments(
    run_id: UUID,
    service: EvidenceServiceDependency,
    run_step_id: Annotated[UUID | None, Query()] = None,
) -> list[AttachmentResponse]:
    try:
        return [
            service.attachment_response(attachment, run_id, step_id)
            for attachment, step_id in service.list_attachments(run_id, run_step_id)
        ]
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.post(
    "/experiment-runs/{run_id}/attachments",
    response_model=AttachmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_attachment(
    request: Request,
    run_id: UUID,
    service: EvidenceServiceDependency,
    filename: Annotated[str, Query(min_length=1, max_length=1024)],
    run_step_id: Annotated[UUID | None, Query()] = None,
    description: Annotated[str | None, Query(max_length=10_000)] = None,
    captured_at: Annotated[datetime | None, Query()] = None,
) -> AttachmentResponse:
    try:
        metadata = AttachmentUploadMetadata(
            filename=filename,
            run_step_record_id=run_step_id,
            description=description,
            captured_at=captured_at,
        )
    except ValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=error.errors(include_url=False, include_context=False),
        ) from error
    try:
        attachment, step_id = await service.upload_attachment(
            run_id,
            metadata,
            request.headers.get("content-type", "application/octet-stream"),
            request.stream(),
        )
        return service.attachment_response(attachment, run_id, step_id)
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)


@router.get("/attachments/{attachment_id}/content")
def download_attachment(
    attachment_id: UUID,
    service: EvidenceServiceDependency,
    storage: StorageDependency,
) -> StreamingResponse:
    try:
        attachment = service.get_attachment(attachment_id)
        storage.create_download_reference(attachment.storage_key)
        source = storage.open(attachment.storage_key)
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)
    encoded_name = quote(attachment.original_filename, safe="")
    return StreamingResponse(
        iter_file(source),
        media_type=attachment.media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
            "Content-Length": str(attachment.size_bytes),
        },
    )


@router.get("/experiment-runs/{run_id}/activity", response_model=list[ActivityEventResponse])
def list_activity(run_id: UUID, service: EvidenceServiceDependency) -> list[ActivityEventResponse]:
    try:
        return service.list_activity(run_id)
    except EVIDENCE_ERRORS as error:
        raise_evidence_http_error(error)
