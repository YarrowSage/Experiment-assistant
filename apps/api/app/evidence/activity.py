from uuid import UUID

from sqlalchemy.orm import Session

from app.evidence.domain import ActivityType
from app.evidence.models import ActivityEvent
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ActivityRecorder:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id

    def record(
        self,
        event_type: ActivityType,
        message: str,
        *,
        project_id: UUID | None = None,
        protocol_id: UUID | None = None,
        experiment_run_id: UUID | None = None,
        run_step_record_id: UUID | None = None,
        note_id: UUID | None = None,
        attachment_id: UUID | None = None,
    ) -> ActivityEvent:
        event = ActivityEvent(
            workspace_id=self.workspace_id,
            project_id=project_id,
            protocol_id=protocol_id,
            experiment_run_id=experiment_run_id,
            run_step_record_id=run_step_record_id,
            note_id=note_id,
            attachment_id=attachment_id,
            event_type=event_type.value,
            message=message,
            actor_id=None,
            created_at=utc_now(),
        )
        self.session.add(event)
        return event
