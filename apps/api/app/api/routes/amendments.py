from typing import Annotated, NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.amendments.errors import (
    AmendmentRevisionConflictError,
    AmendmentValidationError,
    CompletionStateConflictError,
    RequiredStepsIncompleteError,
)
from app.amendments.schemas import (
    AmendmentCreate,
    AmendmentResponse,
    AmendmentResult,
    ExperimentComplete,
)
from app.amendments.service import AmendmentService
from app.core.database import get_db
from app.evidence.schemas import ActivityEventResponse
from app.execution.errors import RunStepNotFoundError
from app.execution.schemas import RunExecutionResponse, RunStepRecordResponse
from app.experiment_runs.errors import ExperimentRunNotFoundError
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.schemas import ExperimentRunResponse

router = APIRouter()
SessionDependency = Annotated[Session, Depends(get_db)]


def get_amendment_service(session: SessionDependency) -> AmendmentService:
    return AmendmentService(session)


AmendmentServiceDependency = Annotated[AmendmentService, Depends(get_amendment_service)]
AMENDMENT_ERRORS = (
    ExperimentRunNotFoundError,
    RunStepNotFoundError,
    AmendmentRevisionConflictError,
    AmendmentValidationError,
    CompletionStateConflictError,
    RequiredStepsIncompleteError,
)


def raise_amendment_http_error(error: Exception) -> NoReturn:
    if isinstance(error, (ExperimentRunNotFoundError, RunStepNotFoundError)):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, AmendmentValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    else:
        status_code = status.HTTP_409_CONFLICT
    raise HTTPException(
        status_code=status_code,
        detail={"code": getattr(error, "code", "amendment_error"), "message": str(error)},
    ) from error


def execution_response(run: ExperimentRun) -> RunExecutionResponse:
    return RunExecutionResponse(
        run=ExperimentRunResponse.model_validate(run),
        steps=[RunStepRecordResponse.model_validate(step) for step in run.run_steps],
    )


@router.post("/experiment-runs/{run_id}/complete", response_model=RunExecutionResponse)
def complete_experiment(
    run_id: UUID,
    payload: ExperimentComplete,
    service: AmendmentServiceDependency,
) -> RunExecutionResponse:
    try:
        return execution_response(service.complete(run_id, payload))
    except AMENDMENT_ERRORS as error:
        raise_amendment_http_error(error)


@router.get("/experiment-runs/{run_id}/amendments", response_model=list[AmendmentResponse])
def list_amendments(run_id: UUID, service: AmendmentServiceDependency) -> list[AmendmentResponse]:
    try:
        return [
            AmendmentResponse.model_validate(amendment)
            for amendment in service.list_for_run(run_id)
        ]
    except AMENDMENT_ERRORS as error:
        raise_amendment_http_error(error)


@router.post(
    "/experiment-runs/{run_id}/amendments",
    response_model=AmendmentResult,
    status_code=status.HTTP_201_CREATED,
)
def create_amendment(
    run_id: UUID,
    payload: AmendmentCreate,
    service: AmendmentServiceDependency,
) -> AmendmentResult:
    try:
        amendment, run, event = service.amend(run_id, payload)
        return AmendmentResult(
            amendment=AmendmentResponse.model_validate(amendment),
            execution=execution_response(run),
            activity=ActivityEventResponse.model_validate(event),
        )
    except AMENDMENT_ERRORS as error:
        raise_amendment_http_error(error)
