# UI Design System

Status: Accepted Phase 0 direction; no UI components are implemented
Last reviewed: 2026-08-19

## 1. Design Intent

Experiment Assistant should feel calm, precise, modern, and trustworthy.
The visual direction is inspired by the restraint and hierarchy of Apple
interfaces and the immediacy of media capture in Instagram, without copying
either product.

Keywords:

- minimal;
- clean;
- generous whitespace;
- clear hierarchy;
- rounded but not playful;
- subtle borders and shadows;
- low visual noise;
- restrained color;
- readable typography;
- evidence and status in context.

Scientific clarity takes priority over decoration.

## 2. Experience Principles

### The next action is obvious

Every page should have one clear primary action. Secondary actions remain
available without competing visually.

### Mobile is interruption-tolerant

Experiment execution must recover after the screen locks, the browser is
backgrounded, or connectivity changes. Saved, pending, synchronized, and failed
states are explicit.

### Desktop uses space, not density

Wide screens support comparison and editing, but the home page should not become
a wall of dashboards and statistics.

### Reveal specialist complexity when needed

Animal measurements, plate maps, statistical configuration, and file metadata
appear inside their workbench or task, not on the global home screen.

### Records look different from editable plans

Protocols, active runs, and completed records require visibly distinct states.
A completed record must not look like an ordinary editable form.

### Meaning never depends on color alone

Status uses text, icon, and color. Scientific group identity uses labels and
patterns/markers as needed.

## 3. Information Architecture

### Desktop candidate

    Sidebar
      Home
      Planner
      Experiments
      Workbenches
      Analysis
      Tools
      Kits
      Library
      Settings

The sidebar should have one level by default. Contextual subnavigation belongs
inside the selected module rather than in nested global menus.

### Mobile candidate

    Bottom navigation
      Today
      Experiments
      Workbenches
      More

More can expose Planner, Tools, Kits, Library, Search, and Settings. The exact
four-tab choice must be validated in Phase 1 mockups; it is not implemented or
accepted navigation.

During experiment execution, global navigation may be visually minimized while
an explicit safe exit remains available.

## 4. Home Direction

Home prioritizes:

1. Today;
2. Continue Experiment;
3. Upcoming Experiments;
4. Quick Actions;
5. recent project context when space permits.

It should not prioritize:

- achievement badges;
- subscription banners;
- dozens of metric cards;
- decorative charts;
- news or public content;
- every available tool.

### Desktop home sketch

    Good morning
    Wednesday, August 19

    Today
    ┌───────────────────────────────────────┐
    │ 09:00  Cell seeding       Planned    │
    │ 14:00  Animal dosing      Ready      │
    └───────────────────────────────────────┘

    Continue Experiment        Quick actions
    ┌────────────────────┐     New experiment
    │ CCK-8 Run #01      │     Add note
    │ Step 3 of 7        │     Upload file
    │ Continue           │     Calculator
    └────────────────────┘

## 5. Mobile Execution Direction

The execution screen is the highest-priority mobile interaction.

    ‹ CCK-8 Experiment                 • Saved

    Step 3 of 7
    ━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━

    Add CCK-8 reagent
    Add 10 μL to each well.

    00:18:42
    Started 14:03

    [ Add photo ]  [ Add note ]
    [ Link workbench record ]

    [ Previous ]      [ Complete step ]

Requirements:

- current step and total count remain visible;
- instruction text is large and not truncated;
- timing is based on persisted timestamps;
- photo and note actions are reachable with one hand;
- destructive exit or run completion requires clear confirmation;
- previous/next navigation never silently changes status;
- offline/pending status remains visible without a blocking modal;
- a user can see precautions without losing current progress.

## 6. Provisional Design Tokens

Tokens are proposed values for Phase 1 implementation and accessibility testing.
They are not a finished brand.

### Color

| Token | Proposed value | Use |
| --- | --- | --- |
| canvas | #F7F7F5 | App background |
| surface | #FFFFFF | Cards, sheets, fields |
| text-primary | #171717 | Main text |
| text-secondary | #666A70 | Supporting text |
| border | #E3E4E1 | Dividers and field borders |
| accent | #2463EB | Primary actions and links |
| accent-soft | #EDF3FF | Selected/soft accent background |
| success | #247A4A | Completed/synchronized |
| warning | #946200 | Attention/pending |
| danger | #C43D3D | Destructive/error |
| focus | #5B8DEF | Keyboard focus ring |

Color values must be adjusted if contrast tests fail. High-saturation gradients
are not part of the default application chrome.

### Typography

