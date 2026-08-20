# Module Design

Status: Accepted module boundaries; Phase 1 Project, Protocol, ExperimentRun,
execution, evidence, and amendment modules are implemented
Last reviewed: 2026-08-20

## 1. Design Objective

Experiment Assistant should grow by adding cohesive modules behind stable
contracts. Modularity does not mean microservices, dynamic plugins, or a
marketplace. The early product is a modular monolith.

Each module should define:

- the domain concepts it owns;
- use cases it exposes;
- invariants it protects;
- events or read models it publishes;
- integration contracts it consumes;
- data it must not own.

## 2. Module Map

    Experiment Assistant

    Core Services
      ├── API and application context
      ├── Data access contracts
      ├── File storage
      ├── Search
      ├── Export orchestration
      ├── Backup
      ├── Settings
      └── Shared UI

    Product Modules
      ├── Experiment Management
      ├── Planner and Calendar
      ├── Calculator Center
      ├── Workbench System
      ├── Analysis
      ├── Template Library
      ├── Kits and Manuals
      └── Export System

Integration code connects modules without allowing one module to reach into
another module's internal repository.

## 3. Experiment Management

### Owns

- Project;
- Protocol, immutable ProtocolVersion, and version-owned ProtocolStep;
- ExperimentRun and RunStepRecord;
- Result, Observation, Deviation, and NextAction;
- experiment lifecycle and history;
- experiment-specific attachment associations.

### Primary use cases

- create and update a project;
- create, copy, retire, and view a protocol;
- draft, publish, and supersede protocol versions;
- order and edit steps only inside a draft ProtocolVersion;
- create or schedule a run from a protocol revision;
- start, pause, resume, cancel, and complete a run;
- start, complete, skip, or block a run step;
- record notes, observations, deviations, and next actions;
- attach evidence and link workbench records;
- view immutable historical context.

### Protects

- Protocol is never the same record as ExperimentRun;
- every protocol-based ExperimentRun references the exact immutable
  ProtocolVersion used;
- ProtocolStep is never the same record as RunStepRecord;
- a completed run retains the instructions it used;
- step ordering is deterministic;
- status transitions are valid;
- actual times are execution data, not protocol data.

### Does not own

- calendar rendering or reminders;
- WorkbenchRecord structured data;
- file bytes;
- export rendering;
- analysis algorithms.

## 4. Planner and Calendar

### Owns

- CalendarEvent;
- planning views and filters;
- reminder configuration when implemented;
- planner-specific status such as scheduled or rescheduled.

### Consumes

Stable references and display summaries from Projects, Protocols,
ExperimentRuns, and Workbench tasks.

### Primary use cases

- plan an experiment or task;
- show Today, This Week, and Calendar views;
- reschedule an event;
- navigate from an event to its research object;
- reflect linked run status without duplicating its source of truth.

### Boundary rule

Planner may request that Experiment Management create a planned run through a
public application service. It may not create ExperimentRun rows directly.

Recurrence, external calendar sync, and background notifications are deferred
until their requirements are known.

## 5. Calculator Center

### Purpose

Provide reliable, discoverable scientific calculators without adding each
calculator to application-core conditionals.

### Calculator definition contract

Each calculator conceptually supplies:

| Contract item | Purpose |
| --- | --- |
| key | Stable machine identifier |
| version | Formula/behavior version |
| title/category | Catalog presentation |
| description | Intended use |
| input schema | Required values, types, units, and ranges |
| output schema | Named outputs and units |
| calculate | Deterministic transformation |
| assumptions | Scientific caveats |
| examples | Reviewable known cases |
| tests | Formula, units, bounds, and error behavior |

Quantity-bearing inputs and outputs expose separate numeric value and unit
fields. A formatted string such as "22.3 g" is presentation, not the only
machine-readable calculator input.

The API validates a calculation request against the selected definition and
returns outputs plus calculator version and assumptions.

### Planned calculator families

- C1V1 = C2V2;
- molar and mass concentration;
- solution preparation;
- molecular weight;
- serial dilution;
- cell seeding;
- animal dose conversion;
- BCA;
- qPCR;
- standard curve.

