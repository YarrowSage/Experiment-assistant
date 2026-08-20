# Multi-device Strategy

Status: Responsive installable PWA baseline implemented; synchronization and
offline mutation handling are not implemented
Last reviewed: 2026-08-20

## 1. Product Position

Experiment Assistant is multi-device with synchronized data. It is neither
desktop-only nor mobile-only, and identical feature sets are not required.

The same Workspace, Project, ProtocolVersion, ExperimentRun, RunStepRecord,
WorkbenchRecord, Attachment, and AnalysisSession identities must keep the same
meaning across clients.

## 2. Device Responsibilities

### Desktop/Web

Desktop emphasizes planning, management, and analysis:

- project management;
- complex protocol editing and comparison;
- full experiment history;
- calendar and long-term planning;
- complete workbench tables and configuration;
- Analysis module;
- Excel/CSV data handling;
- PDF, Excel, and figure export;
- template and kit management;
- file organization and search;
- account, workspace, storage, and synchronization settings.

### Mobile/PWA

Mobile emphasizes execution, recording, and quick access:

- Today and upcoming experiments;
- start, pause, resume, and complete a run;
- focused step execution;
- persisted timing;
- short notes and deviations;
- camera capture and file selection;
- rapid Animal and Cell workbench entry;
- common calculators;
- protocol and kit-manual viewing;
- status checks and simple planning views.

Complex analysis configuration and dense longitudinal tables may be read-only or
redirect users to desktop. This is a deliberate product decision, not missing
data synchronization.

## 3. Target Topology

    Desktop web/PWA ─────┐
                         │
                         ▼
                   Versioned API
                         │
                         ▼
                  Backend services
                         │
                ┌────────┴────────┐
                ▼                 ▼
          SQL database       File storage
                ▲                 ▲
                └────────┬────────┘
                         │
                         ▼
    Mobile PWA / future native app

Clients never synchronize directly with one another. The backend becomes the
authority when shared synchronization is introduced.

## 4. Progressive Delivery Stages

### Stage A: local development

- one local FastAPI process;
- one SQLite database owned by the backend;
- local file-storage adapter;
- responsive web client using the API;
- no login and no claim of secure multi-user access;
- no device synchronization.

The phone may access a development server for controlled testing, but that is
not a production synchronization architecture.

### Stage B: single hosted workspace

- hosted API;
- PostgreSQL;
- object storage;
- HTTPS;
- real authentication and authorization;
- desktop and mobile PWA using the same server;
- online synchronization through normal API reads/writes.

### Stage C: resilient mobile synchronization

- client cache;
- explicit offline state;
- queued mutations with idempotency keys;
- change cursor/feed;
- optimistic conflict handling;
- resumable attachment uploads;
- reliable retry and user-visible error recovery.

### Stage D: native-client evaluation

Evaluate iOS/Android only when validated needs exceed the PWA, not merely
because the product is used on phones.

## 5. PWA Recommendation

PWA is recommended as the initial mobile delivery approach.

### What the early PWA can reasonably provide

- one responsive frontend codebase;
- installation to a supported device's home screen;
- standalone app-like launch;
- HTTPS-hosted updates without app-store release cycles;
- online access to the same API data as desktop;
- camera/photo and file selection where browser support permits;
- simple local cache and draft recovery;
- web push on supported platforms after a later permission/reminder design;
- responsive Today, run execution, note, and quick-record interfaces.

Next.js documents web-app manifests, home-screen installation, service workers,
and web push, including installed home-screen support on modern iOS. These are
platform capabilities, not guarantees that every native behavior is available.

### Important limitations

- background JavaScript and network work are not guaranteed to keep running;
- a timer cannot depend on an active screen or uninterrupted process;
- service-worker, push, install prompts, and file behavior vary by browser and
  operating system;
- browser storage is quota-limited and may be cleared;
- large offline attachment queues need careful recovery;
- deep file-system, Bluetooth, NFC, sensor, and share-extension integration is
  limited or inconsistent;
- app-store distribution, native widgets, and native background-task APIs are
  not automatically provided;
- camera behavior with gloves, permissions, low connectivity, and large images
  needs real-device testing;
- offline conflict resolution remains application work; PWA does not solve it.

### Timer rule

When a user starts a step, persist actual_start. The interface displays
current time minus actual_start. When resumed after suspension or device
restart, it reconstructs elapsed time from persisted timestamps. A repeating
browser timer is never the scientific source of truth.

### When native becomes worthwhile

Begin a formal native evaluation when research confirms one or more of:

- dependable long-running background operations;
- advanced offline operation for days rather than minutes;
- high-volume media capture and background upload;
- Bluetooth laboratory devices or specialist sensors;
- native share extensions, widgets, or system-level integrations;
- app-store/institutional distribution requirements;
- performance or accessibility problems that a well-built PWA cannot solve.

The native client must consume the same API and core data model.

## 6. Synchronization Model

### Server authority

After synchronization is introduced, the server owns the canonical revision.
Each client stores a cache and pending operations. A client-side database is
not a separately modeled scientific record system.

### Record metadata

Synchronization-ready mutable records need:

- stable UUID;
- server revision;
- created and updated timestamps;
- optional deletion tombstone;
- actor/workspace context;
- deterministic order for ordered children;
- last synchronized revision in the client cache.

### Mutation flow

    User changes local draft
        ↓
    Client creates operation with idempotency key
        ↓
    API validates actor, base revision, and domain rules
        ↓
    Server commits canonical revision
        ↓
    Client replaces draft with canonical response

