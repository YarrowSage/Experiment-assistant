# Development Guide

Status: Accepted engineering direction with the Phase 1 stack and generic
experiment foundation implemented
Last reviewed: 2026-08-20

## 1. Recommended Stack

The lock files and package manifests are authoritative for exact versions:

| Layer | Accepted direction | Current state |
| --- | --- | --- |
| Web UI | Next.js App Router, React, TypeScript | Implemented |
| Mobile early | Responsive PWA from the same web app | Installable responsive baseline implemented |
| API | FastAPI and Pydantic | Implemented under `/api/v1` |
| Persistence | SQLAlchemy and Alembic | Implemented through revision `0006` |
| Local database | SQLite | Implemented for early single-server development |
| Hosted database | PostgreSQL | Future, not deployed |
| Local files | FileStorage local adapter | Implemented for Phase 1 evidence |
| Hosted files | S3-compatible/object-storage adapter | Future, provider undecided |
| Production UI | Custom product UI using accessible reusable components | Phase 1 foundation implemented |
| Streamlit | Not part of the production application | Rejected as primary UI |

Do not copy dependency versions from this document. Use `package.json`,
`pnpm-lock.yaml`, `pyproject.toml`, and `uv.lock`. The supported local toolchain
is Node.js 24 LTS, pnpm 11.19.0, Python 3.12.x, and uv 0.12.5.

## 2. Frontend Evaluation

### React alone

React provides a strong component model and broad ecosystem for forms, tables,
calendars, scientific visualization, and responsive interfaces. React alone
does not choose routing, build, server rendering, deployment, or PWA structure,
so assembling an application from the library alone would create unnecessary
decisions.

Decision: use React as the UI foundation through a framework.

### Next.js

Strengths for this product:

- structured routing and layouts for desktop/mobile application shells;
- TypeScript support and a mature React ecosystem;
- responsive web and PWA delivery from one codebase;
- documented manifest, service-worker, installation, and web-push paths;
- client-side transitions plus server rendering where useful;
- self-hosting options;
- route-level loading and error boundaries;
- good fit for a future generated API client.

Risks:

- server and client component boundaries add concepts for a beginner;
- caching and rendering defaults require deliberate use;
- Next.js route handlers could tempt the project to duplicate backend logic.

Decision: recommend Next.js App Router. Treat FastAPI as the system API.
Next.js server features may proxy or support UI delivery but must not become a
second business backend. The official Next.js documentation itself describes
its backend-for-frontend capability as not a full backend replacement.

### Vue

Vue is a credible alternative with approachable single-file components and
incremental adoption. It could deliver the responsive product successfully.

Reasons it is not the primary recommendation:

- choosing Vue would not materially simplify the Python API, sync, or data
  architecture;
- the selected product direction benefits from the React/Next ecosystem and
  documented Next.js PWA path;
- maintaining two candidate frontend directions would create indecision.

Decision: do not use Vue in parallel. Reconsider only if the maintainer strongly
prefers Vue before Phase 1 begins.

### Other frameworks

SvelteKit, Nuxt, and other frameworks may be capable, but there is no validated
product requirement they uniquely solve. Do not expand the comparison without a
concrete blocker.

## 3. PWA Decision

Recommend a PWA for early mobile access because it can share the responsive
frontend and API with desktop, can be installed on supported home screens, and
allows real-device workflow validation before funding native clients.

PWA does not equal native:

- background execution is constrained;
- offline and conflict behavior still require product engineering;
- browser support for files, camera, push, and installation varies;
- native device, distribution, and operating-system integrations are limited.

The timer design must persist timestamps and reconstruct elapsed time. Phase 1
may add manifest/installability to the shell; robust offline synchronization is
deferred.

See [MULTI_DEVICE_STRATEGY.md](MULTI_DEVICE_STRATEGY.md).

## 4. Backend Evaluation

### FastAPI

Strengths:

- API-first and based on OpenAPI;
- typed request/response validation through Pydantic;
- automatic interactive API documentation;
- file/form support;
- authentication primitives can be introduced later;
- compatible with modular application and domain layers;
- a good boundary for web, PWA, and future native clients.

Risks:

- it does not supply a complete admin product, ORM, or project architecture;
- careless route-first development can put business logic into handlers;
- asynchronous code should not be introduced where it provides no benefit.

Decision: recommend FastAPI, with application services and repositories outside
route handlers.

### Django

Django provides a mature ORM, migrations, authentication, forms, file handling,
and administrative interface. It is a strong alternative if a built-in admin
and conventional server-managed product become the main priority.

For the current separate, polished Next.js client and API-first direction,
Django would either duplicate UI capabilities or require an additional API
framework. Its batteries-included structure is valuable but heavier than the
current need.

