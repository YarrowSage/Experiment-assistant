from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.workspaces.domain import DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME, utc_now
from app.workspaces.models import Workspace


def ensure_default_workspace(session: Session) -> Workspace:
    workspace = session.get(Workspace, DEFAULT_WORKSPACE_ID)
    if workspace is not None:
        return workspace

    now = utc_now()
    workspace = Workspace(
        id=DEFAULT_WORKSPACE_ID,
        name=DEFAULT_WORKSPACE_NAME,
        kind="default",
        status="active",
        created_at=now,
        updated_at=now,
        revision=1,
    )
    try:
        with session.begin_nested():
            session.add(workspace)
            session.flush()
    except IntegrityError:
        session.expire_all()
        existing_workspace = session.get(Workspace, DEFAULT_WORKSPACE_ID)
        if existing_workspace is None:
            raise
        return existing_workspace
    return workspace


def initialize_default_workspace(session_factory: sessionmaker[Session]) -> None:
    with session_factory() as session, session.begin():
        ensure_default_workspace(session)
