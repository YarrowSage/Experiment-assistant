# Data Model

Status: Accepted conceptual model; Phase 1 core tables are implemented through
Alembic revision `0006`, while later domain models remain planned
Last reviewed: 2026-08-20

## 1. Purpose

This document defines domain meaning and relationships before ORM models or
migrations exist. Field lists are the minimum information the architecture must
support, not a final physical schema.

The model prioritizes:

- separation of reusable plans from real execution;
- stable experiment history;
- contextual evidence;
- modular workbench links;
- explicit user-directed analysis;
- future synchronization and multi-user ownership;
- portability from SQLite to PostgreSQL.

## 2. Common Record Conventions

Persisted domain records should normally support:

| Field | Purpose |
| --- | --- |
| id | Stable UUID generated independently of database sequences |
| created_at | UTC creation timestamp |
| updated_at | UTC last-change timestamp |
| revision | Monotonically increasing value for optimistic concurrency |
| deleted_at | Nullable tombstone timestamp when synchronized deletion requires it |
| workspace_id | Ownership boundary on Project and other top-level aggregates when required |
| created_by / updated_by | Nullable actor IDs until authentication exists |

Not every value needs to be visible in the UI. Audit requirements are not yet
accepted, so these fields do not constitute a regulatory audit trail.

Use explicit units, time zones, and enum-like string values. Avoid storing
scientific meaning only in display labels.

## 3. Workspace

### Meaning

Workspace is the top-level ownership container. It may later represent a
personal space or a laboratory/team space.

The first release may create one default Workspace automatically. It does not
need Workspace navigation, membership, accounts, permissions, or collaboration
UI.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| name | Human-readable workspace name |
| kind | default, personal, or laboratory/team when those modes exist |
| status | active or archived |

### Relationships and boundary

- one Workspace has many Projects;
- each Project belongs to exactly one Workspace;
- project-owned Protocols, ExperimentRuns, CalendarEvents, WorkbenchRecords, and
  attachments inherit the Workspace boundary through Project;
- top-level personal/library records may receive a direct workspace_id when
  their module is implemented.

Workspace membership and user roles are future concepts. Workspace does not
imply that authentication or authorization currently exists.

## 4. Scientific Quantity Principle

Scientific quantities must remain parseable. A value such as body weight must
not be stored only as one string:

    "22.3 g"

The conceptual representation separates at least:

    value = 22.3
    unit = g

This applies to concentration, mass, volume, time, dose, body weight,
temperature, cell density, and other measured quantities. Domain models may
later add qualifiers, uncertainty, precision, original/normalized values, or a
measurement method.

The stored numeric type must be chosen for the domain's precision needs. The
unit should use a validated code once a unit system is selected. Phase 0 does
not choose a complex unit library or implement conversion.

Separating value and unit enables future unit validation, unit conversion,
Calculator interoperability, Analysis interoperability, filtering, and export.
A formatted display string may be cached or generated, but it is not the source
of truth.

## 5. Relationship Overview

    Workspace
      └── Project
            ├── Protocol
            │     └── ProtocolVersion
            │           ├── ProtocolStep
            │           ├── related Kit
            │           └── contextual Attachments
            ├── ExperimentRun
            │     ├── exact ProtocolVersion used
            │     ├── RunStepRecord ── RunStepWorkbenchLink ── WorkbenchRecord
            │     ├── Result
            │     ├── Observation
            │     ├── Deviation
            │     ├── NextAction
            │     └── contextual Attachments
            ├── CalendarEvent
            └── WorkbenchRecord

    WorkbenchDefinition ──< WorkbenchRecord

    AnalysisSession
      ├── selected data-source references
      ├── selected variables and roles
      ├── analysis configuration
      ├── chart configuration
      └── generated outputs/attachments

Attachments are independent file metadata records connected through
domain-specific association records.

## 6. Project

### Meaning

A research project groups related protocols, experiment runs, plans, evidence,
and workbench records around a scientific objective.

Examples:

- Ovarian Aging
- PCOS
- Natural Product Nanoparticles

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| workspace_id | Required owning Workspace |
| title | Human-readable project name |
| description | Background and scope |
| objective | Scientific goal or question |
| status | Proposed values: active, on_hold, completed, archived |
| start_date / end_date | Optional planning range |
| tags | Search and organization labels |

### Relationships