Decision: do not select Django now. Reconsider before implementation only if
built-in administration, permissions, or content management outweigh the
current API-first preference.

### Flask

Flask is intentionally lightweight and flexible. The project would need to
select and integrate validation, OpenAPI, ORM, migrations, authentication, and
structure itself.

Decision: do not select Flask. Its flexibility does not offset the extra
foundational decisions for this product and maintainer.

## 5. Streamlit Decision

Streamlit is not recommended as the main or secondary production UI framework.

Reasons:

- its server-driven rerun/session model is optimized for Python data apps, not a
  highly controlled responsive product shell;
- advanced responsive navigation, PWA lifecycle, offline drafts, complex
  client state, and mobile execution need more direct frontend control;
- camera/peripheral access requires Streamlit commands or custom components;
- deployment with media and multiple replicas requires special session and
  shared-storage considerations;
- maintaining both Streamlit and Next.js production interfaces would duplicate
  effort.

Streamlit may be used later in an explicitly disposable, isolated analysis
prototype if it accelerates scientific validation. Such a prototype must not
become the production UI, a required service, or the location of shared domain
rules.

Answer: do not retain Streamlit in the planned application stack.

## 6. Database Decision

### SQLite early

Retain SQLite for:

- one local backend process;
- beginner-friendly development;
- fast tests and demos;
- early schema iteration through migrations.

Conditions:

- clients access it only through the API;
- foreign-key enforcement is enabled;
- migrations start with the first schema;
- runtime database files are ignored by Git;
- SQLite is not presented as multi-user synchronization storage.

### PostgreSQL later

Use PostgreSQL before authenticated shared deployment because it better fits
concurrent writes, access patterns, operational backup, and hosted services.

### Portability approach

- SQLAlchemy repositories;
- Alembic migrations;
- stable UUIDs;
- explicit constraints;
- UTC timestamps;
- portable JSON;
- no SQLite row-ID assumptions;
- no core behavior dependent on a vendor-specific query;
- automated tests against both databases before migration;
- rehearsed data and file cutover with verification and rollback.

SQLAlchemy supports both SQLite and PostgreSQL dialects. That reduces code
change but does not eliminate behavioral testing.

## 7. File Storage Plan

The Phase 1 local adapter stores evidence below the configurable
`EA_STORAGE_ROOT`; its default runtime layout is:

    data/
      experiment_assistant.db
      storage/
        runtime/
          attachments/

Runtime contents are ignored by Git. Database rows retain attachment metadata,
logical storage keys, size, media type, and SHA-256 checksum. Physical local
paths are never part of API responses.

Rules:

- database rows store metadata and a logical storage key;
- the FileStorage interface owns byte operations;
- filenames are display metadata, not physical object identity;
- verify uploads with size and SHA-256 checksum;
- keep originals separate from generated thumbnails/previews;
- exports are generated artifacts with provenance and expiry/retention rules;
- a backup includes database plus referenced files;
- future object storage uses the same logical keys through another adapter.

Object-storage provider, encryption, retention, and signed-URL approach remain
open until deployment requirements exist.

## 8. Code Organization

Phase 1 created:

    apps/
      web/
      api/
    docs/

Shared `packages/` are still deferred until a concrete repeated use justifies
them.

Backend code should be organized by modules:

    app/
      core/
      api/
      core/
      workspaces/
      projects/
      protocols/
      experiment_runs/
      execution/
      evidence/
      amendments/

Each backend module may contain domain, application, presentation, and
infrastructure subpackages only when their size warrants it. Do not create empty
architecture folders merely to match a diagram.

Frontend code should group module features, shared components, API access, and
design tokens. React components must not import SQLAlchemy or know SQLite file
paths.

## 9. API and Contract Practice

- version public endpoints;
- define Pydantic request and response models separately from ORM models;
- generate or validate a TypeScript client from OpenAPI when it becomes useful;
- keep errors consistent and localizable;
- support idempotency for retriable create/complete/upload operations;
- use optimistic revisions for mutable scientific records;
- paginate histories and file lists;
- store and display units explicitly;
- validate file size/type and authorization before accepting production uploads;
- never expose internal file paths.

Breaking API changes require an explicit migration/deprecation plan once more
than one client version exists.

## 10. Development Workflow

The current and future workflow is:

    Issue
      ↓
    Feature branch
      ↓
    Small implementation
      ↓
    Tests and checks
      ↓
    Commit
      ↓
    Pull request
      ↓
    Review
      ↓
    Merge

### In simple terms

