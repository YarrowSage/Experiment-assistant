from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.execution.domain import RunStepStatus
from app.experiment_runs.schemas import ExperimentRunResponse
from app.protocols.domain import ProtocolTimerMode


class RunExecutionAction(BaseModel):
    expected_run_revision: int = Field(ge=1)


class RunStepAction(RunExecutionAction):
    expected_step_revision: int = Field(ge=1)


class RunSubStepRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source_protocol_substep_id: UUID
    position: int
    title_snapshot: str
    instruction_snapshot: str


class RunStepRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    experiment_run_id: UUID
    source_protocol_version_id: UUID
    source_protocol_step_id: UUID
    source_stable_key: UUID
    position: int
    title_snapshot: str
    instruction_snapshot: str
    planned_duration_seconds_snapshot: int | None
    timer_mode_snapshot: ProtocolTimerMode
    required_snapshot: bool
    precautions_snapshot: str | None
    status: RunStepStatus
    actual_start_at: datetime | None
    actual_end_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None
    created_at: datetime
    updated_at: datetime
    revision: int
    substeps: list[RunSubStepRecordResponse]


class RunExecutionResponse(BaseModel):
    run: ExperimentRunResponse
    steps: list[RunStepRecordResponse]
