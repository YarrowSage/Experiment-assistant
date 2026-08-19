from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.projects.domain import ProjectStatus
from app.projects.errors import (
    ProjectNotFoundError,
    ProjectRevisionConflictError,
    ProjectStateConflictError,
)
from app.projects.schemas import (
    ProjectArchive,
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.projects.service import ProjectService

router = APIRouter(prefix="/projects")
SessionDependency = Annotated[Session, Depends(get_db)]


def get_project_service(session: SessionDependency) -> ProjectService:
    return ProjectService(session)


ProjectServiceDependency = Annotated[ProjectService, Depends(get_project_service)]


def raise_project_http_error(error: Exception) -> NoReturn:
    if isinstance(error, ProjectNotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, (ProjectRevisionConflictError, ProjectStateConflictError)):
        status_code = status.HTTP_409_CONFLICT
    else:
        raise error

    raise HTTPException(
        status_code=status_code,
        detail={"code": error.code, "message": str(error)},
    ) from error


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, service: ProjectServiceDependency) -> ProjectResponse:
    project = service.create(payload)
    return ProjectResponse.model_validate(project)


@router.get("", response_model=ProjectListResponse)
def list_projects(
    service: ProjectServiceDependency,
    project_status: Annotated[ProjectStatus | None, Query(alias="status")] = None,
    archived: Annotated[bool, Query()] = False,
    search: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ProjectListResponse:
    projects, total = service.list(
        status=project_status,
        archived=archived,
        search=search,
        limit=limit,
        offset=offset,
    )
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(project) for project in projects],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: UUID, service: ProjectServiceDependency) -> ProjectResponse:
    try:
        project = service.get(project_id)
    except ProjectNotFoundError as error:
        raise_project_http_error(error)
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    service: ProjectServiceDependency,
) -> ProjectResponse:
    try:
        project = service.update(project_id, payload)
    except (
        ProjectNotFoundError,
        ProjectRevisionConflictError,
        ProjectStateConflictError,
    ) as error:
        raise_project_http_error(error)
    return ProjectResponse.model_validate(project)


@router.post("/{project_id}/archive", response_model=ProjectResponse)
def archive_project(
    project_id: UUID,
    payload: ProjectArchive,
    service: ProjectServiceDependency,
) -> ProjectResponse:
    try:
        project = service.archive(project_id, payload)
    except (
        ProjectNotFoundError,
        ProjectRevisionConflictError,
        ProjectStateConflictError,
    ) as error:
        raise_project_http_error(error)
    return ProjectResponse.model_validate(project)
