# Experiment Assistant Roadmap

Status: Phase 1 implementation is complete on Draft PR #17 and awaiting final review; Phase 2 has not started

Last reviewed: 2026-08-20

This roadmap records the accepted product-phase sequence. It supersedes the
older Phase 0 numbering that described Phase 1 as an application shell and
moved the generic experiment engine to a later phase. The implemented Phase 1
scope and issue history are recorded in [PHASE_1_AUDIT.md](PHASE_1_AUDIT.md).

## 1. Roadmap Rules

- A phase begins only after explicit approval.
- Each scoped change uses a GitHub issue, a feature branch, review, and CI.
- `main` remains stable; planned features are never described as implemented.
- A phase is complete only after its acceptance criteria and relevant tests
  pass and its pull request is accepted.
- Later-phase concerns do not authorize implementation in the current phase.
- Architecture documents are updated when accepted evidence changes a decision.

## 2. Product Sequence

```text
Phase 0  Product definition and architecture
   ↓
Phase 1  Application foundation and generic experiment engine
   ↓
Phase 2  Planner and core-engine refinements/templates
   ↓
Phases 3–6  Structured scientific Workbenches
   ↓
Phase 7  User-controlled Analysis
   ↓
Phase 8  Resources and product-wide refinement
```

The generic scientific-record lifecycle precedes specialized Workbenches.
Analysis follows the Workbenches because it needs stable, structured source
models. Hosted collaboration and robust offline synchronization remain later
cross-cutting work because they require settled identity, authorization, and
conflict semantics.

## 3. Phase 0 — Product Definition and Architecture

### Goal

Define product scope, multi-device strategy, data meaning, module boundaries,
UI principles, technical direction, development rules, and roadmap.

### Current state

Completed and merged. Phase 0A added the Workspace ownership boundary,
immutable Protocol versions, amendment-ready completed records, structured
Workbench data rules, and parseable scientific quantity/unit principles.

## 4. Phase 1 — Application Foundation & Generic Experiment Engine

### Goal

Deliver a maintainable application foundation and the minimum scientifically
coherent generic experiment lifecycle.

### Implemented scope

- Next.js, React, TypeScript, FastAPI, SQLAlchemy, Alembic, SQLite, `pnpm`, and
  `uv` foundations with CI and strict validation;
- responsive application shell, shared design system, route shells, and PWA
  baseline;
- one automatic default Workspace boundary without accounts or Workspace UI;
- Project records and contextual Project views;
- Protocol, immutable published ProtocolVersion, ordered ProtocolStep, and
  Protocol snapshot execution;
- protocol-free draft/planning records, with an exact published
  ProtocolVersion required before execution;
- Experiment lifecycle, persisted execution timestamps, RunStepRecord
  snapshots, pause/resume, and explicit completion;
- Notes, attachments, activity history, FileStorage abstraction, and completed
  record amendments;
- Home dashboard, basic Planner visibility, honest placeholder product areas,
  responsive polish, migrations, and integration QA.

### Boundary

Phase 1 does not implement accounts, collaboration, specialized Workbench
domain models, statistical analysis, a full compliance audit system, or robust
offline synchronization. Draft PR #17 must be reviewed and merged before any
Phase 2 work begins.

## 5. Phase 2 — Planner + Core Experiment Engine Refinements/Templates

### Goal

Make generic experiment planning and reuse efficient without introducing a
specialized scientific domain model.

### Planned scope

- Today, This Week, and Calendar planning views tied to real records;
- scheduling, rescheduling, deadlines, and simple reminders with accessible
  non-drag alternatives;
- accepted refinements to Project, Protocol, Experiment, execution, amendment,
  evidence, backup, and filtering workflows;
- safe Protocol duplication and reusable template foundations;
- a reviewed starter set of templates and calculator/resource integrations
  only where explicitly accepted;
- stronger recovery and data-portability checks before real records are trusted.

Recurring scheduling, external calendar sync, collaboration, and an undefined
ad-hoc protocol-free execution model are not implied by this phase.

## 6. Phase 3 — Animal Workbench

### Goal

Support validated longitudinal animal-experiment recording through structured
domain models linked to generic Experiments.

### Planned progression

