# Roadmap

Status: Phase 1 generic experiment foundation completed on its review branch;
future phases are not started
Last reviewed: 2026-08-20

The reviewed issue sequence in [PHASE_1_AUDIT.md](PHASE_1_AUDIT.md) supersedes
the original Phase 0 scheduling labels where they differ. The architecture and
future-scope boundaries in this roadmap remain authoritative.

## 1. Roadmap Rules

- A phase begins only after explicit approval.
- Every implementation phase starts with a scoped GitHub issue and feature
  branch.
- Main remains stable.
- A phase is complete only when its acceptance criteria and relevant tests pass.
- Planned features must not be described as implemented.
- Later phases may be split when a review shows that the change is too large.
- Architecture documents are updated when accepted evidence changes a decision.

## 2. Dependency Logic

The roadmap builds the stable experiment lifecycle before specialized
workbenches and analysis.

    Foundation
        ↓
    Project / Protocol / Run
        ↓
    Planner and reusable tools
        ↓
    Workbench framework
        ↓
    Animal and Cell records
        ↓
    Export and Analysis
        ↓
    Data management and synchronization
        ↓
    Refinement, AI, and native evaluation

Analysis is intentionally after workbenches because it needs real source models.
Synchronization is intentionally after core records stabilize because conflicts
cannot be designed safely around undefined lifecycles.

## 3. Phase 0 — Product Definition and Architecture

### Goal

Define product scope, multi-device strategy, data meaning, module boundaries,
UI principles, technical direction, development rules, and roadmap.

### Deliverables

- README with honest current status;
- AGENTS.md;
- product specification;
- architecture;
- conceptual data model;
- module design;
- multi-device/PWA strategy;
- UI design system;
- development guide;
- roadmap.

### Exit criteria

- architecture review accepts or revises the key decisions;
- open questions are recorded;
- planned and implemented states are clearly separated;
- no business code, schema, deployment, or feature implementation exists.

### Current state

Architecture accepted with the Phase 0A guardrails. Documentation is being
archived through review; Phase 1 has not started.

## 4. Phase 1 — Application Foundation and UI Shell

### Goal

Create a maintainable development foundation and responsive visual shell without
business functionality.

### Planned scope

- repository workspace and local setup;
- Next.js/React/TypeScript shell;
- FastAPI project foundation and health/version boundary only as needed;
- design tokens and accessible shared primitives;
- desktop sidebar and mobile navigation shell;
- placeholder Home/Today/execution-layout states using synthetic data;
- PWA manifest/installability baseline;
- formatter, linter, type checking, tests, and CI baseline;
- environment and secret-handling conventions.

### Explicit exclusions

No real Project, Protocol, ExperimentRun, calendar, calculator, workbench,
analysis, export, authentication, sync, or business database table.

### Exit criteria

- shell works at agreed desktop and iPhone viewports;
- accessibility and responsive checks pass at the accepted baseline;
- web and API checks run locally and in CI;
- setup is understandable to the beginner maintainer.

## 5. Phase 2 — Project, Protocol, and Experiment Run Core

### Goal

Implement the minimum scientifically coherent lifecycle.

### Planned scope

- one automatic default Workspace ownership boundary, without Workspace UI;
- Project;
- Protocol, immutable ProtocolVersion, and ordered version-owned ProtocolStep;
- ExperimentRun and RunStepRecord;
- amendment-ready completed-record persistence without a full compliance audit
  system;
- result, observation, deviation, expectation, and next action;
- contextual attachment foundation;
- SQLite persistence through SQLAlchemy/Alembic;
- local FileStorage adapter;
- API and responsive core views;
- basic project/run filtering;
- minimal verified backup/data-portability path before real data is trusted.

### Exit criteria

- multiple runs can use one protocol without overwriting each other;
- each run identifies its exact ProtocolVersion and completed history remains
  stable after a new version is created;
- an interrupted timer reconstructs from timestamps;
- migrations and backup/restore are tested with synthetic data.

Basic search and backup appear here earlier than the original suggested Phase
12 because users should not accumulate irreplaceable data before recovery and
findability exist. Advanced global search and backup management remain Phase 12.

## 6. Phase 3 — Planner and Calendar

