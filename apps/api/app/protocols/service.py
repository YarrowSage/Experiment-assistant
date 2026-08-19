from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.projects.domain import ProjectStatus
from app.projects.repository import ProjectRepository
from app.protocols.domain import (
    ProtocolStateError,
    ProtocolStatus,
    ProtocolVersionStatus,
    require_editable_version,
)
from app.protocols.errors import (
    ProtocolNotFoundError,
    ProtocolRevisionConflictError,
    ProtocolStateConflictError,
    ProtocolStepNotFoundError,
    ProtocolVersionNotFoundError,
    ProtocolVersionRevisionConflictError,
)
from app.protocols.models import Protocol, ProtocolStep, ProtocolSubStep, ProtocolVersion
from app.protocols.repository import ProtocolRepository
from app.protocols.schemas import (
    ProtocolCreate,
    ProtocolNewVersion,
    ProtocolStepInput,
    ProtocolStepMove,
    ProtocolUpdate,
    ProtocolVersionPublish,
    ProtocolVersionUpdate,
)
from app.workspaces.domain import DEFAULT_WORKSPACE_ID, utc_now


class ProtocolService:
    def __init__(self, session: Session, workspace_id: UUID = DEFAULT_WORKSPACE_ID) -> None:
        self.session = session
        self.workspace_id = workspace_id
        self.repository = ProtocolRepository(session)
        self.projects = ProjectRepository(session)

    def create(self, payload: ProtocolCreate) -> Protocol:
        project = self.projects.get(self.workspace_id, payload.project_id)
        if project is None or ProjectStatus(project.status) is ProjectStatus.ARCHIVED:
            raise ProtocolStateConflictError(
                "Protocols require a current Project in the Default Workspace."
            )
        now = utc_now()
        protocol = Protocol(
            project_id=payload.project_id,
            title=payload.title,
            status=ProtocolStatus.ACTIVE.value,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        version = ProtocolVersion(
            version_number=1,
            status=ProtocolVersionStatus.DRAFT.value,
            description=payload.description,
            purpose=payload.purpose,
            precautions=payload.precautions,
            change_summary="Initial draft",
            based_on_version_id=None,
            published_at=None,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        protocol.versions.append(version)
        self.repository.add(protocol)
        self.session.commit()
        return self.get(protocol.id)

    def get(self, protocol_id: UUID) -> Protocol:
        protocol = self.repository.get(self.workspace_id, protocol_id)
        if protocol is None:
            raise ProtocolNotFoundError(protocol_id)
        return protocol

    def list(
        self,
        *,
        project_id: UUID | None,
        archived: bool,
        limit: int,
        offset: int,
    ) -> tuple[list[Protocol], int]:
        return self.repository.list(
            self.workspace_id,
            project_id=project_id,
            archived=archived,
            limit=limit,
            offset=offset,
        )

    def update(self, protocol_id: UUID, payload: ProtocolUpdate) -> Protocol:
        current = self.get(protocol_id)
        if current.revision != payload.expected_revision:
            raise ProtocolRevisionConflictError
        if ProtocolStatus(current.status) is ProtocolStatus.ARCHIVED:
            raise ProtocolStateConflictError("Archived Protocols cannot be edited.")
        values = payload.model_dump(exclude={"expected_revision"}, exclude_unset=True)
        if "status" in values:
            values["status"] = ProtocolStatus(values["status"]).value
        values["updated_at"] = utc_now()
        updated = self.repository.compare_and_swap_protocol(
            self.workspace_id, protocol_id, payload.expected_revision, values
        )
        if updated is None:
            self.session.rollback()
            raise ProtocolRevisionConflictError
        self.session.commit()
        return updated

    def get_version(self, version_id: UUID) -> ProtocolVersion:
        version = self.repository.get_version(self.workspace_id, version_id)
        if version is None:
            raise ProtocolVersionNotFoundError(version_id)
        return version

    def update_version(self, version_id: UUID, payload: ProtocolVersionUpdate) -> ProtocolVersion:
        version = self.get_version(version_id)
        self._require_draft(version)
        if version.revision != payload.expected_revision:
            raise ProtocolVersionRevisionConflictError
        values = payload.model_dump(exclude={"expected_revision"}, exclude_unset=True)
        values["updated_at"] = utc_now()
        updated = self.repository.compare_and_swap_version(
            self.workspace_id, version_id, payload.expected_revision, values
        )
        if updated is None:
            self.session.rollback()
            raise ProtocolVersionRevisionConflictError
        self.session.commit()
        return updated

    def add_step(self, version_id: UUID, payload: ProtocolStepInput) -> ProtocolVersion:
        version = self.get_version(version_id)
        self._prepare_step_change(version, payload.expected_version_revision)
        now = utc_now()
        step = ProtocolStep(
            stable_key=uuid4(),
            protocol_version_id=version.id,
            position=len(version.steps) + 1,
            title=payload.title,
            instruction=payload.instruction,
            planned_duration_seconds=payload.planned_duration_seconds,
            timer_mode=payload.timer_mode.value,
            required=payload.required,
            precautions=payload.precautions,
            created_at=now,
            updated_at=now,
        )
        self._replace_substeps(step, payload)
        self.session.add(step)
        self.session.commit()
        self.session.expire_all()
        return self.get_version(version.id)

    def update_step(self, step_id: UUID, payload: ProtocolStepInput) -> ProtocolVersion:
        step = self.repository.get_step(self.workspace_id, step_id)
        if step is None:
            raise ProtocolStepNotFoundError(step_id)
        version = self.get_version(step.protocol_version_id)
        self._prepare_step_change(version, payload.expected_version_revision)
        step.title = payload.title
        step.instruction = payload.instruction
        step.planned_duration_seconds = payload.planned_duration_seconds
        step.timer_mode = payload.timer_mode.value
        step.required = payload.required
        step.precautions = payload.precautions
        step.updated_at = utc_now()
        self._replace_substeps(step, payload)
        self.session.commit()
        self.session.expire_all()
        return self.get_version(version.id)

    def remove_step(self, step_id: UUID, expected_version_revision: int) -> ProtocolVersion:
        step = self.repository.get_step(self.workspace_id, step_id)
        if step is None:
            raise ProtocolStepNotFoundError(step_id)
        version = self.get_version(step.protocol_version_id)
        self._prepare_step_change(version, expected_version_revision)
        self.session.delete(step)
        self.session.flush()
        remaining = [item for item in version.steps if item.id != step_id]
        temporary_base = len(version.steps) + 1
        for position, item in enumerate(remaining, start=1):
            item.position = temporary_base + position
        self.session.flush()
        for position, item in enumerate(remaining, start=1):
            item.position = position
        self.session.commit()
        self.session.expire_all()
        return self.get_version(version.id)

    def move_step(self, step_id: UUID, payload: ProtocolStepMove) -> ProtocolVersion:
        step = self.repository.get_step(self.workspace_id, step_id)
        if step is None:
            raise ProtocolStepNotFoundError(step_id)
        version = self.get_version(step.protocol_version_id)
        self._prepare_step_change(version, payload.expected_version_revision)
        target_position = step.position + (-1 if payload.direction == "up" else 1)
        if target_position < 1 or target_position > len(version.steps):
            raise ProtocolStateConflictError("The step is already at that edge of the Protocol.")
        other = next(item for item in version.steps if item.position == target_position)
        original_position = step.position
        step.position = len(version.steps) + 1
        self.session.flush()
        other.position = original_position
        self.session.flush()
        step.position = target_position
        self.session.commit()
        self.session.expire_all()
        return self.get_version(version.id)

    def publish(self, version_id: UUID, payload: ProtocolVersionPublish) -> ProtocolVersion:
        version = self.get_version(version_id)
        self._require_draft(version)
        if version.revision != payload.expected_revision:
            raise ProtocolVersionRevisionConflictError
        if not version.steps:
            raise ProtocolStateConflictError("Add at least one ordered step before publishing.")
        now = utc_now()
        updated = self.repository.compare_and_swap_version(
            self.workspace_id,
            version.id,
            payload.expected_revision,
            {
                "status": ProtocolVersionStatus.PUBLISHED.value,
                "published_at": now,
                "updated_at": now,
            },
        )
        if updated is None:
            self.session.rollback()
            raise ProtocolVersionRevisionConflictError
        self.repository.supersede_other_published(version.protocol_id, version.id)
        protocol = self.get(version.protocol_id)
        self.repository.compare_and_swap_protocol(
            self.workspace_id,
            protocol.id,
            protocol.revision,
            {"updated_at": now},
        )
        self.session.commit()
        return self.get_version(version.id)

    def create_new_version(
        self, source_version_id: UUID, payload: ProtocolNewVersion
    ) -> ProtocolVersion:
        source = self.get_version(source_version_id)
        if ProtocolVersionStatus(source.status) is ProtocolVersionStatus.DRAFT:
            raise ProtocolStateConflictError(
                "Finish or publish the current Draft Version before creating another."
            )
        protocol = self.get(source.protocol_id)
        if any(
            ProtocolVersionStatus(item.status) is ProtocolVersionStatus.DRAFT
            for item in protocol.versions
        ):
            raise ProtocolStateConflictError(
                "Finish or publish the current Draft Version before creating another."
            )
        if protocol.revision != payload.expected_protocol_revision:
            raise ProtocolRevisionConflictError
        bumped = self.repository.compare_and_swap_protocol(
            self.workspace_id,
            protocol.id,
            payload.expected_protocol_revision,
            {"updated_at": utc_now()},
        )
        if bumped is None:
            self.session.rollback()
            raise ProtocolRevisionConflictError
        now = utc_now()
        draft = ProtocolVersion(
            protocol_id=source.protocol_id,
            version_number=self.repository.next_version_number(source.protocol_id),
            status=ProtocolVersionStatus.DRAFT.value,
            description=source.description,
            purpose=source.purpose,
            precautions=source.precautions,
            change_summary=payload.change_summary,
            based_on_version_id=source.id,
            published_at=None,
            created_at=now,
            updated_at=now,
            revision=1,
        )
        self.session.add(draft)
        self.session.flush()
        for source_step in source.steps:
            step = ProtocolStep(
                stable_key=source_step.stable_key,
                protocol_version_id=draft.id,
                position=source_step.position,
                title=source_step.title,
                instruction=source_step.instruction,
                planned_duration_seconds=source_step.planned_duration_seconds,
                timer_mode=source_step.timer_mode,
                required=source_step.required,
                precautions=source_step.precautions,
                created_at=now,
                updated_at=now,
            )
            for substep in source_step.substeps:
                step.substeps.append(
                    ProtocolSubStep(
                        position=substep.position,
                        title=substep.title,
                        instruction=substep.instruction,
                    )
                )
            self.session.add(step)
        self.session.commit()
        self.session.expire_all()
        return self.get_version(draft.id)

    def _prepare_step_change(self, version: ProtocolVersion, expected_revision: int) -> None:
        self._require_draft(version)
        if version.revision != expected_revision:
            raise ProtocolVersionRevisionConflictError
        updated = self.repository.compare_and_swap_version(
            self.workspace_id,
            version.id,
            expected_revision,
            {"updated_at": utc_now()},
        )
        if updated is None:
            self.session.rollback()
            raise ProtocolVersionRevisionConflictError

    def _replace_substeps(self, step: ProtocolStep, payload: ProtocolStepInput) -> None:
        if step.id is not None:
            step.substeps.clear()
            self.session.flush()
        for position, substep in enumerate(payload.substeps, start=1):
            step.substeps.append(
                ProtocolSubStep(
                    position=position,
                    title=substep.title,
                    instruction=substep.instruction,
                )
            )

    @staticmethod
    def _require_draft(version: ProtocolVersion) -> None:
        try:
            require_editable_version(ProtocolVersionStatus(version.status))
        except ProtocolStateError as error:
            raise ProtocolStateConflictError(str(error)) from error