- belongs to exactly one Workspace;
- one Project has many Protocols;
- one Project has many ExperimentRuns;
- one Project has many CalendarEvents;
- one Project has many WorkbenchRecords;
- one Project has contextual Attachments;
- one Project may have many AnalysisSessions through their sources.

Nested projects and a separate SubExperiment entity are not decided in Phase 0.
A real need must be demonstrated before adding another hierarchy level.

## 7. Protocol

### Meaning

A Protocol is the stable identity and family of a reusable procedure. The
instructions that can be executed live in immutable ProtocolVersion records.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| project_id | Owning or primary project |
| title | Protocol name |
| status | active, retired, archived |
| current_version_id | Current published/default ProtocolVersion |
| source_template_id | Optional template origin |
| created_from_protocol_id | Optional copy/derivation origin |

### Relationships

- belongs to a Project;
- has many ProtocolVersions;
- creates ExperimentRuns through a specific ProtocolVersion;
- may originate from one Template.

## 8. ProtocolVersion

### Meaning

A ProtocolVersion is one numbered, historically stable definition of how the
Protocol should be performed.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| protocol_id | Parent Protocol |
| version_number | Monotonically increasing user-visible version |
| status | draft, published, superseded, retired |
| description | Scope and overview for this version |
| purpose | Intended experimental purpose |
| precautions | Version-specific safety and procedural cautions |
| change_summary | Why this version differs from the prior version |
| based_on_version_id | Optional predecessor |
| published_at | Time this version became immutable/available |

### Relationships and immutability

- belongs to one Protocol;
- has ordered ProtocolSteps;
- may relate to many Kits;
- may have contextual Attachments;
- may be referenced by many ExperimentRuns.

A draft ProtocolVersion may be edited. Once published or referenced by an
ExperimentRun, the version and all of its ProtocolSteps are immutable. Editing
the procedure creates a new ProtocolVersion with a new version_number.

ExperimentRun must reference protocol_version_id. The relationship, rather than
the current Protocol state, answers which instructions a run used:

    CCK-8 Protocol v1 → Run #001
    CCK-8 Protocol v2 → Run #014

An instruction snapshot on RunStepRecord may assist durable reporting but does
not replace the immutable ProtocolVersion relationship.

## 9. ProtocolStep

### Meaning

A ProtocolStep is one ordered instruction in an immutable ProtocolVersion.

Example:

    Add 10 μL CCK-8 reagent to each well.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| protocol_version_id | Parent ProtocolVersion |
| stable_key | Stable identity within/correlated across versions when useful |
| position | Display/execution order |
| title | Short step label |
| instruction | Full standard instruction |
| estimated_duration | Optional planning estimate |
| timer_mode | None, count_up, countdown, or later accepted value |
| required | Whether normal completion requires this step |
| precautions | Step-specific warnings |
| structured_parameters | Portable JSON for defined values such as volume and unit |

Structured parameters supplement readable instructions; they do not replace
them.

## 10. ExperimentRun

### Meaning

An ExperimentRun represents one real execution.

Example:

    CCK-8 Assay — 2026-08-19 Run #01

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| project_id | Project context |
| protocol_id | Source Protocol identity, optionally denormalized for queries |
| protocol_version_id | Required authoritative ProtocolVersion used by this run |
| title | Human-readable run name |
| run_number | Optional sequence within a project/protocol |
| scheduled_start / scheduled_end | Planning timestamps |
| actual_start / actual_end | Actual execution timestamps |
| status | draft, planned, ready, in_progress, paused, completed, cancelled |
| expectation_met | yes, no, partial, not_assessed |
| completed_at | Completion timestamp |
| completion_note | Optional overall summary |

### Relationships

- belongs to a Project;
- references exactly one immutable ProtocolVersion for protocol-based runs;
- has many RunStepRecords;
- has zero or more Results, Observations, Deviations, and NextActions;
- has contextual Attachments;
- may be linked from CalendarEvents;
- may own or reference WorkbenchRecords;
- may be an AnalysisSession data source.

Changing the source Protocol after the run begins must not mutate the run's
recorded instructions.

## 11. RunStepRecord

### Meaning

A RunStepRecord describes what happened during one step of one ExperimentRun.
It is not a protocol instruction.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| experiment_run_id | Parent run |
| protocol_step_id | Source standard step |
| position | Execution/display order for this run |
| instruction_snapshot | Exact instruction presented during this run |
| status | pending, active, completed, skipped, blocked, failed |
| actual_start / actual_end | Persisted timestamps |
| duration_seconds | Derived or validated cached duration |
| note | What the researcher recorded |
| deviation_summary | Step-specific departure from plan |
| skip_reason | Required when a required step is skipped |
| completed_at | Final step-completion timestamp |

