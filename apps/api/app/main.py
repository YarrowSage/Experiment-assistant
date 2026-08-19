from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, sessionmaker

from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.database import SessionLocal
from app.evidence.storage import FileStorage, LocalFileStorage
from app.workspaces.service import initialize_default_workspace


def create_app(
    settings: Settings | None = None,
    session_factory: sessionmaker[Session] | None = None,
    file_storage: FileStorage | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    resolved_session_factory = session_factory or SessionLocal

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        initialize_default_workspace(resolved_session_factory)
        yield

    application = FastAPI(
        title=resolved_settings.app_name,
        version=resolved_settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{resolved_settings.api_v1_prefix}/openapi.json",
        lifespan=lifespan,
    )
    application.state.session_factory = resolved_session_factory
    application.state.file_storage = file_storage or LocalFileStorage(
        resolved_settings.storage_root,
        max_bytes=resolved_settings.max_upload_bytes,
    )

    if resolved_settings.cors_origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=resolved_settings.cors_origins,
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    application.include_router(api_router, prefix=resolved_settings.api_v1_prefix)
    return application


app = create_app()