Use a system-first stack:

    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Microsoft YaHei", sans-serif

Suggested scale:

| Role | Size / line height | Weight |
| --- | --- | --- |
| Page title | 28 / 36 px | 650–700 |
| Section title | 20 / 28 px | 600 |
| Card title | 17 / 24 px | 600 |
| Body | 16 / 24 px | 400 |
| Secondary | 14 / 20 px | 400 |
| Caption | 12 / 18 px | 450 |
| Numeric focus | 32 / 40 px | 600 with tabular numerals |

Avoid body text below 16 px on mobile execution screens.

### Spacing

Use a four-pixel base with preferred steps:

    4, 8, 12, 16, 24, 32, 48, 64

Default mobile horizontal padding is 16 px. Desktop content should have a
readable maximum width for forms while tables may use the available workspace.

### Radius

- controls: 10–12 px;
- cards: 16 px;
- prominent sheets: 20–24 px;
- pills: full radius only for statuses and compact filters.

Do not round every container until hierarchy disappears.

### Shadow and border

Prefer a one-pixel subtle border. Use shadow sparingly for floating sheets,
menus, and drag elevation. Permanent cards should not all appear to float.

### Touch and focus

- minimum touch target: 44 by 44 px;
- clear visible keyboard focus;
- at least 8 px between adjacent destructive and routine actions;
- sticky bottom actions must respect safe areas;
- hover is never required to discover an action.

## 7. Responsive Layout

Proposed behavioral ranges:

| Range | Behavior |
| --- | --- |
| Compact: below 768 px | Single column, bottom navigation, sheets, card/table transformations |
| Medium: 768–1199 px | Collapsible sidebar, two-column opportunities |
| Wide: 1200 px and above | Persistent sidebar, content/detail split, wider tables |

Breakpoints are implementation hypotheses. Components should respond to
available space rather than device-name checks wherever possible.

Responsive design may simplify presentation, but it must not hide critical
status, units, or unsynchronized changes.

## 8. Navigation and Page Hierarchy

### Global layer

Switches between product modules.

### Module layer

Provides filters or subviews such as Projects, Protocols, Runs, and History.

### Object layer

Shows one Project, Protocol, ExperimentRun, Kit, or WorkbenchRecord.

### Task layer

Focused workflows such as executing steps, entering an animal measurement, or
configuring an analysis.

Use breadcrumbs on desktop for deep object context. On mobile use a clear back
label and retain the current project/run name.

## 9. Component Guidance

### Buttons

- one primary filled button per action region;
- secondary actions use bordered or quiet buttons;
- tertiary actions use text/icon treatment;
- danger buttons are red and separated;
- icon-only buttons require accessible labels and tooltips on pointer devices;
- labels use verbs such as Start step, Save draft, or Generate PDF.

Avoid ambiguous labels such as OK or Submit.

### Cards

Use a card when content is a meaningful movable unit or needs a clear action.
Do not wrap every heading and paragraph in a card.

A run card should show:

- title and project;
- status in text;
- scheduled or actual time;
- progress;
- one next action;
- synchronization warning when relevant.

### Forms

- group fields by scientific meaning;
- place units beside the value and store them explicitly;
- show required state before validation failure;
- preserve drafts;
- validate inline, with a page summary for long forms;
- use sensible defaults only when scientifically neutral;
- never auto-select a control or statistical method;
- explain destructive or irreversible changes.

Desktop forms may use two columns for short related fields. Narrative text and
instructions remain full width. Mobile forms are normally one column.

### Tables

Desktop:

- sticky headers for long data;
- clear units in headers;
- column visibility and horizontal scroll when necessary;
- row selection separate from row navigation;
- fixed precision for display without altering stored precision;
- export and filter state visibly separated.

Mobile:

- convert rows into focused cards or a horizontal data grid only when comparison
  is essential;
- allow one measurement at a time for rapid entry;
- keep subject ID and unit visible while scrolling;
- never hide columns silently.

### Status

Use icon + label + restrained color. Suggested semantic groups:

- neutral: draft/archived;
- blue: planned/ready;
- amber: pending/paused/unsynchronized;
- green: completed/synchronized;
- red: failed/conflict/action required.

### Modals and sheets

Use a modal for a short decision that blocks the current task. Use a mobile
bottom sheet for compact selection or quick entry. Complex protocol editing or
analysis configuration belongs on a page, not a stack of modals.

Success should normally appear inline or as a brief non-blocking message. Avoid
celebratory interruption after routine scientific work.

### Search

