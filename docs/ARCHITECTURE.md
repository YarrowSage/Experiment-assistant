# Architecture

Status: Accepted architecture; Phase 1 generic experiment core implemented,
with later modules and hosted deployment still planned
Last reviewed: 2026-08-20

## 1. Decision Summary

The recommended architecture is a modular monolith with separate responsive web
and Python API applications.

- Frontend: Next.js with React and TypeScript.
- Initial mobile delivery: responsive installable PWA.
- Backend: FastAPI with explicit application and domain layers.
- Persistence: SQLAlchemy with Alembic migrations.
- Early database: SQLite for local, single-server development.
- Future database: PostgreSQL for authenticated multi-user deployment.
- Early files: local storage adapter.
- Future files: object-storage adapter.
- Integration: versioned HTTP API; no frontend database access.
- Extensibility: compile-time registries and small interfaces, not runtime
  plugins.

These choices are accepted for the current architecture. No stack has been
installed in Phase 0.

## 2. Why a Modular Monolith

The product has many named modules, but it does not yet have the team size,
traffic, deployment needs, or independently scaled workloads that justify
microservices.

A modular monolith provides:

- one deployable backend during early development;
- transactions across closely related experiment records;
- simpler debugging and local setup;
- clear module boundaries that can be separated later if evidence requires it;
- less operational work for a beginner maintainer.

Modularity is enforced through code ownership and public interfaces, not
separate network services.

## 3. Logical Architecture

    Desktop browser / installed PWA / future native app
                         │
                  Versioned API contract
                         │
                 FastAPI presentation layer
                         │
                Application use-case layer
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    Domain modules   Integration links   Core contracts
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
               Infrastructure adapters
         ┌───────────────┼────────────────┐
         │               │                │
    SQL database    File storage      Export/search

### Presentation layer

Validates HTTP inputs, performs authorization when introduced, calls application
use cases, and maps results to API schemas. It contains no experiment rules.

### Application layer

Coordinates use cases such as starting a run, completing a step, linking a
workbench record, or requesting an export. It controls transactions and module
integration.

### Domain modules

Own business concepts and invariants. Examples include Experiments, Planner,
Workbenches, Analysis, Templates, and Kits.

### Infrastructure adapters

Implement database repositories, file storage, export renderers, search
indexes, clocks, identifiers, and future external services.

## 4. Dependency Rules

1. The web UI depends on API contracts, not ORM models.
2. API route handlers depend on application services, not concrete database
   sessions.
3. Domain modules do not import FastAPI, Next.js, SQLAlchemy models, or storage
   SDKs.
4. Infrastructure implements interfaces defined at an inward layer.
5. Experiment Management does not import concrete Animal or Cell workbench
   implementations.
6. Workbench integration is performed by a link/application service using
   stable identifiers.
7. Analysis consumes data through data-source adapters rather than reading
   arbitrary module tables directly.
8. Export consumes source-provider contracts rather than embedding rendering
   logic in each module.
9. Core contains shared technical contracts only; business convenience is not a
   reason to move logic into Core.

## 5. Proposed Repository Shape for Phase 1

The following is a planned layout, not an implemented directory structure:

    apps/
      web/                  Next.js responsive UI and PWA shell
      api/                  FastAPI application
    packages/
      api-contracts/        generated or shared client-facing schemas
      ui/                   design tokens and reusable UI components
    docs/                   product and engineering documentation

The Python application should be organized by domain capability rather than by
one global models/controllers folder:

    app/
      core/
      experiments/
      planner/
      calculators/
      workbenches/
      analysis/
      templates/
      kits/
      exports/
      integrations/

Exact package-manager and Python-environment choices remain open until Phase 1.

## 6. API-first Boundary

All clients should interact with a versioned API such as /api/v1. Even during
local development, the web frontend should not open SQLite or build paths into
the local uploads folder.

API resources should use:

- UUID identifiers generated independently of a database sequence;
- UTC timestamps serialized with an explicit offset;
- stable string status values;
- revision or version values for optimistic concurrency;
- idempotency keys for operations that may be retried;
- cursor pagination for growing histories;
- explicit attachment states such as pending, available, failed, and deleted;
- consistent error bodies with machine-readable codes and human-readable
  messages.

The API is the compatibility boundary for a future native application.

## 7. Experiment Consistency

### Protocol history

