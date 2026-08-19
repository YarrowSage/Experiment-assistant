from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]


def default_database_url() -> str:
    database_path = (API_ROOT / "data" / "experiment_assistant.db").as_posix()
    return f"sqlite:///{database_path}"


def default_storage_root() -> Path:
    return API_ROOT / "data" / "storage" / "runtime"


class Settings(BaseSettings):
    app_name: str = "Experiment Assistant API"
    app_version: str = "0.1.0"
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = Field(default_factory=default_database_url)
    storage_root: Path = Field(default_factory=default_storage_root)
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, ge=1)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    model_config = SettingsConfigDict(
        env_file=API_ROOT / ".env",
        env_prefix="EA_",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
