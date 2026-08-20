"""Import domain models so Alembic can discover shared metadata."""

from app.amendments.models import Amendment
from app.evidence.models import (
    ActivityEvent,
    ExperimentRunAttachment,
    FileAttachment,
    Note,
    RunStepAttachment,
)
from app.execution.models import RunStepRecord, RunSubStepRecord
from app.experiment_runs.models import ExperimentRun
from app.projects.models import Project
from app.protocols.models import Protocol, ProtocolStep, ProtocolSubStep, ProtocolVersion
from app.workspaces.models import Workspace

__all__ = [
    "Amendment",
    "ExperimentRun",
    "ExperimentRunAttachment",
    "FileAttachment",
    "Note",
    "Project",
    "Protocol",
    "ProtocolStep",
    "ProtocolSubStep",
    "ProtocolVersion",
    "RunStepRecord",
    "RunStepAttachment",
    "RunSubStepRecord",
    "ActivityEvent",
    "Workspace",
]