- animal identity, grouping, and study context;
- body weight and general-condition measurements;
- administration/dose records with structured quantities and units;
- photos, notes, mobile rapid entry, and selected reviewed extensions.

Ethics, privacy, identifiers, retention, and institutional requirements must be
reviewed before real-study use.

## 7. Phase 4 — Cell Workbench

### Goal

Support structured cell culture, passage, treatment, and assay records while
reusing the generic Experiment lifecycle.

### Planned progression

- cell-line and passage context;
- culture and treatment conditions;
- concentration and cell-density quantities with explicit units;
- photos, observations, and reviewed assay presets.

## 8. Phase 5 — Plate Workbench

### Goal

Provide reusable structured plate layouts, well-level assignments, treatments,
and readout provenance without hiding scientific data in a universal JSON blob.

### Planned progression

- plate formats and layout definitions;
- well groups, samples, controls, treatments, and replicate structure;
- links to Experiment steps, files, measurements, and later Analysis inputs;
- efficient desktop and mobile review/editing patterns.

## 9. Phase 6 — Chromatography Workbench

### Goal

Record chromatography runs and fractions with structured method, sample,
collection, and attachment context.

### Planned progression

- run/sample/method metadata;
- fractions and collection records;
- chromatogram and instrument-file attachments;
- structured source adapters for later Analysis and Export.

Instrument integrations and vendor-specific parsing require separate review.

## 10. Phase 7 — Analysis

### Goal

Implement user-directed, reproducible data selection, analysis,
visualization, and export.

### Planned progression

- source adapters for generic Experiments, Workbenches, and validated files;
- Datasets and explicit variable/group/control roles;
- General Analysis, Guided Analysis, Saved Analyses, and Recipes;
- a small validated set of charts and methods with provenance;
- preview, confirmation, reproducibility, and export integration.

No method, group, control, X, Y, exclusion, or chart may be silently treated as
the researcher's choice.

## 11. Phase 8 — Resources + Final Product Polish

### Goal

Complete shared research resources and harden the product-wide experience.

### Planned scope

- Calculators, Templates, Kits & Manuals, and Favorites;
- reviewed unit validation/conversion and calculator interoperability;
- product-wide search, filters, and findability refinements;
- notification and reminder refinements where accepted;
- export, backup/restore, attachment integrity, and storage-management polish;
- accessibility, performance, localization, weak-network, and installed-PWA QA;
- accepted offline-related improvements that are safe for the settled data
  lifecycle.

“Final polish” does not automatically authorize every item above. Each still
requires an accepted issue and bounded implementation plan.

## 12. Cross-cutting Later Concerns

The following architecture concerns remain important but are not assigned new
conflicting product-phase numbers:

- accounts, authentication, authorization, Project membership, and personal
  versus laboratory Workspace rules;
- PostgreSQL, object storage, hosted deployment, and secure multi-device server
  authority;
- sync metadata, change feeds, offline caches, queued mutations, attachment
  retry/resume, and conflict-resolution UI;
- formal retention, deletion, audit, GLP/GxP, privacy, and institutional rules;
- background jobs and large export/import workflows;
- narrow, reviewable AI assistance with provider, privacy, cost, failure, and
  evaluation decisions;
- native iOS/Android evaluation if evidence shows that PWA capabilities are
  insufficient.

If one of these becomes urgent, it must be explicitly scoped and approved
without renumbering or silently replacing the canonical eight product phases.
AI must never silently change completed records or choose scientific analyses.
Native clients, if approved, must reuse the same API and scientific semantics.

## 13. Decisions Still Open

- future Workspace membership, roles, and personal/laboratory coexistence;
- amendment permissions and any formal audit/compliance level;
- Project nesting or an experiment-series concept;
- offline duration, attachment size, sharing, retention, and deletion rules;
- authentication provider, deployment environment, PostgreSQL host, and object
  storage provider;
- priority templates, calculators, Workbench fields, and analysis methods;
- unit and ontology libraries and required scientific metadata;
- localization strategy and native-mobile evidence threshold.

These questions do not authorize Phase 2. The next action is final review and
merge of Phase 1 Draft PR #17, followed by an explicit decision on Phase 2.