### Goal

Connect time planning to research records.

### Planned scope

- Today, This Week, and Calendar;
- CalendarEvent linked to project/protocol/run/workbench task;
- planned experiment creation and navigation;
- deadlines and simple reminders;
- rescheduling with non-drag alternatives;
- mobile simplified views.

Recurring rules, external calendar synchronization, and advanced notifications
require separate validation.

## 7. Phase 4 — Calculator Framework

### Goal

Establish the versioned calculator definition/registry before adding a large
catalog.

### Planned scope

- input/output/unit contract;
- deterministic registry;
- shared calculator UI;
- validation, assumptions, and tests;
- a small set of high-value calculators selected with users;
- optional traceable link from a calculation to a record, if requirements are
  accepted.

Do not implement every planned calculator in one pull request.

## 8. Phase 5 — Workbench Framework

### Goal

Implement generic WorkbenchDefinition, WorkbenchRecord, validation, and
experiment-step links without a full Animal or Cell module.

### Planned scope

- definition/version registry;
- structured-data validation;
- record lifecycle and attachments;
- RunStepWorkbenchLink;
- desktop/mobile workbench shell;
- export-source and analysis-source adapter contracts;
- one synthetic demonstration definition for framework testing only.

### Exit criteria

A new workbench can be added without changing ExperimentRun or RunStepRecord
fields.

## 9. Phase 6 — Animal Workbench

### Goal

Support validated longitudinal animal-experiment recording.

### Planned progression

1. animal identity and grouping;
2. body-weight and general-condition time series;
3. administration records;
4. photos/notes and mobile rapid entry;
5. reviewed extensions such as tumor dimensions.

Ethics, privacy, retention, identifiers, and institutional requirements must be
reviewed before real-study use.

## 10. Phase 7 — Cell Workbench

### Goal

Support common culture, treatment, plate, and assay records using customizable
protocols.

### Planned progression

- cell-line and passage context;
- culture conditions;
- plate and seeding records;
- treatment and concentration;
- photos and notes;
- selected assay presets based on user priority.

A separate Plate Workbench may be split from this phase if shared plate behavior
becomes substantial.

## 11. Phase 8 — Template Library

### Goal

Provide safe reusable starting points.

### Planned scope

- built-in versus user-owned distinction;
- category, preview, copy, customize, and personal-template creation;
- source attribution and version;
- copy-to-user protocol behavior;
- reviewed starter content.

Simple protocol duplication may exist in Phase 2. The full discovery/library
experience belongs here.

## 12. Phase 9 — Kits and Manuals

### Goal

Relate kit identity and official instructions to protocols.

### Planned scope

- kit metadata;
- manual PDF and attachments;
- search/view;
- protocol relationships;
- expiry/storage information;
- mobile manual viewing.

OCR and AI parsing remain later work.

## 13. Phase 10 — Unified Export System

### Goal

Implement shared source-provider and renderer contracts.

### Planned progression

- ExportRequest and output provenance;
- ExperimentRun to PDF/Markdown;
- Workbench to CSV/Excel where accepted;
- Analysis figure/data renderers after Phase 11 integration;
- background-job preparation for large exports.

Basic backup/data portability exists earlier for safety. Phase 10 is the
user-facing report and multi-format system.

## 14. Phase 11 — Analysis Workbench

### Goal

Implement user-directed, reproducible data selection, analysis, visualization,
and export.

### Planned progression

1. data-source adapters and manual/CSV/Excel source validation;
2. AnalysisSession and explicit variable roles;
3. preview and confirmation lifecycle;
4. a small set of validated charts;
5. selected analysis methods with provenance;
6. one Guided Analysis workflow chosen with users;
7. integration with Export System.

No method, group, control, X, Y, or chart is silently treated as the user's
choice.

## 15. Phase 12 — Search, Backup, and Data Management

### Goal

Harden cross-module findability and recoverability.

### Planned scope

- global search across module summaries;
- advanced filters and saved searches if needed;
- attachment integrity and orphan reporting;
- backup scheduling/verification;
- restore workflow;
- storage usage and cleanup;
- data import/export management;
- migration diagnostics.

This extends, rather than postpones, the minimal search/backup safety introduced
with real data in Phase 2.