This list is planned, not implemented or guaranteed for the first calculator
release.

### Extension rule

Adding a calculator should normally require:

1. one calculator definition;
2. formula and unit tests;
3. catalog registration;
4. optional presentation metadata.

No runtime loading, arbitrary user code, or calculator-specific database table
is required in the early architecture.

## 6. Workbench System

### Purpose

A Workbench is a structured recording, operation, and data-management workspace
for a class of laboratory activity.

### Owns

- WorkbenchDefinition;
- WorkbenchRecord;
- common metadata validation and definition versioning;
- workbench-specific views and application services;
- workbench attachment associations.

### Framework contract

A workbench definition conceptually supplies:

- stable type key and version;
- title and purpose;
- concrete domain-model/adapter key;
- optional schema for limited extension metadata and UI configuration;
- commands and validation rules;
- summary/read-model builder;
- optional time-series or table-view capability;
- supported export source providers;
- supported analysis data-source adapter;
- migration policy for its own records.

Definitions are compiled and registered with the application. They are not
downloaded or executed as third-party plugins.

### Structured-data boundary

The framework owns common WorkbenchRecord metadata, lifecycle, attachments,
links, and interfaces. It does not force every scientific domain into one
generic JSON payload.

A concrete Workbench may own normalized entities:

    WorkbenchRecord
      └── AnimalExperiment
            ├── AnimalSubject
            ├── AnimalMeasurement
            └── AnimalDoseRecord

Cell Workbench may similarly own CellExperiment, CellCulture, CellTreatment,
and CellMeasurement records. Plate/Well structure belongs to Plate Workbench.
Analysis keeps its user selections and outputs in its own AnalysisSession and
analysis domain model.

JSON is allowed for UI configuration, display hints, flexible metadata,
analysis configuration, chart configuration, and limited extension fields. It
must not be the sole representation of repeated, relational, time-series,
queryable, or scientifically meaningful Animal, Cell, Plate, or Chromatography
data. Analysis is a separate module and likewise owns its structured data.

### Experiment link

WorkbenchRecord remains the common linked parent. RunStepWorkbenchLink
associates it with a RunStepRecord, while concrete domain data stays owned by
the specific Workbench.

    ExperimentRun
      └── RunStepRecord
            └── RunStepWorkbenchLink
                  └── WorkbenchRecord

The experiment module may display a stable workbench summary and link. It must
not copy Animal, Cell, Plate, or Chromatography domain data into RunStepRecord.

### Accepted V1 Workbench set

- Animal Workbench;
- Cell Workbench;
- Plate Workbench;
- Chromatography Workbench.

These are exactly the four V1 Workbenches. Analysis is a separate top-level
product module because its lifecycle and provenance rules differ.

## 7. Animal Workbench

Status: planned scope only.

### Intended capabilities

- animal identity: ID, species, strain, sex, age, group;
- longitudinal measurements: weight, intake, condition, and custom values;
- administration: drug, dose, unit, route, date, and time;
- photos, notes, and files;
- later measurements such as tumor dimensions, glucose, temperature, survival,
  organ weight, and behavior.

### Design principles

- time is a primary dimension;
- every measurement has subject, timestamp, value, unit, and provenance;
- custom measurements can extend the system without corrupting standard fields;
- derived values such as tumor volume retain formula/version information;
- mobile input supports rapid subject-by-subject recording;
- desktop views support longitudinal tables, quality checks, and export.

The normalization strategy for high-volume measurements is deferred to the
Animal Workbench phase, but subjects, longitudinal measurements, and dose
records must not be stored only as one generic JSON document.

## 8. Cell Workbench

Status: planned scope only.

### Intended capabilities

- cell line, passage, medium, confluence, and incubator conditions;
- plate format, wells, seeding density, treatment, concentration, and duration;
- images and notes;
- customizable workflows for CCK-8, MTT, EdU, colony formation, scratch assay,
  Transwell, and live/dead experiments.

