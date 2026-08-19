from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.main import create_app
from app.projects.models import Project
from app.workspaces.domain import DEFAULT_WORKSPACE_ID
from app.workspaces.models import Workspace
from app.workspaces.service import ensure_default_workspace


def test_default_workspace_initialization_is_idempotent(
    test_session_factory: sessionmaker[Session],
) -> None:
    with test_session_factory() as session:
        workspace = session.get(Workspace, DEFAULT_WORKSPACE_ID)
        assert workspace is not None
        session.delete(workspace)
        session.commit()

        ensure_default_workspace(session)
        ensure_default_workspace(session)
        session.commit()
        count = session.scalar(select(func.count()).select_from(Workspace))

    assert count == 1


def test_repeated_application_startup_keeps_one_default_workspace(
    database_url: str,
    test_session_factory: sessionmaker[Session],
) -> None:
    settings = Settings(
        environment="test", database_url=database_url, cors_origins=[], _env_file=None
    )

    with TestClient(create_app(settings, test_session_factory)):
        pass
    with TestClient(create_app(settings, test_session_factory)):
        pass

    with test_session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Workspace)) == 1
        assert session.get(Workspace, DEFAULT_WORKSPACE_ID) is not None


def test_project_workspace_foreign_key_is_enforced(
    test_session_factory: sessionmaker[Session],
) -> None:
    with test_session_factory() as session:
        session.add(
            Project(
                workspace_id=uuid4(),
                title="Invalid ownership",
                status="planning",
                tags=[],
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()
