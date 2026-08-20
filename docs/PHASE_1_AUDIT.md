# Phase 1 Repository Audit and Issue Plan

Status: Audit complete; P1-01 through P1-12 implemented on reviewed feature
branches/commits and awaiting final Phase 1 pull-request review
Audit baseline: `main` at `c6b8f71e7022705a87b389d68f9bac67e144d151`
Audit date: 2026-08-19

## 1. Repository Baseline

Before P1-01, the tracked repository contained only:

```text
README.md
LICENSE
AGENTS.md
docs/
  ARCHITECTURE.md
  DATA_MODEL.md
  DEVELOPMENT_GUIDE.md
  MODULE_DESIGN.md
  MULTI_DEVICE_STRATEGY.md
  PRODUCT_SPEC.md
  ROADMAP.md
  UI_DESIGN_SYSTEM.md
```

The `main` worktree was clean and synchronized with `origin/main`. PR #1 was
the latest merged change. There were no application, database, dependency,
environment, build, or test files.

## 2. Phase 0 Material Reviewed

The audit read all tracked product and architecture material:

- `README.md` and `AGENTS.md`;
- product scope and scientific integrity rules in `PRODUCT_SPEC.md`;
- modular monolith, API, persistence, Workspace, and synchronization boundaries
  in `ARCHITECTURE.md`;
- entity meaning and relationships in `DATA_MODEL.md`;
- module ownership and extension rules in `MODULE_DESIGN.md`;
- desktop, mobile/PWA, and future synchronization responsibilities in
  `MULTI_DEVICE_STRATEGY.md`;
- design tokens, navigation hypotheses, accessibility, and responsive behavior
  in `UI_DESIGN_SYSTEM.md`;
- stack, workflow, dependency, migration, and test practices in
  `DEVELOPMENT_GUIDE.md`;
- the accepted Phase 0 delivery order in `ROADMAP.md`.

## 3. Implementation and Dependency State

At the audit baseline:

- frontend implementation: none;
- backend implementation: none;
- database schema or migrations: none;
- JavaScript/Python dependency manifests or lock files: none;
- CI, formatter, linter, type-checker, and tests: none;
- runtime data, secret, or accidental generated files: none.

P1-01 therefore begins from a documentation-only repository rather than
adapting an existing application.

## 4. Instruction Reconciliation

No technical architecture conflict requires a stack change. The following
planning or terminology differences are resolved explicitly:

1. The Phase 0 roadmap used “Phase 1” for the shell only and placed the generic
   experiment core in a later phase. The newly approved Phase 1 instruction
   expands the phase into twelve reviewed issues. This changes scheduling, not
   the accepted modular architecture or scientific integrity rules. The GitHub
   issue sequence below is authoritative for current Phase 1 execution.
2. Phase 0 requires versioned routes such as `/api/v1`; examples in the new
   instruction that omit the version are interpreted as conceptual route
   groups. Implemented endpoints remain versioned.
3. Phase 0 names an actual execution `ExperimentRun` and a step execution
   `RunStepRecord`. These accepted terms take precedence over the shorthand
   `Experiment` and `ExperimentStepRun` in the new instruction.
4. Phase 0 requires every Project to belong to a Workspace. P1-03 created the
   automatic Default Workspace boundary without accounts, permissions, or
   Workspace UI.
5. P1-01 configured SQLAlchemy and Alembic to verify the persistence boundary
   without an empty business migration. P1-03 then introduced the first real
   schema and Alembic revision.
6. ProtocolVersion immutability, completed-record amendments, structured
   Workbench domain data, and separate scientific values/units remain mandatory
   and are not weakened by the new issue breakdown.

## 5. Final Phase 1 Issues

| Order | Issue | Purpose |
| --- | --- | --- |
| 1 | [#2 P1-01](https://github.com/YarrowSage/Experiment-assistant/issues/2) | Repository and application foundation |
| 2 | [#3 P1-02](https://github.com/YarrowSage/Experiment-assistant/issues/3) | Design system and responsive app shell |
| 3 | [#4 P1-03](https://github.com/YarrowSage/Experiment-assistant/issues/4) | Default Workspace boundary and Project domain |
| 4 | [#5 P1-04](https://github.com/YarrowSage/Experiment-assistant/issues/5) | Generic ExperimentRun domain |
| 5 | [#6 P1-05](https://github.com/YarrowSage/Experiment-assistant/issues/6) | Protocol and immutable versioning engine |
| 6 | [#7 P1-06](https://github.com/YarrowSage/Experiment-assistant/issues/7) | Experiment execution engine |
| 7 | [#8 P1-07](https://github.com/YarrowSage/Experiment-assistant/issues/8) | Notes, attachments, and activity log |
| 8 | [#9 P1-08](https://github.com/YarrowSage/Experiment-assistant/issues/9) | Completion and amendment system |
| 9 | [#10 P1-09](https://github.com/YarrowSage/Experiment-assistant/issues/10) | Home dashboard |
| 10 | [#11 P1-10](https://github.com/YarrowSage/Experiment-assistant/issues/11) | Honest placeholder product areas |
| 11 | [#12 P1-11](https://github.com/YarrowSage/Experiment-assistant/issues/12) | PWA and responsive polish |
| 12 | [#13 P1-12](https://github.com/YarrowSage/Experiment-assistant/issues/13) | Phase 1 integration QA |

## 6. Actual Delivery Order

The issues were implemented in the listed order. The reviewed plan allowed two
controlled scheduling exceptions:

- P1-10 can begin after P1-02 but should integrate only after core routes are
  stable.
- P1-11 can establish manifest work after P1-02, but mobile execution QA waits
  for P1-06.

P1-01, P1-02, and P1-03 were reviewed and merged independently. Under the
subsequent explicit Phase 1 Completion instruction, P1-04 through P1-12 use
independent scoped commits on `feature/phase1-completion` and one final Draft
Pull Request. This approved exception does not combine their implementation
scope or authorize Phase 2 work.

## 7. P1-01 Foundation Choices

- Node.js 24 LTS and pnpm 11 provide the JavaScript workspace.
- Next.js uses the App Router with strict TypeScript and ESLint.
- Python 3.12 and uv provide the API environment and lock file.
- FastAPI owns the HTTP boundary under `/api/v1`.
- SQLAlchemy owns database connectivity and enables SQLite foreign keys.
- Alembic points at the shared declarative metadata boundary but has no business
  revision yet.
- SQLite remains a local backend-owned development database.
- Continuous integration repeats frontend build checks and backend lint, type,
  test, and migration-configuration checks.

These choices implement, rather than redesign, the accepted Phase 0 direction.

## 8. P1-03 Status Vocabulary Note

Issue #4 and its accepted implementation instruction freeze Project statuses as
`planning`, `active`, `paused`, `completed`, and `archived`. This supersedes the
older conceptual `on_hold` proposal in `DATA_MODEL.md`; P1-03 does not implement
both spellings or silently map between them.