A Protocol is the stable identity and title of a reusable procedure.
ProtocolVersion is an immutable versioned definition, and each ProtocolStep
belongs to exactly one ProtocolVersion:

    Protocol
      └── ProtocolVersion
            └── ProtocolStep

A draft version may be edited before publication/use. Once a ProtocolVersion is
published or referenced by an ExperimentRun, it and its steps are immutable.
Changing the procedure creates a new ProtocolVersion.

ExperimentRun references the exact ProtocolVersion used. For example:

    CCK-8 Protocol v1 → Run #001
    CCK-8 Protocol v2 → Run #014

The instructions shown for each RunStepRecord therefore remain historically
stable. A controlled instruction snapshot may also be stored for durable report
rendering, but it is not a substitute for the ProtocolVersion relationship.

This is intentional historical preservation, not a merger of ProtocolStep and
RunStepRecord.

### Run lifecycle

Status transitions belong in an application service. Completing a run should
validate required steps and outcome fields according to the accepted product
rules. Direct status assignment by the UI is not allowed.

Draft, Planned, and In Progress records may be changed according to their
lifecycle rules. A Completed ExperimentRun or other important completed record
must not be silently overwritten. A future amendment/revision mechanism must
retain the original value, corrected value, correction reason, modified time,
and relationship to the prior revision. Phase 0 does not require a complete
GLP/GxP audit system, but persistence and APIs must not prevent this capability.

### Time

Start and end timestamps are stored. Duration is derived and may be cached for
display. A mobile browser timer is a presentation of persisted time, not the
source of truth.

## 8. Workbench Integration

WorkbenchDefinition describes a versioned workbench type, shared capabilities,
and allowed configuration/extension metadata. WorkbenchRecord stores common
metadata, lifecycle, links, and attachments.

WorkbenchRecord is not a universal scientific-data document. A concrete
Workbench may own normalized domain entities. For example:

    WorkbenchRecord
      └── AnimalExperiment
            ├── AnimalSubject
            ├── AnimalMeasurement
            └── AnimalDoseRecord

The accepted V1 set is Animal Workbench, Cell Workbench, Plate Workbench, and
Chromatography Workbench. Cell Workbench may own CellExperiment, CellCulture,
CellTreatment, and CellMeasurement entities. Plate/Well structure belongs to
Plate Workbench, while Chromatography Workbench owns its reviewed structured
chromatography records. Analysis is a separate top-level module with its own
domain model. JSON is appropriate for UI configuration, flexible metadata,
analysis/chart configuration, and limited extension fields. It must not be the
sole storage model for the four Workbench domains or for Analysis data.

An integration-owned link record connects a WorkbenchRecord to a
RunStepRecord. This avoids:

- copying structured workbench data into the experiment record;
- adding Workbench-specific fields to the experiment core;
- requiring the experiment module to import every future workbench.

The link may include a relationship type and a short display summary. The
complete structured record remains owned by the Workbench module.

## 9. Analysis Integration

Analysis receives data through registered source adapters. A source adapter
converts a selected workbench record, attachment dataset, or manual table into a
documented tabular contract.

The AnalysisSession stores user selections and tool configuration before an
analysis engine runs. Analysis tools return a preview plus provenance. They do
not modify source data.

No automatic column-role inference is authoritative. Suggestions, if later
added, remain unconfirmed until the user explicitly accepts them.

## 10. Calculator Extension

A calculator definition exposes:

- stable key and version;
- name and category;
- input schema, units, and validation rules;
- output schema and units;
- a deterministic calculation function;
- help text and scientific assumptions;
- tests using known examples.

A static registry makes the definition available to API and UI layers. Adding a
calculator should normally add one definition and its tests, not a database
table or core switch statement.

## 11. Export Architecture

Export is split into two extension points:

1. A source provider converts a domain object into a canonical document or
   tabular export model.
2. A renderer converts that model into PDF, Markdown, Excel, CSV, PNG, SVG, or
   another supported format.

An ExportRequest includes source type and identifier, requested format,
template/version, locale, time zone, and format options. The ExportService
validates support, obtains a stable source snapshot, calls a renderer, stores
the generated file, and records provenance.

Long exports can later become background jobs without changing module-owned
source providers.

## 12. Workspace Boundary

Workspace is the top-level ownership boundary for research data:

    Workspace
      └── Project
            └── Protocol / ExperimentRun / related records

The first release may create one default Workspace automatically and provide no
Workspace UI. Project belongs to exactly one Workspace from the first real data
model. Future Workspace kinds may represent a personal space or a
laboratory/team space.

