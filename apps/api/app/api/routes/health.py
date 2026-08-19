from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.schemas import HealthResponse, ReadinessResponse

router = APIRouter()
SettingsDependency = Annotated[Settings, Depends(get_settings)]
SessionDependency = Annotated[Session, Depends(get_db)]


@router.get("/health", response_model=HealthResponse)
def health(settings: SettingsDependency) -> HealthResponse:
    """Report process health without requiring infrastructure access."""
    return HealthResponse(status="ok", service=settings.app_name, version=settings.app_version)


@router.get("/ready", response_model=ReadinessResponse)
def readiness(session: SessionDependency) -> ReadinessResponse:
    """Verify that the API can execute a database query."""
    session.execute(text("SELECT 1"))
    database_status: Literal["ready"] = "ready"
    return ReadinessResponse(status="ok", database=database_status)