- Issue: a written agreement about one piece of work.
- Branch: a safe line of development separate from stable main.
- Commit: a named snapshot of a coherent change.
- Pull request: a place to review the branch before it joins main.
- Review: checking behavior, safety, tests, and clarity.
- Merge: adding accepted work to main.
- Conflict: Git cannot automatically combine two edits to the same area and
  needs a human decision.

### Rules

- do not develop directly on main;
- create one feature branch for one accepted issue;
- use names such as feature/app-shell or feature/experiment-core;
- keep commits focused;
- review the diff before committing;
- never commit secrets or runtime research data;
- run relevant tests before push;
- open a pull request and explain what changed, why, and how it was checked;
- merge only after review and passing required checks;
- remove branches after a safe merge when appropriate.

## 11. Coding Practices for Later Phases

- use strict TypeScript;
- use Python type hints at application boundaries;
- format and lint with project-owned configuration;
- prefer clear names over abbreviations;
- keep functions and components focused;
- document scientific assumptions and units;
- separate domain calculations from display formatting;
- use decimal or domain-appropriate numeric handling when precision requires it;
- record calculation and analysis tool versions;
- keep network, database, file, and clock access behind testable boundaries;
- do not introduce generic abstractions before two or more real uses justify
  them.

## 12. Testing Strategy

### Frontend

- unit tests for pure helpers and scientific presentation rules;
- component tests for forms, accessibility, error, and responsive states;
- end-to-end tests for a few critical workflows;
- real-device PWA checks for camera, interruption, and weak network.

### Backend

- domain tests for lifecycle and invariants;
- application tests for transactions and authorization context;
- API tests for validation, errors, idempotency, and concurrency;
- repository/migration tests for SQLite;
- PostgreSQL compatibility tests before hosted deployment;
- file-storage contract tests shared by local and object adapters.

### Scientific tools

- published or independently calculated examples;
- unit conversion and boundary cases;
- missing, invalid, and non-finite values;
- reproducible configuration and output;
- explicit tolerances;
- regression fixtures using synthetic data.

### Documentation

- relative links;
- status language distinguishing planned from implemented;
- terminology against DATA_MODEL.md;
- roadmap and phase boundaries;
- architecture decisions against actual code once implementation begins.

Never report a check as passing if it was not run.

## 13. Schema Migration Practice

Phase 1 contains a linear Alembic chain from `0001` through `0006`. For every
subsequent schema change:

1. change the conceptual/accepted model if needed;
2. create an Alembic migration;
3. review forward and rollback behavior;
4. test against a copy or synthetic fixture;
5. run application tests;
6. document destructive or irreversible effects;
7. back up before applying to meaningful data.

Do not modify a deployed schema manually. Data migrations must preserve
scientific history or state exactly why an approved transformation changes it.

## 14. Dependency Practice

- choose dependencies only for a current accepted requirement;
- prefer actively maintained, documented packages;
- record direct dependencies and lock transitive versions;
- separate development dependencies;
- run security and license review before production;
- schedule intentional upgrades rather than accidental floating upgrades;
- avoid importing large UI suites merely for one component;
- do not add multiple libraries for the same responsibility.

Exact choices for calendar, table, charts, forms, state/query management, UI
primitives, package manager, and Python environment manager are open Phase 1 or
later decisions.

## 15. Phase 1 Completion Boundary

Phase 1 now implements the repository foundation, responsive shell, Default
Workspace ownership boundary, Projects, immutable Protocol Versions, generic
ExperimentRuns, execution records, evidence, activity history, explicit
completion, amendments, real-data Home/Planner views, planned product-area
shells, and PWA installability.

It does not implement authentication, Workspace membership/permissions,
multi-user synchronization, offline mutation queues, conflict resolution,
specialized Workbench domain models, scientific Analysis engines, deployment,
or native applications. Those capabilities require separately approved future
issues and must not be inferred from the PWA manifest or current UI shells.

## 16. Official Technical References

- [React documentation](https://react.dev/learn)
- [Next.js App Router guides](https://nextjs.org/docs/app/guides)
- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js backend-for-frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Vue introduction](https://vuejs.org/guide/introduction.html)
- [FastAPI features](https://fastapi.tiangolo.com/features/)
- [Django overview](https://docs.djangoproject.com/en/5.2/intro/overview/)
- [Flask documentation](https://flask.palletsprojects.com/en/stable/)
- [Streamlit client-server architecture](https://docs.streamlit.io/develop/concepts/architecture/architecture)
- [SQLAlchemy dialect documentation](https://docs.sqlalchemy.org/en/20/dialects/)
- [Alembic documentation](https://alembic.sqlalchemy.org/en/latest/)

References establish framework capabilities. They do not replace project
prototypes, compatibility checks, or dependency review at implementation time.
