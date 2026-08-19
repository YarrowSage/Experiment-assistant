from collections.abc import Generator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from app.core.config import Settings, get_settings
from app.core.database import create_database_engine
from app.main import create_app

API_ROOT = Path(__file__).resolve().parents[1]


def alembic_config(database_url: str) -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.attributes["database_url"] = database_url
    return config


@pytest.fixture
def database_url(tmp_path: Path) -> str:
    return f"sqlite:///{(tmp_path / 'test.db').as_posix()}"


@pytest.fixture
def test_engine(database_url: str) -> Generator[Engine, None, None]:
    command.upgrade(alembic_config(database_url), "head")
    engine = create_database_engine(database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def test_session_factory(test_engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture
def client(
    database_url: str,
    test_session_factory: sessionmaker[Session],
) -> Generator[TestClient, None, None]:
    settings = Settings(
        environment="test",
        database_url=database_url,
        cors_origins=[],
        _env_file=None,
    )
    application = create_app(settings, test_session_factory)
    application.dependency_overrides[get_settings] = lambda: settings

    with TestClient(application) as test_client:
        yield test_client

    application.dependency_overrides.clear()
