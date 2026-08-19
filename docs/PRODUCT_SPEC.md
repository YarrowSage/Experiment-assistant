# Product Specification

Status: Accepted Phase 0 product direction; not implemented
Last reviewed: 2026-08-19

## 1. Product Definition

Experiment Assistant is a modular, multi-device laboratory planning,
execution, recording, management, and analysis assistant for scientific
research.

Its purpose is to preserve the relationship between what a researcher planned,
what actually happened, what evidence was collected, what was concluded, and
what should happen next.

The intended end-to-end lifecycle is:

    Plan experiment
        ↓
    Schedule work
        ↓
    Prepare materials and protocol
        ↓
    Execute protocol steps
        ↓
    Record observations, deviations, and evidence
        ↓
    Preserve structured data
        ↓
    Analyze with explicit user choices
        ↓
    Export results
        ↓
    Review history and plan the next action

## 2. Product Goals

1. Keep projects, protocols, real experiment runs, evidence, and follow-up
   actions connected.
2. Make experiment execution fast and readable on a phone at the laboratory
   bench.
3. Make planning, complex editing, file management, analysis, and export
   efficient on a desktop.
4. Use one core data model across devices without requiring identical
   interfaces on every device.
5. Preserve scientific traceability by separating reusable instructions from
   actual execution records.
6. Allow calculators, workbenches, analysis tools, templates, and export formats
   to grow through clear module interfaces.
7. Begin with local development while keeping a credible path to authenticated,
   multi-device synchronization.
8. Keep researchers in control of scientific interpretation and analysis.

## 3. Non-goals

Experiment Assistant is not currently intended to be:

- a complete regulated ELN or LIMS;
- a hospital, clinical-trial, or patient-record system;
- an inventory purchasing and procurement platform;
- a public research social network;
- an autonomous system that chooses statistical methods or scientific
  conclusions;
- an AI agent that executes or changes experimental instructions without
  confirmation;
- a runtime plugin marketplace;
- a replacement for specialist statistical packages in the early roadmap.

Regulatory compliance, electronic signatures, audit requirements, retention
rules, and institutional validation remain open product decisions.

## 4. Primary Users and Contexts

### Primary user

A researcher, graduate student, technician, or laboratory member who plans and
executes experiments and needs reliable, searchable records.

### Secondary future users

- a principal investigator reviewing project progress;
- a collaborator contributing to selected projects;
- a laboratory manager maintaining shared templates or kit manuals.

### Usage contexts

- quiet desktop planning and protocol editing;
- active laboratory execution with gloves or limited attention;
- rapid mobile capture of notes, photos, and measurements;
- desktop review of longitudinal data and attachments;
- controlled export for reports, meetings, and downstream analysis.

## 5. Product Principles

### Plan and reality are different

A Protocol describes a reusable procedure family. Immutable ProtocolVersions
describe what should happen at a particular version, and an ExperimentRun
records one occasion on which an exact version was used. Editing the procedure
creates a new version and must not rewrite completed history.

### Instructions and execution are different

A ProtocolStep contains reusable instructions. A RunStepRecord contains the
status, timing, notes, deviations, attachments, and linked workbench evidence
for one actual execution.

### Workspace is the ownership boundary

Every Project belongs to a Workspace. The first release may use one automatic
default Workspace without accounts or Workspace UI. Future personal and
laboratory/team spaces can build on the same boundary.

### Completed corrections remain visible

Draft and active work can be edited normally. Completed ExperimentRuns and
important completed records must not be silently overwritten; a future
amendment/revision records the original value, correction, reason, and modified
time. This is an integrity foundation, not a claim of GLP/GxP compliance.

### Local-first, synchronization-ready

Early development may use a local API, SQLite, and local file storage. Clients
must still use application/API boundaries so the product is not locked to a
single-device database.

### Explicit scientific choices

The user selects datasets, variables, groups, transformations, analysis
methods, and chart types. The system may explain or validate choices but must
not silently infer them as scientific truth.

### Evidence stays in context

A file should be linked to the project, protocol, run, step, workbench record,
kit, or analysis session that gives it meaning. A generic file list alone is
not sufficient.

### Scientific quantities remain machine-readable

Measured values store a parseable numeric value and separate unit. Display text
such as "22.3 g" is not the only representation. A unit library and conversions
are deferred.

### Progressive complexity

Simple experiments should remain simple. Specialized animal, cell, plate, and
analysis capabilities should appear when relevant rather than crowd every
screen.

## 6. Device Strategy

Desktop and mobile clients use the same core records through a shared API, but
their feature emphasis differs.

| Capability | Desktop/Web emphasis | Mobile/PWA emphasis |
| --- | --- | --- |
| Projects and history | Full management | View and quick access |
| Protocols | Complex creation and editing | Read and execute |
| Planner | Calendar and long-term planning | Today and upcoming |
| Experiment execution | Available | Primary experience |
| Notes and media | Full file management | Quick note, photo, upload |
| Workbenches | Full views and configuration | Field data entry |
| Analysis | Full workbench | View results; limited quick actions |
| Calculators | Full catalog | Common calculators |
| Kits/manuals | Manage and relate | Search and view |
| Export | Configure and generate | Share existing exports |

