from collections.abc import AsyncIterable
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.amendments.errors import CompletedRecordProtectedError
from app.evidence.activity import ActivityRecorder
from app.evidence.domain import ActivityType, AttachmentState
from app.evidence.errors import (
    AttachmentNotFoundError,
    AttachmentStorageError,
    EvidenceContextNotFoundError,
    EvidenceRevisionConflictError,
    NoteNotFoundError,
)
from app.evidence.models import (
    ExperimentRunAttachment,
    FileAttachment,
    Note,
    RunStepAttachment,
)
from app.evidence.repository import EvidenceRepository
from app.evidence.schemas import (
    ActivityEventResponse,
    AttachmentResponse,
    AttachmentUploadMetadata,
    EvidenceBundleResponse,
    NoteCreate,
    NoteResponse,
    NoteUpdate,
)
from app.evidence.storage import FileStorage, FileStorageError, FileTooLargeError
from app.execution.repository import ExecutionRepository
from app.experiment_runs.domain import is_completed_record
from app.experiment_runs.models import ExperimentRun
from app.experiment_runs.repository import ExperimentRunRepository
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class EvidenceService:
    def __init__(
        self,
        session: Session,
        storage: FileStorage,
        workspace_id: UUID = DEFAULT_WORKSPACE_ID,
    ) -> None:
        self.session = session
        self.storage = storage
        self.workspace_id = workspace_id
        self.repository = EvidenceRepository(session)
        self.runs = ExperimentRunRepository(session)
        self.execution = ExecutionRepository(session)
        self.activity = ActivityRecorder(session, workspace_id)

    def list_notes(self, run_id: UUID, run_step_id: UUID | None) -> list[Note]:
        self._require_context(run_id, run_step_id)
        return self.repository.list_notes(self.workspace_id, run_id, run_step_id)

    def create_note(self, run_id: UUID, payload: NoteCreate) -> Note:
        run = self._require_context(run_id, payload.run_step_record_id)
        self._require_mutable_record(run)
        now = utc_now()
        note = Note(
            experiment_run_id=run.id,
            run_step_record_id=payload.run_step_record_id,
            content=payload.content,
            created_by=None,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        self.repository.add(note)
        self.activity.record(
            ActivityType.NOTE_ADDED,
            "Note added to execution record.",
            project_id=run.project_id,
            experiment_run_id=run.id,
            run_step_record_id=payload.run_step_record_id,
            note_id=note.id,
        )
        self.session.commit()
        return note

    def update_note(self, note_id: UUID, payload: NoteUpdate) -> Note:
        current = self.repository.get_note(self.workspace_id, note_id)
        if current is None:
            raise NoteNotFoundError(note_id)
        if current.revision != payload.expected_revision:
            raise EvidenceRevisionConflictError
        run = self.runs.get(self.workspace_id, current.experiment_run_id)
        if run is None:
            raise EvidenceContextNotFoundError
        self._require_mutable_record(run)
        updated = self.repository.compare_and_swap_note(
            self.workspace_id, note_id, payload.expected_revision, payload.content or ""
        )
        if updated is None:
            self.session.rollback()
            raise EvidenceRevisionConflictError
        self.activity.record(
            ActivityType.NOTE_UPDATED,
            "Execution note updated.",
            project_id=run.project_id,
            experiment_run_id=run.id,
            run_step_record_id=updated.run_step_record_id,
            note_id=updated.id,
        )
        self.session.commit()
        return updated

    async def upload_attachment(
        self,
        run_id: UUID,
        metadata: AttachmentUploadMetadata,
        media_type: str,
        chunks: AsyncIterable[bytes],
    ) -> tuple[FileAttachment, UUID | None]:
        run = self._require_context(run_id, metadata.run_step_record_id)
        self._require_mutable_record(run)
        attachment_id = uuid4()
        storage_key = f"attachments/{attachment_id.hex}/{uuid4().hex}"
        try:
            stored = await self.storage.put(storage_key, chunks)
            if stored.size_bytes == 0:
                self.storage.delete(storage_key)
                raise AttachmentStorageError("Empty files cannot be attached.")
        except (FileTooLargeError, FileStorageError) as error:
            raise AttachmentStorageError(str(error)) from error

        now = utc_now()
        attachment = FileAttachment(
            id=attachment_id,
            original_filename=metadata.filename,
            media_type=media_type[:255] or "application/octet-stream",
            size_bytes=stored.size_bytes,
            checksum_sha256=stored.checksum_sha256,
            storage_provider=self.storage.provider_key,
            storage_key=storage_key,
            state=AttachmentState.AVAILABLE.value,
            description=metadata.description,
            captured_at=metadata.captured_at,
            uploaded_at=now,
            created_at=now,
            updated_at=now,
        )
        try:
            self.repository.add(attachment)
            if metadata.run_step_record_id is None:
                self.repository.add(
                    ExperimentRunAttachment(
                        attachment_id=attachment.id,
                        experiment_run_id=run.id,
                        linked_at=now,
                    )
                )
            else:
                self.repository.add(
                    RunStepAttachment(
                        attachment_id=attachment.id,
                        run_step_record_id=metadata.run_step_record_id,
                        linked_at=now,
                    )
                )
            self.activity.record(
                ActivityType.ATTACHMENT_ADDED,
                f"Attachment added: {metadata.filename}",
                project_id=run.project_id,
                experiment_run_id=run.id,
                run_step_record_id=metadata.run_step_record_id,
                attachment_id=attachment.id,
            )
            self.session.commit()
        except Exception:
            self.session.rollback()
            self.storage.delete(storage_key)
            raise
        return attachment, metadata.run_step_record_id

    def list_attachments(
        self, run_id: UUID, run_step_id: UUID | None
    ) -> list[tuple[FileAttachment, UUID | None]]:
        self._require_context(run_id, run_step_id)
        return self.repository.list_attachments(self.workspace_id, run_id, run_step_id)

    def get_attachment(self, attachment_id: UUID) -> FileAttachment:
        attachment = self.repository.get_attachment(self.workspace_id, attachment_id)
        if attachment is None or attachment.state != AttachmentState.AVAILABLE.value:
            raise AttachmentNotFoundError(attachment_id)
        if not self.storage.exists(attachment.storage_key):
            raise AttachmentStorageError(
                "Attachment metadata exists, but file bytes are unavailable."
            )
        return attachment

    def list_activity(self, run_id: UUID) -> list[ActivityEventResponse]:
        self._require_context(run_id, None)
        return [
            ActivityEventResponse.model_validate(event)
            for event in self.repository.list_activity(self.workspace_id, run_id)
        ]

    def list_recent_activity(self, limit: int) -> list[ActivityEventResponse]:
        return [
            ActivityEventResponse.model_validate(event)
            for event in self.repository.list_workspace_activity(self.workspace_id, limit)
        ]

    def bundle(self, run_id: UUID) -> EvidenceBundleResponse:
        notes = self.list_notes(run_id, None)
        attachments = self.list_attachments(run_id, None)
        return EvidenceBundleResponse(
            notes=[NoteResponse.model_validate(note) for note in notes],
            attachments=[
                self.attachment_response(attachment, run_id, step_id)
                for attachment, step_id in attachments
            ],
            activity=self.list_activity(run_id),
        )

    @staticmethod
    def attachment_response(
        attachment: FileAttachment, run_id: UUID, run_step_id: UUID | None
    ) -> AttachmentResponse:
        return AttachmentResponse(
            id=attachment.id,
            original_filename=attachment.original_filename,
            media_type=attachment.media_type,
            size_bytes=attachment.size_bytes,
            checksum_sha256=attachment.checksum_sha256,
            storage_provider=attachment.storage_provider,
            state=AttachmentState(attachment.state),
            description=attachment.description,
            captured_at=attachment.captured_at,
            uploaded_at=attachment.uploaded_at,
            created_at=attachment.created_at,
            updated_at=attachment.updated_at,
            experiment_run_id=run_id,
            run_step_record_id=run_step_id,
            download_url=f"/attachments/{attachment.id}/content",
        )

    def _require_context(self, run_id: UUID, run_step_id: UUID | None) -> ExperimentRun:
        run = self.runs.get(self.workspace_id, run_id)
        if run is None:
            raise EvidenceContextNotFoundError
        if run_step_id is not None:
            step = self.execution.get_step(self.workspace_id, run_step_id)
            if step is None or step.experiment_run_id != run.id:
                raise EvidenceContextNotFoundError
        return run

    @staticmethod
    def _require_mutable_record(run: ExperimentRun) -> None:
        if is_completed_record(run.completed_at):
            raise CompletedRecordProtectedError