Retries with the same idempotency key must not create duplicate runs, records,
or attachments.

### Change retrieval

A later change endpoint may return records changed after an opaque cursor.
Clients should not depend on server timestamp comparisons alone because clock
skew and equal timestamps can lose changes.

The exact change-feed implementation is deferred to Phase 13.

## 7. Conflict Strategy

### Low-risk conflicts

For independent append-only records, the server can usually preserve both. Two
observations created on separate devices should not overwrite one another.

### Mutable-record conflicts

For a mutable title, step note, or schedule time:

1. client sends the revision it edited;
2. server rejects stale revision with a conflict response;
3. client displays server and local values;
4. user chooses or combines the result;
5. client retries against the current revision.

Silent last-write-wins is not appropriate for scientifically meaningful text.

### Execution conflicts

Starting or completing the same step from two devices needs a stronger rule.
The later design should consider a short execution lease or explicit active
device marker while still allowing recovery if a phone is lost or offline.

Exact behavior is open and must be tested with researchers.

## 8. Offline Scope

Offline support should be introduced progressively:

1. read-only cache for Today's runs and protocols;
2. local draft note/photo queue;
3. step-status operations with visible pending state;
4. broader workbench entry;
5. conflict-aware multi-day offline workflows only if validated.

The UI must distinguish:

- saved on this device;
- queued for synchronization;
- synchronized;
- conflict requires attention;
- upload failed.

It must never display a local-only draft as safely synchronized.

## 9. Attachment Synchronization

File synchronization is separate from record synchronization.

Recommended future flow:

    Create pending attachment metadata
        ↓
    Receive upload target or local storage instruction
        ↓
    Upload bytes, optionally in resumable parts
        ↓
    Server validates size/checksum/type
        ↓
    Finalize metadata as available
        ↓
    Create contextual link

Clients use attachment IDs and storage references, never shared absolute file
paths.

Conflict and recovery considerations:

- checksum-based integrity verification;
- user-visible retry;
- duplicate detection without silently discarding differently named evidence;
- upload cancellation and orphan cleanup;
- thumbnail generation separated from original files;
- no deletion of bytes until links, retention, and sync tombstones are resolved.

## 10. Authentication and Authorization Dependency

True multi-device synchronization cannot ship before authentication and
authorization.

The future design must decide:

- personal versus laboratory workspaces;
- project membership;
- viewer, editor, owner, and administrator abilities;
- attachment access;
- invitation and account recovery;
- audit and retention expectations;
- data export and account deletion.

Phase 0 only preserves an actor/workspace boundary in contracts. It does not
provide security.

## 11. SQLite to PostgreSQL Path

### Early

- one API process owns SQLite;
- all schema changes use Alembic;
- file bytes remain outside the database;
- repositories avoid dialect-specific behavior.

### Preparation

- run repository and migration tests against PostgreSQL;
- validate UUID, timestamps, JSON, constraints, ordering, and search behavior;
- inventory database rows and file checksums;
- rehearse conversion on a copy;
- define downtime or dual-write policy; early scale should prefer a short
  controlled write freeze over dual-write complexity.

### Cutover

1. stop writes;
2. take verified database and file backup;
3. apply PostgreSQL schema migrations;
4. transform and load records;
5. verify row counts, foreign keys, checksums, and representative workflows;
6. switch connection configuration;
7. retain rollback artifacts until acceptance.

Application/API code should not require a complete rewrite, but database
behavior still requires explicit testing.

## 12. Local to Object Storage Path

The FileStorage contract uses logical keys. Local directories and future object
keys share a stable namespace.

Migration steps:

1. enumerate available Attachment metadata;
2. verify each local checksum;
3. upload to the target object store;
4. verify remote size and checksum;
5. change provider/key metadata in a controlled migration;
6. test download authorization;
7. retain local rollback copy for an accepted period.

Manuals, images, uploads, and exports may use logical prefixes, but domain code
must not depend on physical folders or bucket names.

## 13. Device-specific UI Without Data Forks

API capabilities and responsive layouts may differ by device. Domain state does
not.

Examples:

- mobile shows a focused RunStepRecord editor; desktop shows the full run and
  history table;
- mobile captures one animal measurement at a time; desktop compares a group
  over time;
- mobile views an AnalysisSession output; desktop edits its configuration;
- both update the same record through accepted use cases.

Avoid a separate mobile API unless measurable network needs later justify
device-specific response shapes. Shared endpoint resources can offer compact
projections.

## 14. Validation Plan for Later Phases

Before calling the PWA/mobile strategy successful, test on real devices:

- iPhone Safari and installed home-screen mode;
- at least one Android Chromium browser;
- camera capture and permission recovery;
- backgrounding during a running step;
- weak and interrupted networks;
- upload retry for realistic photo/PDF/data sizes;
- screen readability under laboratory lighting;
- one-handed and gloved operation;
- conflict behavior across desktop and phone.

## 15. Official Technical References

- [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js App Router guides](https://nextjs.org/docs/app/guides)
- [Apple background execution overview](https://developer.apple.com/documentation/uikit/preparing-your-ui-to-run-in-the-background)
- [Apple long-running native background tasks](https://developer.apple.com/documentation/BackgroundTasks/performing-long-running-tasks-on-ios-and-ipados)

These references support platform evaluation. Final capability decisions require
prototype testing on the target browser and OS versions.
