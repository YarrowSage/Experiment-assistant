from collections.abc import Mapping
from typing import Any, cast
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.orm import Session, selectinload

from app.projects.models import Project
from app.protocols.domain import ProtocolStatus, ProtocolVersionStatus
from app.protocols.models import Protocol, ProtocolStep, ProtocolVersion


class ProtocolRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, protocol: Protocol) -> Protocol:
        self.session.add(protocol)
        self.session.flush()
        return protocol

    def get(self, workspace_id: UUID, protocol_id: UUID) -> Protocol | None:
        return self.session.scalar(
            select(Protocol)
            .join(Project, Protocol.project_id == Project.id)
            .options(selectinload(Protocol.versions))
            .where(Protocol.id == protocol_id, Project.workspace_id == workspace_id)
        )

    def list(
        self,
        workspace_id: UUID,
        *,
        project_id: UUID | None,
        archived: bool,
        limit: int,
        offset: int,
    ) -> tuple[list[Protocol], int]:
        conditions: list[Any] = [Project.workspace_id == workspace_id]
        conditions.append(
            Protocol.status == ProtocolStatus.ARCHIVED.value
            if archived
            else Protocol.status != ProtocolStatus.ARCHIVED.value
        )
        if project_id is not None:
            conditions.append(Protocol.project_id == project_id)
        total = (
            self.session.scalar(
                select(func.count())
                .select_from(Protocol)
                .join(Project, Protocol.project_id == Project.id)
                .where(*conditions)
            )
            or 0
        )
        items = list(
            self.session.scalars(
                select(Protocol)
                .join(Project, Protocol.project_id == Project.id)
                .options(selectinload(Protocol.versions))
                .where(*conditions)
                .order_by(Protocol.updated_at.desc(), Protocol.title.asc())
                .limit(limit)
                .offset(offset)
            )
        )
        return items, total

    def get_version(self, workspace_id: UUID, version_id: UUID) -> ProtocolVersion | None:
        return self.session.scalar(
            select(ProtocolVersion)
            .join(Protocol, ProtocolVersion.protocol_id == Protocol.id)
            .join(Project, Protocol.project_id == Project.id)
            .options(
                selectinload(ProtocolVersion.steps).selectinload(ProtocolStep.substeps),
            )
            .where(ProtocolVersion.id == version_id, Project.workspace_id == workspace_id)
        )

    def get_step(self, workspace_id: UUID, step_id: UUID) -> ProtocolStep | None:
        return self.session.scalar(
            select(ProtocolStep)
            .join(ProtocolVersion, ProtocolStep.protocol_version_id == ProtocolVersion.id)
            .join(Protocol, ProtocolVersion.protocol_id == Protocol.id)
            .join(Project, Protocol.project_id == Project.id)
            .options(selectinload(ProtocolStep.substeps), selectinload(ProtocolStep.version))
            .where(ProtocolStep.id == step_id, Project.workspace_id == workspace_id)
        )

    def compare_and_swap_protocol(
        self,
        workspace_id: UUID,
        protocol_id: UUID,
        expected_revision: int,
        values: Mapping[str, Any],
    ) -> Protocol | None:
        project_ids = select(Project.id).where(Project.workspace_id == workspace_id)
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(Protocol)
                .where(
                    Protocol.id == protocol_id,
                    Protocol.project_id.in_(project_ids),
                    Protocol.revision == expected_revision,
                )
                .values(**values, revision=Protocol.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get(workspace_id, protocol_id)

    def compare_and_swap_version(
        self,
        workspace_id: UUID,
        version_id: UUID,
        expected_revision: int,
        values: Mapping[str, Any],
    ) -> ProtocolVersion | None:
        protocol_ids = (
            select(Protocol.id)
            .join(Project, Protocol.project_id == Project.id)
            .where(Project.workspace_id == workspace_id)
        )
        result = cast(
            CursorResult[Any],
            self.session.execute(
                update(ProtocolVersion)
                .where(
                    ProtocolVersion.id == version_id,
                    ProtocolVersion.protocol_id.in_(protocol_ids),
                    ProtocolVersion.revision == expected_revision,
                )
                .values(**values, revision=ProtocolVersion.revision + 1)
                .execution_options(synchronize_session=False)
            ),
        )
        if result.rowcount != 1:
            return None
        self.session.expire_all()
        return self.get_version(workspace_id, version_id)

    def next_version_number(self, protocol_id: UUID) -> int:
        current = self.session.scalar(
            select(func.max(ProtocolVersion.version_number)).where(
                ProtocolVersion.protocol_id == protocol_id
            )
        )
        return (current or 0) + 1

    def supersede_other_published(self, protocol_id: UUID, except_version_id: UUID) -> None:
        self.session.execute(
            update(ProtocolVersion)
            .where(
                ProtocolVersion.protocol_id == protocol_id,
                ProtocolVersion.id != except_version_id,
                ProtocolVersion.status == ProtocolVersionStatus.PUBLISHED.value,
            )
            .values(status=ProtocolVersionStatus.SUPERSEDED.value)
        )
