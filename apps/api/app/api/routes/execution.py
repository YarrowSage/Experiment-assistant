from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.execution.errors import (
    ExecutionRevisionConflictError,
    ExecutionStateConflictError,
    RunStepNotFoundError,
)
from app.execution.schemas import (
    RunExecutionAction,
    RunExecutionResponse,
    RunStepAction,
    RunStepRecordResponse,
)
from app.execution.service import ExecutionService
from app.experiment_runs.errors import ExperimentRunNotFoundError
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.schemas import ExperimentRunResponse
from app.protocols.errors import ProtocolVersionNotFoundError

router = APIRouter()
SessionDependency = Annotated[Session, Depends(get_db)]


def get_execution_service(session: SessionDependency) -> ExecutionService:
    return ExecutionService(session)


ExecutionServiceDependency = Annotated[ExecutionService, Depends(get_execution_service)]
EXECUTION_ERRORS = (
    ExperimentRunNotFoundError,
    ProtocolVersionNotFoundError,
    RunStepNotFoundError,
    ExecutionRevisionConflictError,
    ExecutionStateConflictError,
)


def raise_execution_http_error(error: Exception) -> NoReturn:
    status_code = (
        status.HTTP_404_NOT_FOUND
        if isinstance(
            error, (ExperimentRunNotFoundError, ProtocolVersionNotFoundError, RunStepNotFoundError)
        )
        else status.HTTP_409_CONFLICT
    )
    raise HTTPException(
        status_code=status_code,
        detail={"code": getattr(error, "code", "execution_error"), "message": str(error)},
    ) from error


def response_for(run: ExperimentRun) -> RunExecutionResponse:
    return RunExecutionResponse(
        run=ExperimentRunResponse.model_validate(run),
        steps=[RunStepRecordResponse.model_validate(step) for step in run.run_steps],
    )


@router.get("/experiment-runs/{run_id}/execution", response_model=RunExecutionResponse)
def get_run_execution(run_id: UUID, service: ExecutionServiceDependency) -> RunExecutionResponse:
    try:
        run = service.get(run_id)
    except ExperimentRunNotFoundError as error:
        raise_execution_http_error(error)
    return response_for(run)


@router.post("/experiment-runs/{run_id}/execution/start", response_model=RunExecutionResponse)
def start_run_execution(
    run_id: UUID, payload: RunExecutionAction, service: ExecutionServiceDependency
) -> RunExecutionResponse:
    try:
        run = service.start(run_id, payload)
    except EXECUTION_ERRORS as error:
        raise_execution_http_error(error)
    return response_for(run)


@router.post("/experiment-runs/{run_id}/execution/pause", response_model=RunExecutionResponse)
def pause_run_execution(
    run_id: UUID, payload: RunExecutionAction, service: ExecutionServiceDependency
) -> RunExecutionResponse:
    try:
        run = service.pause(run_id, payload)
    except EXECUTION_ERRORS as error:
        raise_execution_http_error(error)
    return response_for(run)


@router.post("/experiment-runs/{run_id}/execution/resume", response_model=RunExecutionResponse)
def resume_run_execution(
    run_id: UUID, payload: RunExecutionAction, service: ExecutionServiceDependency
) -> RunExecutionResponse:
    try:
        run = service.resume(run_id, payload)
    except EXECUTION_ERRORS as error:
        raise_execution_http_error(error)
    return response_for(run)


@router.post("/run-steps/{step_id}/start", response_model=RunExecutionResponse)
def start_run_step(
    step_id: UUID, payload: RunStepAction, service: ExecutionServiceDependency
) -> RunExecutionResponse:
    try:
        run = service.start_step(step_id, payload)
    except EXECUTION_ERRORS as error:
        raise_execution_http_error(error)
    return response_for(run)


@router.post("/run-steps/{step_id}/complete", response_model=RunExecutionResponse)
def complete_run_step(
    step_id: UUID, payload: RunStepAction, service: ExecutionServiceDependency
) -> RunExecutionResponse:
    try:
        run = service.complete_step(step_id, payload)
    except EXECUTION_ERRORS as error:
        raise_execution_http_error(error)
    return response_for(run)