### Relationships

- belongs to one ExperimentRun;
- references one source ProtocolStep;
- has contextual Attachments;
- may link to many WorkbenchRecords through RunStepWorkbenchLink;
- may have step-level Observations or Deviations if the later schema needs
  first-class entries.

The source ProtocolStep is already immutable through ProtocolVersion. The
instruction snapshot provides defense-in-depth for durable reporting. Actual
status, timing, evidence, and deviation remain execution data and never update
the ProtocolStep.

## 12. Why Protocol Is Not ExperimentRun

| Question | Protocol / ProtocolVersion | ExperimentRun |
| --- | --- | --- |
| What does it describe? | Stable procedure family / one immutable plan | What happened once |
| Reusable? | Yes | No |
| Editable for future work? | Create a new ProtocolVersion | Only under lifecycle rules |
| Contains planned steps? | ProtocolVersion owns them | References/snapshots them |
| Contains actual times? | No | Yes |
| Contains results/deviations? | No | Yes |
| Can one create many of the other? | One version can create many runs | One run uses one exact version |

Combining them would cause one of two failures: repeated runs would overwrite
one another, or reusable instructions would be duplicated and drift without a
source.

## 13. Why ProtocolStep Is Not RunStepRecord

| Question | ProtocolStep | RunStepRecord |
| --- | --- | --- |
| Standard instruction | Authoritative | Historical snapshot/reference |
| Actual status | Not applicable | Recorded |
| Actual start/end | Not applicable | Recorded |
| Notes and evidence | General protocol material only | Run-specific |
| Deviation | Not applicable | Recorded |
| Workbench link | Definition may recommend one | Actual record may link one |

Keeping them separate permits a protocol to improve without altering previous
experiment evidence.

## 14. Completed Record Amendment

### Integrity rule

At minimum, ExperimentRun lifecycle distinguishes Draft, Planned, In Progress,
and Completed.

- Draft, Planned, and In Progress records may be edited according to normal
  lifecycle and concurrency rules.
- Completed ExperimentRuns and important completed child records must not be
  changed through an unrecorded in-place overwrite.
- A correction creates an amendment/revision that preserves the original state
  and explains the correction.

### Future amendment information

The physical model may use an immutable revision record, event, or amendment
entity, but it must support:

- target record and prior revision;
- original value/state;
- corrected value/state;
- correction reason;
- modified time;
- actor when identity exists;
- relationship to the superseded revision.

Example:

    Original value: 20 mg/kg
    Corrected value: 25 mg/kg
    Reason: Data entry error

The current product does not claim a complete GLP/GxP audit trail, electronic
signatures, or regulatory compliance. This principle only ensures that the
future data model and API can add transparent corrections without redesigning
completed records.

## 15. Outcome Records

Result, Observation, Deviation, and NextAction are separate concepts so that
search, review, and future collaboration do not depend on one large text field.

### Result

- experiment_run_id;
- title or result type;
- summary;
- structured_value and unit when applicable;
- interpretation written by the user;
- related attachments;
- recorded_at.

### Observation

- experiment_run_id and optional run_step_record_id;
- text;
- category;
- observed_at;
- related attachments.

### Deviation

- experiment_run_id and optional run_step_record_id;
- planned_condition;
- actual_condition;
- reason;
- impact assessment chosen by the user;
- recorded_at.

### NextAction

- experiment_run_id;
- description;
- status;
- optional due date;
- optional linked future run or calendar event;
- rationale.

A completion form may present these concepts together while the underlying model
keeps their meanings distinct.

## 16. Attachment

### Meaning

Attachment stores file identity and provenance, not the file bytes themselves.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| original_name | User-visible filename |
| media_type | Validated MIME type |
| size_bytes | File size |
| checksum_sha256 | Integrity and duplicate-detection value |
| storage_provider | local or future object provider key |
| storage_key | Provider-neutral logical object key |
| state | pending, available, failed, quarantined, deleted |
| captured_at | Optional photo/data capture time |
| uploaded_at | Successful storage time |
| source_device_id | Optional future provenance |
| description | User note |

### Contextual associations

Use explicit association records such as:

- ProjectAttachment;
- ProtocolAttachment;
- ExperimentRunAttachment;
- RunStepAttachment;
- WorkbenchAttachment;
- KitAttachment;
- AnalysisOutputAttachment.

