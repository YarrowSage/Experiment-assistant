"""Import domain models so Alembic can discover shared metadata."""

from app.projects.models import Project
from app.workspaces.models import Workspace

__all__ = ["Project", "Workspace"]