### Built-in flow rule

    Built-in Template
        ↓ Copy
    Editable User Protocol
        ↓ Confirm
    ExperimentRun

Users must be able to adapt brand, kit, cell type, concentration, time, and
laboratory SOP. Built-in templates never become enforced immutable procedures.
Repeated cell, treatment, and measurement data may use concrete Cell Workbench
entities rather than a universal Workbench JSON record. Plate and well
structure remains owned by the separate Plate Workbench.

## 9. Plate Workbench

Status: planned scope only.

Plate Workbench owns reusable plate layouts, well identities, sample/control
assignments, treatments, replicate structure, and plate-level readout
provenance. Cell and other experiments link to these structured records rather
than owning duplicate Plate/Well data.

## 10. Chromatography Workbench

Status: planned scope only.

HPLC and UPLC are the first priority. The domain architecture must remain
extensible to later, separately accepted GC, GC-MS, LC-MS, LC-MS/MS, and custom
chromatography types.

The primary record hierarchy is:

    Chromatography Experiment
      └── Method
            └── Batch/Run
                  └── Injection

The structured direction includes standards/reference substances, calibration,
samples and sample preparation, instrument and column profiles, method
parameters, pressure/temperature/time conditions, injection sequence, raw
chromatogram or file evidence, and peaks/results. System suitability, QC, and
validation records are optional reviewed capabilities.

Fraction collection is not the primary Phase 6 model. Fractions may be added as
a future optional extension only if separately accepted.

## 11. Analysis

### Owns

- AnalysisSession;
- data-source adapter registry;
- analysis-tool registry;
- chart-definition registry;
- preview and confirmation lifecycle;
- analysis outputs and provenance.

### Does not own

- source experiment or workbench records;
- arbitrary reinterpretation of source columns;
- user decisions about controls, variables, methods, or scientific meaning.

### General workflow

    Select data source
        ↓
    Select dataset or range
        ↓
    Select variables
        ↓
    Assign X, Y, and grouping
        ↓
    Choose analysis method
        ↓
    Choose chart type
        ↓
    Preview processed data and output
        ↓
    Customize
        ↓
    Explicitly confirm
        ↓
    Export

### Data-source adapter contract

An adapter:

- declares supported source types;
- lists datasets available inside a selected source;
- exposes stable variable identifiers, labels, types, and units;
- reads a user-selected subset;
- returns a tabular data contract and input fingerprint;
- never changes source data.

Planned sources include Animal, Cell, Plate, and Chromatography Workbenches,
experiment attachments, Excel, CSV, and manual entry.

### Analysis-tool contract

An analysis tool:

- has a stable key and version;
- declares supported input shapes;
- defines a validated configuration schema;
- lists assumptions and warnings;
- transforms selected input deterministically;
- returns processed data, statistics, messages, and provenance;
- has verified examples and tests.

### Chart contract

A chart definition validates data roles and user-controlled options such as
aggregation, mean/median, SD/SEM, individual points, normalization, axes,
labels, legends, titles, ranges, markers, and line styles.

Planned chart types include line, scatter, bar, box, violin, histogram, and
heatmap. Support is phased and not currently implemented.

### Guided Analysis

A Guided Analysis Wizard prearranges questions for a known workflow such as
CCK-8, qPCR ΔΔCt, animal body weight, or tumor growth.

It may require the user to identify blank, control, replicate structure, and
normalization. It may explain recommended options. It must show processed data
before confirmation and must preserve every accepted choice in AnalysisSession.

The wizard cannot silently choose a scientifically meaningful role.

## 12. Template Library

### Owns

- built-in and user Template records;
- categories and preview;
- copy/customize workflow;
- origin and version metadata.

### Primary use cases

- browse by Cell Biology, Animal, Biochemistry, Molecular Biology, or Other;
- preview a template;
- copy it into an editable user protocol;
- create a personal template from accepted user content;
- distinguish built-in content from user-owned content.

### Boundary rules

- copied user content is independent;
- template updates do not mutate existing protocols;
- templates can reference recommended kits, calculator keys, or workbench types
  through stable optional references;
- templates do not execute business behavior.

