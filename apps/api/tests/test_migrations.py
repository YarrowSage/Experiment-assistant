from pathlib import Path

from alembic.config import Config
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from alembic import command
from app.core.database import create_database_engine
from app.workspaces.domain import DEFAULT_WORKSPACE_ID
from app.workspaces.models import Workspace


def alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.attributes["database_url"] = database_url
    return config


def test_clean_upgrade_downgrade_and_reupgrade(tmp_path: Path) -> None:
    database_url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    config = alembic_config(database_url)

    command.upgrade(config, "head")
    engine = create_database_engine(database_url)
    assert set(inspect(engine).get_table_names()) == {"alembic_version", "projects", "workspaces"}
    with Session(engine) as session:
        assert session.scalar(select(Workspace.id)) == DEFAULT_WORKSPACE_ID

    command.downgrade(config, "base")
    assert inspect(engine).get_table_names() == ["alembic_version"]

    command.upgrade(config, "head")
    assert set(inspect(engine).get_table_names()) == {"alembic_version", "projects", "workspaces"}
    with Session(engine) as session:
        assert session.scalar(select(Workspace.id)) == DEFAULT_WORKSPACE_ID
    engine.dispose()
