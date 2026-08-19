# Experiment Assistant

A modular, multi-device laboratory planning, execution, recording, management,
and analysis assistant for scientific research.

> Current status: Phase 1 is active. P1-01 established the web/API foundation,
> P1-02 added the responsive product shell, and P1-03 implements the Default
> Workspace ownership boundary plus API-backed Project management. Protocols,
> ExperimentRuns, Workspace UI, and later scientific workflows remain planned.

## Vision

Experiment Assistant is intended to connect the full experimental workflow:

Plan → schedule → prepare → execute → record → structure data → analyze →
export → review.

The accepted architecture uses a responsive Next.js client and a versioned
FastAPI backend. All clients use the API; the frontend never accesses the
database directly.

## Repository Structure

```text
apps/
  web/    Next.js, React, and TypeScript client
  api/    FastAPI, SQLAlchemy, and Alembic backend
docs/     Accepted product and architecture documents
```

Only folders needed by the current implementation are created. Planned shared
packages and business modules will be added when an accepted issue needs them.

## Prerequisites

- Node.js 24 LTS (Next.js requires Node.js 20.9 or newer)
- pnpm 11.19.0
- Python 3.12
- uv 0.12.5

On Windows, after installing Node.js 24 LTS and Python 3.12, the remaining tools
can be installed with:

```powershell
npm install --global pnpm@11.19.0
py -3.12 -m pip install --user uv==0.12.5
```

## First-time Setup

From the repository root:

```powershell
pnpm install
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
uv sync --project apps/api --locked --all-groups
Set-Location apps/api
uv run alembic upgrade head
Set-Location ../..
```

The example configuration contains no secret. Local `.env` files, virtual
environments, SQLite databases, uploaded research data, and build output are
excluded from Git.

## Start Development

Open two terminals in the repository root.

Terminal 1 — web application:

```powershell
pnpm dev:web
```

Open <http://localhost:3000>.

Terminal 2 — API:

```powershell
Set-Location apps/api
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Useful API URLs:

- health: <http://localhost:8000/api/v1/health>
- database readiness: <http://localhost:8000/api/v1/ready>
- interactive API documentation: <http://localhost:8000/docs>
- Projects: <http://localhost:8000/api/v1/projects>

The health endpoint checks the API process. The readiness endpoint separately
executes a database query so infrastructure failures are visible. The migration
creates one stable Default Workspace; application startup verifies it
idempotently. There is intentionally no Workspace selector or account system.

Project endpoints are versioned under `/api/v1/projects` and support create,
list/filter, read, revision-checked update, and archive. Projects are never hard
deleted. The web Project interface is available at
<http://localhost:3000/experiments/projects>.

The implemented Project lifecycle is `planning`, `active`, `paused`,
`completed`, and `archived`. The frozen `paused` value supersedes the older
Phase 0 `on_hold` proposal.

## Checks

Frontend checks from the repository root:

```powershell
pnpm check:web
```

Backend checks:

```powershell
Set-Location apps/api
uv run ruff check app tests alembic/env.py
uv run mypy app
uv run pytest
uv run alembic check
uv run alembic heads
uv run alembic current
```

To validate the first business migration manually on disposable local data:

```powershell
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

Do not downgrade a database containing meaningful records without a reviewed
backup and rollback plan.

## Current Limitations

- Project management is the only implemented business domain. All Projects
  belong to the automatic Default Workspace.
- All Experiments, project Protocols, Planner, Files, and Analysis remain
  honestly marked as planned.
- Workspace accounts, membership, permissions, and Workspace UI do not exist.
- SQLite is for early local, single-process development only.
- Authentication, synchronization, uploads, PWA installability, deployment,
  and all scientific workflows remain planned.

## Documentation

- [Phase 1 repository audit and issue plan](docs/PHASE_1_AUDIT.md)
- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Module design](docs/MODULE_DESIGN.md)
- [Multi-device strategy](docs/MULTI_DEVICE_STRATEGY.md)
- [UI design system](docs/UI_DESIGN_SYSTEM.md)
- [Development guide](docs/DEVELOPMENT_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributor and agent rules](AGENTS.md)

## License

This project is licensed under the [MIT License](LICENSE).