This preserves relational meaning better than one unconstrained
target_type/target_id pair. Shared attachment reuse and deletion rules must be
decided before physical schema implementation.

## 17. CalendarEvent

### Meaning

A research-aware scheduled item.

### Minimum conceptual fields

- title and description;
- event_type such as planned_experiment, deadline, reminder, or workbench_task;
- planned_start and planned_end with time zone;
- all_day flag;
- status;
- optional recurrence rule, deferred until recurrence requirements are known;
- reminder configuration;
- optional project_id;
- optional protocol_id;
- optional experiment_run_id;
- optional workbench task/record reference.

At least one meaningful research context or an explicitly allowed general event
should be required. The calendar must not duplicate experiment status.

## 18. WorkbenchDefinition

### Meaning

A versioned description of a structured workbench type.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| key | Stable key such as animal or cell |
| version | Schema/behavior version |
| title | User-facing name |
| description | Intended domain |
| domain_model_key | Registered concrete domain model/adapter |
| extension_schema | Optional JSON schema for limited extension metadata |
| display_schema | UI hints that do not contain domain truth |
| status | active, deprecated, retired |
| migration_key | Optional approved record migration path |

Built-in definitions will normally live in code and be registered at build
time. Persisted records retain definition key and version.

## 19. WorkbenchRecord

### Meaning

The common parent/context record for one workbench activity. It owns shared
identity, lifecycle, links, and attachments; it is not a universal container for
all scientific fields.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| workbench_definition_key | Definition identity |
| workbench_definition_version | Schema version used |
| workbench_type | Stable category for search and routing |
| title | User-visible record title |
| extension_metadata | Optional validated JSON for limited flexible metadata |
| recorded_at | Scientific observation/measurement time |
| project_id | Project context |
| experiment_run_id | Optional owning run context |

WorkbenchRecord has contextual Attachments. It may connect to a
RunStepRecord through RunStepWorkbenchLink.

A concrete Workbench may own normalized domain entities linked to
WorkbenchRecord. Repeated, relational, time-series, queryable, or
scientifically meaningful data should use those entities instead of being
hidden in extension_metadata.

JSON remains suitable for UI configuration, display hints, flexible metadata,
analysis configuration, chart configuration, and small extension fields. It
must not be the only storage mechanism for Animal, Cell, or Analysis data.

## 20. RunStepWorkbenchLink

### Meaning

An integration record relating evidence in a WorkbenchRecord to an actual
RunStepRecord.

### Minimum conceptual fields

- run_step_record_id;
- workbench_record_id;
- relationship_type such as produced_by, measured_during, or supports;
- optional display_summary;
- linked_at;
- linked_by when identity exists.

The link stores no copy of the Workbench domain payload. Deleting or editing
either side must follow explicit lifecycle rules. A completed experiment should
retain enough information to report a missing or archived linked record rather
than silently dropping the relationship.

## 21. Animal Workbench Record Direction

The Animal workbench is designed for relational and time-series data. Its future
domain model may expand from the common record:

    WorkbenchRecord
      └── AnimalExperiment
            ├── AnimalSubject
            ├── AnimalMeasurement
            └── AnimalDoseRecord

Domain concepts may include:

- animal ID, species, strain, sex, age, and group;
- body weight, food/water intake, condition, glucose, temperature, and custom
  measurements;
- drug, dose with unit, route, date, and time;
- tumor length, width, and derived volume;
- survival, behavior, organ weight, photos, notes, and files.

AnimalSubject owns identity/group attributes. AnimalMeasurement records subject,
timestamp, measurement type, numeric value, unit, method, and provenance.
AnimalDoseRecord records drug, numeric dose, unit, route, date/time, and subject
or group. Exact tables are deferred, but these records must not be reduced to
one WorkbenchRecord JSON document.

## 22. Cell Workbench Record Direction

Cell Workbench may likewise define a concrete model such as CellExperiment,
CellCulture, CellTreatment, Plate, Well, and CellMeasurement beneath a common
WorkbenchRecord. Future structured concepts may include:

- cell line and passage;
- culture medium and incubator conditions;
- confluence;
- plate format and well identity;
- seeding density with unit;
- treatment, concentration, duration, and controls;
- images and notes;
- experiment presets such as CCK-8, MTT, EdU, colony formation, scratch assay,
  Transwell, and live/dead.

