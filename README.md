# Experiment Assistant

A modular, multi-device laboratory planning, execution, recording, management,
and analysis assistant for scientific research.

> Current status: the complete Phase 1 generic experiment foundation is
> implemented on its review branch. It includes Projects, immutable Protocol
> versions, Experiment planning and execution, research evidence, completed
> record amendments, the real-data Home/Planner views, and an installable
> responsive PWA baseline. Specialized Workbenches, Analysis workflows,
> accounts, and synchronization remain planned.

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

- Node.js 24 LTS (do not substitute Node.js 25/26)
- pnpm 11.19.0
- Python 3.12.x (do not substitute Python 2.7, 3.13, or 3.14)
- uv 0.12.5

The repository `packageManager` field is authoritative for pnpm. Prefer
Corepack so the package-manager version does not drift:

```powershell
corepack enable
corepack prepare pnpm@11.19.0 --activate
py -3.12 -m pip install --user uv==0.12.5
```

On Windows, `python` may still resolve to an unrelated Python 2.7 installation.
Use `py -3.12` (or the explicit Python 3.12 executable) for this project.

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
- Protocols: <http://localhost:8000/api/v1/protocols>
- Experiments: <http://localhost:8000/api/v1/experiment-runs>

The health endpoint checks the API process. The readiness endpoint separately
executes a database query so infrastructure failures are visible. The migration
creates one stable Default Workspace; application startup verifies it
idempotently. There is intentionally no Workspace selector or account system.

All business endpoints are versioned under `/api/v1`. Projects and Experiments
use optimistic revisions and are archived instead of hard deleted. Published
Protocol Versions are immutable, and every protocol-backed Experiment keeps the
exact version it used. Planned timestamps remain separate from actual execution
timestamps.

The execution interface supports persisted step snapshots, timestamp-based
timers, pause/resume, notes, image/PDF/data attachments, activity history, and
explicit Experiment completion. Completed records reject ordinary edits;
transparent amendments retain the original value, correction, reason, time,
and revision transition. This is a scientific integrity foundation, not a
claim of GLP/GxP or other regulatory compliance.

Uploaded bytes use a backend-owned `FileStorage` abstraction. The Phase 1 local
adapter stores runtime files below `EA_STORAGE_ROOT` (default:
`apps/api/data/storage/runtime`), records metadata and SHA-256 checksums in the
database, and never exposes physical paths through the API. The default upload
limit is 50 MiB and can be configured with `EA_MAX_UPLOAD_BYTES`.

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

To validate the complete Phase 1 migration chain manually on disposable local
data:

```powershell
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

Do not downgrade a database containing meaningful records without a reviewed
backup and rollback plan.

## Current Limitations

- All records belong to one automatic Default Workspace. There is no Workspace
  selector.
- Workbench cards, Analysis areas, and most Resources remain honest planned
  shells. Planner currently presents real planned Experiment visibility without
  a dependency or scheduling engine.
- Workspace accounts, membership, permissions, and Workspace UI do not exist.
- Authentication, authorization, multi-user collaboration, hosted deployment,
  and object storage are not implemented.
- SQLite and local file storage are for early local, single-process development
  only.
- The PWA provides installability and responsive presentation only. There is no
  service-worker mutation queue, offline-first data store, conflict resolution,
  background upload, push notification, or automatic synchronization.
- The current generic workflow is not a GLP/GxP compliance system.

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
