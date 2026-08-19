from pathlib import Path

from sqlalchemy import inspect

from app.core.database import create_database_engine, ensure_sqlite_directory


def test_sqlite_connection_enforces_foreign_keys() -> None:
    database_url = "sqlite:///:memory:"
    engine = create_database_engine(database_url)

    with engine.connect() as connection:
        foreign_keys_enabled = connection.exec_driver_sql("PRAGMA foreign_keys").scalar_one()

    assert foreign_keys_enabled == 1
    assert inspect(engine).get_table_names() == []
    engine.dispose()


def test_file_engine_defers_persistence_until_database_use(tmp_path: Path) -> None:
    database_path = tmp_path / "not-created-yet" / "test.db"
    engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")

    assert not database_path.parent.exists()

    ensure_sqlite_directory(engine.url)
    with engine.connect() as connection:
        connection.exec_driver_sql("SELECT 1")

    assert database_path.exists()
    engine.dispose()