Built-in flows are copied and customized into user protocols. They are not
immutable enforced procedures. Concentration, duration, density, volume, and
other quantities use separate numeric value and unit fields. Repeated plate,
well, treatment, and measurement data must not exist only in a generic JSON
payload.

## 23. Kit

### Minimum conceptual fields

- kit name;
- manufacturer;
- catalog number;
- lot number;
- expiry date;
- storage requirements;
- notes;
- status;
- manual attachment;
- other attachments.

A Kit may relate to many Protocols and a Protocol may relate to many Kits. The
relationship may include usage notes or a kit-specific protocol reference.

## 24. Template

### Minimum conceptual fields

- title and description;
- category;
- template_type;
- ownership_type: built_in or user;
- version;
- preview summary;
- template content;
- source/attribution;
- status.

Using a template creates an independent editable user object and records its
origin. Later changes to the template do not silently alter the copied Protocol.

## 25. AnalysisSession

### Meaning

AnalysisSession preserves the user's explicit analytical decisions and the
provenance of generated outputs.

### Minimum conceptual fields

| Field | Meaning |
| --- | --- |
| title | User-visible analysis name |
| status | draft, configured, previewed, confirmed, exported, archived |
| data_sources | Selected source adapter keys and record/file references |
| dataset_selection | Selected table, sheet, range, or dataset |
| selected_variables | Included variable identifiers |
| x_variable | User-selected X |
| y_variables | User-selected Y values |
| group_variables | User-selected grouping |
| filters | Explicit inclusion/exclusion rules |
| transformations | Normalization or preprocessing choices |
| analysis_tool_key/version | Selected tool and implementation version |
| analysis_configuration | Method parameters |
| chart_type | User-selected chart |
| chart_configuration | Axes, labels, legend, ranges, markers, lines |
| input_fingerprint | Checksum/version set for reproducibility |
| output_summary | Structured preview/result metadata |
| confirmed_at | User confirmation time |

Outputs are stored as structured results and/or attachments. Source data is
never modified by analysis.

The application may suggest mappings, but suggestions must be visibly
unconfirmed. No inferred X, Y, group, control, statistical method, or chart is
saved as the user's decision without explicit confirmation.

## 26. Status and Transition Rules

Statuses are scoped per entity. A shared UI vocabulary may map them to colors,
but the database must not use one unrestricted status enum for every module.

Examples of guarded transitions:

- a run cannot become in_progress without a stable step set;
- completing a step records an end timestamp;
- reopening a completed run requires an explicit amendment policy;
- retiring a Protocol prevents new runs but does not hide old runs;
- deleting a Template never deletes Protocols copied from it;
- deprecating a WorkbenchDefinition does not invalidate historical records;
- confirming an AnalysisSession freezes its input fingerprint and configuration
  for that result revision.

Final transition rules are Phase 2+ implementation decisions.

## 27. Synchronization Semantics

Future synchronization depends on:

- client-generated UUIDs;
- revision numbers for optimistic concurrency;
- server-assigned canonical updated timestamps;
- tombstones for deletion propagation;
- deterministic ordering fields for steps;
- idempotent mutation identifiers;
- attachment upload states and checksums;
- no reliance on local absolute file paths.

Server state is authoritative once synchronization exists. Offline clients keep
a cache and an operation queue, not a permanently independent database model.

## 28. SQLite to PostgreSQL Constraints

The first physical schema should:

- enable and test foreign-key enforcement in SQLite;
- use migrations from its first revision;
- avoid SQLite-only implicit typing;
- use portable UTC timestamp serialization;
- use consistent UUID representation;
- validate structured JSON at the application boundary;
- avoid relying on PostgreSQL-only JSON operators in core queries;
- define uniqueness and deletion behavior explicitly;
- test ordering and case-sensitive search behavior across both databases.

PostgreSQL migration is an operational cutover, not an excuse to redesign all
domain entities.

## 29. Open Data-model Decisions

- whether Project needs nesting or a separate SubExperiment/ExperimentSeries;
- rules for ad-hoc runs without a Protocol;
- detailed amendment permissions, correction workflow, and regulatory scope;
- whether one Attachment may be linked to multiple contexts;
- exact normalized entities and extension-field boundaries for each Workbench;
- recurrence representation for planner events;
- future Workspace membership, roles, and personal/laboratory coexistence;
- retention, audit, and deletion requirements;
- unit and ontology libraries;
- analysis result versioning and formal statistical provenance.

These must be decided in the phase that first needs them; none is implemented
in Phase 0.