## 13. Kits and Manuals

### Owns

- Kit identity and lifecycle;
- manufacturer, catalog, lot, expiry, and storage information;
- manual and kit attachment relationships;
- protocol-to-kit relationships;
- kit search summaries.

### Initial planned workflow

Upload a manual, save metadata, view/search the kit, and associate it with a
Protocol.

OCR and AI manual parsing are later capabilities. Manual content must not be
transmitted to AI without an accepted privacy and consent design.

## 14. Export System

### Owns

- ExportRequest and export job lifecycle;
- source-provider registry;
- renderer registry;
- output storage and provenance;
- common export errors and support discovery.

### Source provider

A module-owned provider creates one of a small number of canonical forms:

- structured document: headings, paragraphs, tables, images, metadata;
- tabular workbook: sheets, columns, types, units, rows, metadata;
- figure bundle: figures plus captions, styles, and provenance.

### Renderer

A renderer converts a canonical form to one format. Examples:

| Source | Planned formats |
| --- | --- |
| ExperimentRun | PDF, Markdown |
| Animal Workbench | Excel, CSV, PDF |
| Cell Workbench | Excel, CSV |
| Analysis | PNG, SVG, PDF, processed Excel |

### Export service flow

    ExportRequest
        ↓
    Authorization and option validation
        ↓
    Source provider creates stable snapshot
        ↓
    Renderer creates output
        ↓
    FileStorage saves output
        ↓
    Attachment/export metadata records provenance

Each module must not build a separate PDF/Excel subsystem. Specialized content
belongs in its source provider; format mechanics belong in renderers.

## 15. Core Services

### Data access

Repository and transaction contracts. Does not expose ORM models to UI or
domain modules.

### Authentication-ready context

Carries actor and workspace context when authentication exists. Early local mode
uses a documented local context and makes no security claim.

### Synchronization readiness

Stable IDs, revisions, timestamps, deletion markers, idempotency, and conflict
errors. Offline queues and change feeds are later implementations.

### File storage

Provider-neutral keys, metadata, checksums, upload states, and local/object
adapters.

### Search

Consumes module-provided searchable summaries. It does not parse every module's
private schema itself.

### Backup

Coordinates database and files as one recoverable set and records backup
metadata and verification.

### Settings

Typed, scoped configuration. Secrets remain outside source control.

### Shared UI

Design tokens and reusable accessible components. Shared UI has no database or
module repository access.

## 16. Integration Approach

Early cross-module operations should use application services and simple
in-process events only when they reduce coupling.

Examples:

- ExperimentRunScheduled can inform Planner;
- ExperimentRunCompleted can invalidate relevant search summaries;
- WorkbenchRecordLinked can refresh an experiment read model;
- ExportCompleted can create a downloadable output reference.

Events are not a justification for an event broker in early phases. Reliable
outbox infrastructure is considered only when external services or
synchronization make it necessary.

## 17. Adding New Capabilities

### New Workbench

Add a definition, common-record integration, reviewed domain model, validators,
module use cases, read views, tests, and optional analysis/export adapters.
Limited extension metadata may use JSON. Do not modify experiment tables with
workbench-specific fields or hide the entire domain model in one JSON field.

### New Calculator

Add one deterministic definition, schemas, assumptions, examples, and tests,
then register it.

### New Analysis Tool

Add a versioned configuration contract, supported input rules, deterministic
engine, provenance output, warnings, and tests, then register it.

### New Export Format

Add a renderer for an existing canonical model. Existing modules should need no
change unless they want to declare support for that format.

### New Template Type

Add validated content and preview rules behind the Template module. Copying must
still produce independent user content.

## 18. Anti-patterns

Do not:

- create one universal JSON entity for every module or every Workbench;
- place module-specific conditionals in Core;
- let frontend code import database entities;
- let analysis query private module tables directly;
- copy full WorkbenchRecord payloads into experiment records;
- store attachments only as file paths;
- load arbitrary third-party calculation or analysis code at runtime;
- introduce a service per module;
- use AI suggestions as stored user choices without confirmation.
