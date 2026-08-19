# AGENTS.md

These rules apply to the entire repository. They are intended for both human
contributors and coding agents.

## Product State

- Phase 0 product and architecture definition is accepted; application
  implementation has not started.
- Do not present planned capabilities as implemented.
- Do not begin a later roadmap phase without explicit user approval.
- During Phase 0, do not create application code, business database tables,
  deployment resources, authentication, synchronization, or production
  services.

## Scope and Change Discipline

- Respect the exact task scope and make small, incremental changes.
- Read the relevant documentation and existing code before modifying it.
- Do not perform unrelated refactors, formatting sweeps, or dependency upgrades.
- Prefer the smallest change that satisfies the accepted requirement.
- Preserve existing user work and unrelated changes in a dirty worktree.
- Explain material design or architectural changes in simple language for the
  beginner maintainer.

## Architecture Boundaries

- Keep UI components independent from the concrete database implementation.
- UI clients must use application/API contracts rather than query database files
  directly.
- Keep domain rules separate from web framework, ORM, storage, and export code.
- Do not tightly couple Workbench modules to the Experiment Management core.
  Connect them through stable identifiers, link records, and application
  services.
- Do not place module-specific fields into generic core entities merely for
  convenience.
- New calculators, workbenches, analysis tools, templates, and export formats
  should normally be added through their module registries or interfaces, not by
  rewriting the application core.
- Avoid runtime plugin loading, a plugin marketplace, or complex dependency
  injection unless a later approved requirement proves it necessary.
- Consider future synchronization whenever changing identifiers, timestamps,
  deletion behavior, ownership, ordering, or mutable records.
- Preserve Workspace as the ownership boundary. The first release may use one
  default Workspace without a Workspace UI, but Projects must not be modeled as
  permanently global records.
- Do not use one generic JSON payload as the sole domain model for every
  Workbench. The framework owns common metadata and contracts; Animal, Cell, and
  other Workbenches may own normalized domain entities.

## Data and Migration Safety

- Preserve data compatibility unless an approved migration explicitly changes
  it.
- Every database schema change requires a reviewed migration; never edit a
  deployed schema manually.
- Use stable UUID identifiers and UTC timestamps at storage/API boundaries unless
  an accepted decision supersedes this rule.
- Preserve historical experiment meaning: a completed run must not silently
  change when its source protocol is edited.
- A protocol-based run must reference the exact immutable ProtocolVersion it
  used. Editing a published/used version creates a new version.
- Do not silently overwrite completed scientific records. Future corrections
  must preserve the original value, corrected value, reason, and modification
  time through an amendment/revision mechanism.
- Store attachment metadata separately from file bytes and access files through
  the storage abstraction.
- Never commit runtime databases, uploads, exports, backups, credentials, API
  keys, tokens, private research data, or participant/animal identifiers from
  real studies.
- Destructive data migrations require a backup plan, verification plan, and
  rollback strategy.

## Dependencies and Code Quality

- Avoid unnecessary dependencies. Record why each material dependency is needed.
- Prefer understandable, typed, testable code over clever abstractions.
- Keep public module interfaces small and documented.
- Validate data at trust boundaries such as API requests, file ingestion, and
  analysis configuration.
- Do not use floating-point shortcuts for scientific values when precision,
  units, or traceability require explicit handling.
- Store scientific quantities as a parseable value and unit, not only as one
  display string such as "22.3 g".
- Keep scientific transformations reproducible by recording inputs, units,
  parameters, tool versions, and user selections.

## Testing and Verification

- Run tests and checks appropriate to the changed scope.
- Add or update tests for behavior changes when a development phase permits
  code.
- Never claim a test passed unless it was actually run and passed.
- Report skipped checks, failures, unavailable tools, and limitations honestly.
- Documentation-only changes must at minimum be checked for broken relative
  links, malformed Markdown, inconsistent terminology, and accidental claims
  that planned work already exists.

## Security and Privacy

- Never commit secrets or include them in examples, logs, screenshots, fixtures,
  or issue text.
- Use synthetic data in tests and documentation.
- Treat research records and attachments as private by default.
- Authentication-ready does not mean authentication is implemented. Do not
  invent security guarantees.
- File uploads must eventually be validated for size, type, authorization, and
  safe storage before they are considered production-ready.

## GitHub Workflow

- Use one accepted issue or narrowly scoped task per feature branch.
- Prefer branch names such as feature/app-shell or
  feature/experiment-core.
- Before committing, review the diff and run relevant checks.
- Write commits that describe one coherent change.
- Push a feature branch and open a pull request; do not develop directly on
  main.
- Review and resolve feedback before merge. Keep main stable.
- Do not create commits, push branches, open pull requests, or merge unless the
  user has authorized that step.

## Documentation Responsibilities

- Update product and architecture documents when an accepted decision changes.
- Keep terms consistent with docs/DATA_MODEL.md.
- Clearly label decisions as proposed, accepted, implemented, deferred, or
  unable to verify.
- Keep README status accurate and separate current capabilities from the
  roadmap.