Device capability differences must not create different meanings for the same
domain data.

## 7. Core Product Modules

### 7.1 Experiment Management

The product axis. It owns projects, protocols, immutable protocol versions,
version-owned protocol steps, experiment runs, run step records, outcomes,
history, and their evidence relationships.

### 7.2 Planner and Calendar

Research-aware scheduling connected to projects, protocols, planned runs, and
workbench tasks. It is not an independent note calendar.

### 7.3 Calculator Center

A catalog of versioned, validated scientific calculators. New calculators
should implement a small definition interface and should not alter the
application core.

### 7.4 Workbench System

Structured workspaces for specific experimental domains. Planned workbenches
include Animal, Cell, Plate, and Analysis. Workbench records link to experiments
instead of being copied into them.

### 7.5 Analysis Workbench

A user-directed workflow for selecting a data source, dataset, variables,
groups, method, chart, customization, and output. Guided analysis can help with
known workflows but never bypass user confirmation.

### 7.6 Template Library

Built-in and user-owned templates that can be previewed, copied, customized,
and converted into user protocols. Built-in templates are never mandatory or
silently updated inside existing user records.

### 7.7 Kits and Manuals

Kit identity, manufacturer, catalog and lot details, expiry, storage, manuals,
notes, attachments, and protocol relationships.

### 7.8 Export System

A shared export service for source modules and format renderers. Planned
formats include PDF, Markdown, Excel, CSV, PNG, and SVG where appropriate.

### 7.9 Core Services

Data access, API contracts, file storage, authentication readiness,
synchronization readiness, search, export orchestration, backup, settings,
logging, and shared UI foundations.

Core Services provide technical capabilities; they must not become a container
for module-specific business rules.

## 8. Core Experiment Workflow

The minimum coherent product workflow planned for the first functional release
is:

    Create project
        ↓
    Create or copy protocol
        ↓
    Edit and confirm ordered protocol steps
        ↓
    Schedule or start an experiment run
        ↓
    Execute each step and capture actual timing/evidence
        ↓
    Record result, observations, deviations, expectation, and next action
        ↓
    Complete the run
        ↓
    Review history or export

A run may be created without a reusable protocol only if a later accepted
requirement defines an ad-hoc workflow and its traceability rules.

## 9. Functional Direction by Module

### Experiment Management

Planned statuses should cover draft, planned, ready, in progress, paused,
completed, cancelled, and archived where relevant. Status transitions must be
defined per entity rather than shared as one unrestricted global list.

Experiment history must answer:

- which exact immutable ProtocolVersion was used;
- who or which device created and changed the record when identity exists;
- what each step instructed;
- what happened and when;
- which deviations and evidence were recorded;
- whether the expected outcome was met;
- what next action was chosen.

### Planner

A calendar event may link to a project, protocol, planned experiment run, or
workbench task. Opening the event should navigate to the linked research
object. Today and This Week are focused views over the same planning data.

### Workbenches

WorkbenchRecord stores common metadata, lifecycle, links, and attachments.
Concrete Workbenches may own normalized Animal, Cell, Plate, or other domain
entities. Limited JSON configuration/metadata is allowed, but one universal JSON
field is not the sole scientific data model. Definitions are versioned so
historical records remain interpretable after a workbench evolves.

### Analysis

Every analysis session must record the user's source selection, variables,
roles, grouping, method configuration, chart configuration, transformations,
tool version, and outputs. A preview is not a final result until the user
confirms it.

### Files

Files require metadata, checksum, size, media type, storage key, and contextual
links. File bytes do not belong in primary relational rows.

## 10. Quality Attributes

### Traceability

Historical runs and analyses must remain understandable after protocols,
workbench definitions, or analysis tools evolve.

### Usability

Mobile execution prioritizes one-handed use, large targets, few required
inputs, rapid photo capture, and recovery from interruption. Desktop prioritizes
editing, comparison, tables, and file organization.

### Portability

Business and API layers should not depend on SQLite-only behavior or local file
paths.

### Reliability

Timers must derive duration from persisted timestamps rather than assuming a
browser process stayed active. Drafts and uploads need explicit recovery states.

### Privacy

Research data is private by default. No public feed, analytics tracking, or AI
transmission should be introduced without an accepted privacy decision and
clear user control.

### Maintainability

Module ownership, public contracts, schema migrations, and tests must remain
clear enough for a beginner maintainer to review with assistance.

## 11. Phase 0 Completion Boundary

Phase 0 defines product scope, architecture, data relationships, module
contracts, multi-device strategy, UI principles, workflow rules, and roadmap.

Phase 0 does not implement:

- application pages or navigation;
- database tables or migrations;
- APIs or file uploads;
- calendars, calculators, workbenches, analysis, or export;
- authentication, synchronization, deployment, or AI.

Implementation begins only after Phase 0 is accepted and Phase 1 is explicitly
authorized.
