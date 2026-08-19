from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.protocols.errors import (
    ProtocolNotFoundError,
    ProtocolRevisionConflictError,
    ProtocolStateConflictError,
    ProtocolStepNotFoundError,
    ProtocolVersionNotFoundError,
    ProtocolVersionRevisionConflictError,
)
from app.protocols.schemas import (
    ProtocolCreate,
    ProtocolListResponse,
    ProtocolNewVersion,
    ProtocolResponse,
    ProtocolStepInput,
    ProtocolStepMove,
    ProtocolUpdate,
    ProtocolVersionPublish,
    ProtocolVersionResponse,
    ProtocolVersionUpdate,
)
from app.protocols.service import ProtocolService

router = APIRouter()
SessionDependency = Annotated[Session, Depends(get_db)]


def get_protocol_service(session: SessionDependency) -> ProtocolService:
    return ProtocolService(session)


ProtocolServiceDependency = Annotated[ProtocolService, Depends(get_protocol_service)]


PROTOCOL_ERRORS = (
    ProtocolNotFoundError,
    ProtocolRevisionConflictError,
    ProtocolStateConflictError,
    ProtocolStepNotFoundError,
    ProtocolVersionNotFoundError,
    ProtocolVersionRevisionConflictError,
)


def raise_protocol_http_error(error: Exception) -> NoReturn:
    if isinstance(
        error, (ProtocolNotFoundError, ProtocolVersionNotFoundError, ProtocolStepNotFoundError)
    ):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(
        error,
        (
            ProtocolRevisionConflictError,
            ProtocolVersionRevisionConflictError,
            ProtocolStateConflictError,
        ),
    ):
        status_code = status.HTTP_409_CONFLICT
    else:
        raise error
    raise HTTPException(
        status_code=status_code,
        detail={"code": error.code, "message": str(error)},
    ) from error


@router.post("/protocols", response_model=ProtocolResponse, status_code=status.HTTP_201_CREATED)
def create_protocol(
    payload: ProtocolCreate, service: ProtocolServiceDependency
) -> ProtocolResponse:
    try:
        protocol = service.create(payload)
    except ProtocolStateConflictError as error:
        raise_protocol_http_error(error)
    return ProtocolResponse.model_validate(protocol)


@router.get("/protocols", response_model=ProtocolListResponse)
def list_protocols(
    service: ProtocolServiceDependency,
    project_id: Annotated[UUID | None, Query()] = None,
    archived: Annotated[bool, Query()] = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ProtocolListResponse:
    protocols, total = service.list(
        project_id=project_id, archived=archived, limit=limit, offset=offset
    )
    return ProtocolListResponse(
        items=[ProtocolResponse.model_validate(protocol) for protocol in protocols],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/protocols/{protocol_id}", response_model=ProtocolResponse)
def get_protocol(protocol_id: UUID, service: ProtocolServiceDependency) -> ProtocolResponse:
    try:
        protocol = service.get(protocol_id)
    except ProtocolNotFoundError as error:
        raise_protocol_http_error(error)
    return ProtocolResponse.model_validate(protocol)


@router.patch("/protocols/{protocol_id}", response_model=ProtocolResponse)
def update_protocol(
    protocol_id: UUID, payload: ProtocolUpdate, service: ProtocolServiceDependency
) -> ProtocolResponse:
    try:
        protocol = service.update(protocol_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolResponse.model_validate(protocol)


@router.get("/protocol-versions/{version_id}", response_model=ProtocolVersionResponse)
def get_protocol_version(
    version_id: UUID, service: ProtocolServiceDependency
) -> ProtocolVersionResponse:
    try:
        version = service.get_version(version_id)
    except ProtocolVersionNotFoundError as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.patch("/protocol-versions/{version_id}", response_model=ProtocolVersionResponse)
def update_protocol_version(
    version_id: UUID,
    payload: ProtocolVersionUpdate,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.update_version(version_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.post("/protocol-versions/{version_id}/steps", response_model=ProtocolVersionResponse)
def add_protocol_step(
    version_id: UUID,
    payload: ProtocolStepInput,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.add_step(version_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.patch("/protocol-steps/{step_id}", response_model=ProtocolVersionResponse)
def update_protocol_step(
    step_id: UUID,
    payload: ProtocolStepInput,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.update_step(step_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.delete("/protocol-steps/{step_id}", response_model=ProtocolVersionResponse)
def remove_protocol_step(
    step_id: UUID,
    expected_version_revision: Annotated[int, Query(ge=1)],
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.remove_step(step_id, expected_version_revision)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.post("/protocol-steps/{step_id}/move", response_model=ProtocolVersionResponse)
def move_protocol_step(
    step_id: UUID,
    payload: ProtocolStepMove,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.move_step(step_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.post("/protocol-versions/{version_id}/publish", response_model=ProtocolVersionResponse)
def publish_protocol_version(
    version_id: UUID,
    payload: ProtocolVersionPublish,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.publish(version_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)


@router.post("/protocol-versions/{version_id}/new-version", response_model=ProtocolVersionResponse)
def create_new_protocol_version(
    version_id: UUID,
    payload: ProtocolNewVersion,
    service: ProtocolServiceDependency,
) -> ProtocolVersionResponse:
    try:
        version = service.create_new_version(version_id, payload)
    except PROTOCOL_ERRORS as error:
        raise_protocol_http_error(error)
    return ProtocolVersionResponse.model_validate(version)