Global search should communicate scope and support results grouped by Projects,
Protocols, Runs, Kits, and files. Module search stays scoped by default.

The search field needs:

- clear placeholder;
- visible clear action;
- recent searches only with privacy consideration;
- empty and no-result states;
- filters that can be removed individually.

## 10. Attachments and File Management

Attachment UI should show:

- filename and type;
- thumbnail where safe;
- size and upload/sync state;
- capture or upload time;
- context such as Step 3 or Kit manual;
- description;
- view, download/share, relink, and delete actions according to permission.

Mobile capture flow:

    Add photo
      → capture or choose
      → preview
      → optional caption/context
      → save locally/pending
      → synchronize with visible state

Do not force users through a general file manager to add evidence to the current
step.

## 11. Planner UI

Desktop may offer calendar, week, and task-pool layouts. Mobile prioritizes Today
and Upcoming, with a simple calendar view.

Every event displays its research context and status. Drag-and-drop is an
optional accelerator, not the only way to reschedule. Keyboard and touch
alternatives are required.

## 12. Workbench UI

WorkbenchDefinition supplies schema and presentation hints, but the design
system owns control behavior and accessibility.

Patterns:

- desktop data grid plus contextual detail panel;
- mobile subject/record queue with a focused entry sheet;
- timeline for longitudinal records;
- plate map only in a specialized Plate workbench;
- persistent project/run/step context;
- explicit save and sync status;
- link to the originating experiment step.

Custom fields must remain visually distinguishable from standard measurements.

## 13. Analysis UI

Analysis must visibly separate:

1. source selection;
2. variable-role assignment;
3. method configuration;
4. preview;
5. confirmation;
6. export.

The interface should show:

- selected sheet/range and row count;
- X, Y, group, blank, and control choices;
- transformations and excluded rows;
- warnings and assumptions;
- processed-data preview;
- plot preview;
- tool and configuration version in details;
- whether the result is draft or confirmed.

Suggestions are labeled Suggested and require an explicit Apply action. Empty
roles do not receive silent defaults.

## 14. Calculator UI

Calculator pages use definition-provided inputs and outputs while retaining a
consistent shell:

- calculator title, purpose, and assumptions;
- labeled values with unit selectors;
- inline validation;
- calculate action;
- results with units and appropriate precision;
- formula or explanation;
- copy or link-to-record action only when traceability rules exist.

Changing input units must either convert the value visibly or ask for
confirmation; it must not reinterpret the same number silently.

## 15. Accessibility

Phase 1 components should target WCAG 2.2 AA where applicable.

- semantic HTML before custom widgets;
- full keyboard operation on desktop;
- visible focus and logical focus order;
- screen-reader labels for icons and scientific controls;
- sufficient text and non-text contrast;
- reduced-motion support;
- no required gesture without an alternative;
- error text that explains repair;
- charts accompanied by data or textual summaries;
- scalable text and layouts that tolerate zoom;
- status and chart series distinguished beyond color.

## 16. Content and Language

- use concise verbs;
- explain technical failures in plain language;
- show scientific units and dates unambiguously;
- store UTC but display the user's time zone;
- avoid anthropomorphic AI language that implies certainty;
- distinguish Save draft, Complete step, and Complete experiment;
- never call a preview a final result;
- support Chinese-first product copy while keeping strings localizable.

## 17. Motion and Feedback

Motion communicates cause and continuity, not celebration.

- 150–250 ms transitions for sheets and state changes;
- honor reduced-motion settings;
- no infinite decorative animation;
- progress indicators for uploads/exports;
- skeletons only when layout is known;
- optimistic UI only where rollback is safe and visible.

## 18. Explicit UI Rejections

- copying Apple or Instagram layouts, icons, or brand assets;
- achievement badges and routine celebration modals;
- saturated gradients as primary application chrome;
- dense enterprise-dashboard home pages;
- unlabeled icon-only primary actions;
- desktop tables squeezed unchanged onto phones;
- multi-step scientific decisions hidden inside a single smart button;
- quiet or invisible synchronization failures;
- using AI animation or branding to distract from uncertain outputs.

## 19. Phase 1 Validation Deliverables

After explicit approval, Phase 1 should validate:

- responsive app shell and navigation;
- typography, color, spacing, focus, and touch tokens;
- desktop Home, mobile Today, and experiment-execution shell states using
  synthetic placeholder data;
- empty, loading, error, offline, and conflict visual patterns;
- iPhone and desktop viewport behavior;
- accessibility baseline.

Phase 1 must not implement real experiment, planner, calculator, workbench, or
analysis behavior.
