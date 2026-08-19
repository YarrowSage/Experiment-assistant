from datetime import datetime
from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.experiment_runs.domain import ExperimentRunStatus
from app.experiment_runs.errors import (
    ExperimentRunNotFoundError,
    ExperimentRunProjectConflictError,
    ExperimentRunRevisionConflictError,
    ExperimentRunStateConflictError,
)
from app.experiment_runs.schemas import (
    ExperimentRunArchive,
    ExperimentRunCreate,
    ExperimentRunListResponse,
    ExperimentRunResponse,
    ExperimentRunUpdate,
)
from app.experiment_runs.service import ExperimentRunService

router = APIRouter(prefix="/experiment-runs")
SessionDependency = Annotated[Session, Depends(get_db)]


def get_experiment_run_service(session: SessionDependency) -> ExperimentRunService:
    return ExperimentRunService(session)


ExperimentRunServiceDependency = Annotated[
    ExperimentRunService, Depends(get_experiment_run_service)
]


def raise_experiment_run_http_error(error: Exception) -> NoReturn:
    if isinstance(error, ExperimentRunNotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(
        error,
        (
            ExperimentRunProjectConflictError,
            ExperimentRunRevisionConflictError,
            ExperimentRunStateConflictError,
        ),
    ):
        status_code = status.HTTP_409_CONFLICT
    else:
        raise error
    raise HTTPException(
        status_code=status_code,
        detail={"code": error.code, "message": str(error)},
    ) from error


@router.post("", response_model=ExperimentRunResponse, status_code=status.HTTP_201_CREATED)
def create_experiment_run(
    payload: ExperimentRunCreate,
    service: ExperimentRunServiceDependency,
) -> ExperimentRunResponse:
    try:
        run = service.create(payload)
    except (ExperimentRunProjectConflictError, ExperimentRunStateConflictError) as error:
        raise_experiment_run_http_error(error)
    return ExperimentRunResponse.model_validate(run)


@router.get("", response_model=ExperimentRunListResponse)
def list_experiment_runs(
    service: ExperimentRunServiceDependency,
    project_id: Annotated[UUID | None, Query()] = None,
    run_status: Annotated[ExperimentRunStatus | None, Query(alias="status")] = None,
    archived: Annotated[bool, Query()] = False,
    search: Annotated[str | None, Query(max_length=200)] = None,
    planned_from: Annotated[datetime | None, Query()] = None,
    planned_to: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExperimentRunListResponse:
    runs, total = service.list(
        project_id=project_id,
        status=run_status,
        archived=archived,
        search=search,
        planned_from=planned_from,
        planned_to=planned_to,
        limit=limit,
        offset=offset,
    )
    return ExperimentRunListResponse(
        items=[ExperimentRunResponse.model_validate(run) for run in runs],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{run_id}", response_model=ExperimentRunResponse)
def get_experiment_run(
    run_id: UUID,
    service: ExperimentRunServiceDependency,
) -> ExperimentRunResponse:
    try:
        run = service.get(run_id)
    except ExperimentRunNotFoundError as error:
        raise_experiment_run_http_error(error)
    return ExperimentRunResponse.model_validate(run)


@router.patch("/{run_id}", response_model=ExperimentRunResponse)
def update_experiment_run(
    run_id: UUID,
    payload: ExperimentRunUpdate,
    service: ExperimentRunServiceDependency,
) -> ExperimentRunResponse:
    try:
        run = service.update(run_id, payload)
    except (
        ExperimentRunNotFoundError,
        ExperimentRunRevisionConflictError,
        ExperimentRunStateConflictError,
    ) as error:
        raise_experiment_run_http_error(error)
    return ExperimentRunResponse.model_validate(run)


@router.post("/{run_id}/archive", response_model=ExperimentRunResponse)
def archive_experiment_run(
    run_id: UUID,
    payload: ExperimentRunArchive,
    service: ExperimentRunServiceDependency,
) -> ExperimentRunResponse:
    try:
        run = service.archive(run_id, payload)
    except (
        ExperimentRunNotFoundError,
        ExperimentRunRevisionConflictError,
        ExperimentRunStateConflictError,
    ) as error:
        raise_experiment_run_http_error(error)
    return ExperimentRunResponse.model_validate(run)