## 16. Phase 13 — Accounts, Authorization, and Multi-device Sync

### Goal

Move from local single-workspace use to secure shared server authority.

### Planned progression

- decide personal/laboratory workspace model;
- authentication and account recovery;
- authorization and project membership;
- PostgreSQL and object-storage deployment;
- online desktop/mobile use against one API;
- sync metadata and change feed;
- offline cache and queued mutations;
- conflict-resolution UI;
- attachment retry/resume;
- migration and rollback rehearsal.

Authentication is included here because synchronization without identity and
authorization would expose research data. If hosted access is needed earlier,
this phase must be split and reviewed rather than adding ad-hoc login.

## 17. Phase 14 — UI/UX and PWA Hardening

### Goal

Validate and refine the complete cross-device experience.

### Planned scope

- real laboratory usability testing;
- accessibility audit;
- weak-network and interruption recovery;
- performance and large-data behavior;
- iOS/Android installed PWA tests;
- upload and offline-state refinement;
- navigation and information-density review;
- design consistency and localization.

Usability improvements happen in every phase; this phase is a system-level
hardening pass, not the first time UX is considered.

## 18. Phase 15 — AI Features

### Goal

Add narrow, reviewable assistance only where core records and privacy controls
are trustworthy.

Possible candidates:

- protocol/PDF step-draft assistance;
- manual extraction;
- search or summarization;
- speech-to-text;
- explanation of calculator or analysis options.

Every AI output is labeled, reviewable, and untrusted until confirmed. The phase
requires provider, privacy, consent, retention, failure, cost, and evaluation
decisions.

AI cannot silently edit completed records or make scientific analysis choices.

## 19. Phase 16 — Native Mobile Application Evaluation

### Goal

Decide from evidence whether a native iOS/Android client is justified.

Evaluate:

- background execution;
- high-volume/offline media;
- Bluetooth/sensor integrations;
- share extensions and widgets;
- institutional/app-store distribution;
- PWA performance and reliability gaps;
- cost of maintaining one or two native clients.

If approved, native clients consume the existing API and domain model. Native
development is not an excuse to fork scientific data semantics.

## 20. Adjustments from the Initial Suggested Roadmap

1. Basic search, backup, and data portability move into Phase 2 because real
   records should not exist without minimal recovery. Advanced capabilities stay
   in Phase 12.
2. PWA installability begins in Phase 1, while robust offline sync remains Phase
   13/14.
3. Authentication and authorization are explicitly paired with hosted
   synchronization in Phase 13.
4. Simple protocol copy may appear in Phase 2; the full Template Library remains
   Phase 8.
5. Export architecture is defined in Phase 0 and minimal safety export may exist
   earlier, while unified polished exports remain Phase 10.
6. Plate Workbench can be split from Cell Workbench if shared plate behavior
   warrants an independent phase.

These adjustments reduce data-loss risk and respect dependencies without
pulling later business features into Phase 0 or Phase 1.

## 21. Next Action After Acceptance

Do not start Phase 1 automatically.

After the user accepts Phase 0:

1. agree on remaining architecture decisions;
2. create one GitHub issue for Phase 1 Application Foundation and UI Shell;
3. explain the issue and branch workflow in simple Chinese;
4. create only feature/app-shell;
5. implement and review the Phase 1 scope through a pull request.

## 22. Decisions Still Open

Phase 0 deliberately leaves the following questions unresolved:

- future Workspace membership, roles, and personal/laboratory coexistence;
- detailed amendment permissions and formal audit/compliance requirements;
- whether Project needs nesting or a separate experiment-series concept;
- expected offline duration and maximum attachment size;
- attachment sharing, retention, and deletion rules;
- authentication provider and deployment environment;
- PostgreSQL host and object-storage provider;
- the first calculator, workbench, and analysis methods to prioritize;
- unit/ontology libraries and required scientific metadata;
- chart, table, calendar, form, and accessible UI libraries;
- regulatory or institutional requirements;
- Chinese-only versus bilingual first release;
- the evidence threshold that would justify native mobile development.

These questions do not block Phase 0 documentation acceptance. Any item that
changes Phase 1 scope must be decided before the Phase 1 issue is approved.