Workspace membership, accounts, roles, permissions, invitations, and
collaboration are not implemented in Phase 0 or Phase 1. The boundary exists so
multi-user synchronization can be added without converting globally owned
Projects later.

## 13. Authentication-ready, Not Authentication-implemented

Phase 0 and Phase 1 do not implement login. The architecture should still avoid
assuming one permanent anonymous global user.

Early local mode uses the default Workspace. Application services should receive
an actor/workspace context interface rather than read a global user. Until
authentication exists, actor identity may be absent and no access-control claim
is made.

This design does not provide authentication or access control until a later
phase implements and tests them.

## 14. Persistence Portability

SQLAlchemy repositories hide connection and dialect details from use cases.
Alembic migrations begin with the first real schema in Phase 2.

Portable design rules:

- use database-independent types for core fields;
- represent UUIDs consistently across SQLite and PostgreSQL;
- normalize timestamps to UTC;
- keep foreign keys enabled in SQLite;
- avoid depending on SQLite row IDs;
- avoid PostgreSQL-only JSON queries in core workflows;
- store portable JSON documents and validate them in the application layer;
- test migration and repository behavior against PostgreSQL before production
  cutover.

SQLite remains appropriate only while one backend process owns a small local
database. It is not the final synchronized multi-user database.

## 15. File Storage Boundary

The database stores attachment metadata and a provider-neutral storage key. File
bytes are handled through a FileStorage interface with operations conceptually
equivalent to put, open, exists, delete, and create_download_reference.

Early local storage may use:

    data/
      database/
      uploads/
      manuals/
      images/
      exports/
      backups/

These runtime paths must be ignored by Git and must never be embedded into
domain records. A future object-storage adapter maps the same logical storage
keys to buckets and objects.

Deletion should be staged: detach or tombstone metadata first, then remove bytes
after retention and synchronization rules permit it.

## 16. Synchronization Readiness

The future server is authoritative for shared data. Clients may cache data for
performance or offline work, but the cache is not an independent source of
truth.

Records should carry stable IDs, timestamps, revisions, and tombstones.
Mutations use optimistic concurrency. A stale client receives a conflict and
must refresh or guide the user through resolution.

Offline mutation queues, change feeds, conflict UI, and file-resume protocols
are deferred to the synchronization phase. They must not be partially
implemented without an end-to-end design.

## 17. Cross-cutting Concerns

### Validation

Validate API inputs, domain invariants, structured workbench payloads, file
metadata, calculator units, and analysis configuration at their respective
boundaries.

### Observability

Future logs should use request/correlation IDs and avoid file contents, secrets,
or sensitive research data. Audit logging is separate from operational logs.

### Search

Modules expose indexable summaries through a search-provider contract. Early
search may use the relational database; a separate search service is not
justified without evidence.

### Backup

Backups must treat database metadata and file objects as one consistent set.
Copying SQLite alone is not a complete backup when attachments exist.

### Internationalization and scientific quantities

User-facing text should be localizable. Measured quantities such as
concentration, mass, volume, time, dose, body weight, temperature, and cell
density must remain machine-readable. Store the numeric value and unit
separately, for example:

    value = 22.3
    unit = g

A human-readable string may be derived for display but must not be the only
stored representation. This supports future validation, conversion, calculators,
and analysis. Phase 0 does not select a unit library or implement conversion.

## 18. Explicitly Rejected for Early Development

- microservices;
- direct UI-to-database access;
- one database per device as the synchronization model;
- runtime-loaded third-party plugins;
- a generic entity-attribute-value database for all scientific data;
- one universal JSON payload as the only model for every Workbench;
- file bytes stored in ordinary business rows;
- module-specific export systems;
- protocol and execution records represented by the same entity;
- Streamlit as the production UI framework;
- AI as a dependency of core experiment execution.

## 19. Architecture Risks to Validate

- whether the initial PWA satisfies real laboratory camera and offline needs;
- how much structured variation Animal and Cell workbenches require;
- detailed permissions and UX for amendments to completed records;
- realistic attachment sizes and file-retention requirements;
- single-user versus laboratory-team deployment expectations;
- institutional privacy, audit, and compliance requirements;
- the first analysis methods and their reproducibility requirements.

These risks should be tested with prototypes or user research in their planned
phases rather than solved through premature infrastructure.
