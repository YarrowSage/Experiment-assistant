from fastapi import APIRouter

from app.api.routes.amendments import router as amendments_router
from app.api.routes.evidence import router as evidence_router
from app.api.routes.execution import router as execution_router
from app.api.routes.experiment_runs import router as experiment_runs_router
from app.api.routes.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.protocols import router as protocols_router

api_router = APIRouter()
api_router.include_router(amendments_router, tags=["amendments"])
api_router.include_router(health_router, tags=["system"])
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(experiment_runs_router, tags=["experiment-runs"])
api_router.include_router(execution_router, tags=["execution"])
api_router.include_router(evidence_router, tags=["evidence"])
api_router.include_router(protocols_router, tags=["protocols"])
