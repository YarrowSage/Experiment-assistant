# Experiment Assistant

A modular, multi-device laboratory planning, execution, recording, management,
and analysis assistant for scientific research.

> Current status: Phase 0 product and architecture definition is accepted.
> The repository still contains documentation only; no usable application or
> business feature has been implemented.

## Vision

Experiment Assistant is intended to connect the full experimental workflow:

Plan → schedule → prepare → execute → record → structure data → analyze →
export → review.

It is not only an electronic notebook, calculator, calendar, or analysis tool.
The goal is a modular research assistant whose desktop and mobile experiences
use the same core data while focusing on different jobs.

## Current Status

The repository currently contains Phase 0 documentation only:

- product definition and scope;
- proposed modular architecture;
- conceptual data model;
- desktop/mobile and synchronization strategy;
- UI design principles;
- development and GitHub workflow rules;
- staged roadmap.

There is currently no application shell, database schema, API, synchronization
service, authentication system, or production deployment.

## Planned Features

All items in this section are planned, not implemented.

- project, protocol, experiment-run, and step-execution management;
- research-aware planner and calendar;
- extensible calculator center;
- animal, cell, plate, and future workbenches;
- user-directed data analysis workbench;
- built-in and personal template library;
- kits, manuals, and protocol relationships;
- unified PDF, Markdown, Excel, CSV, and figure export;
- search, backup, file management, and settings;
- optional multi-device synchronization;
- carefully reviewed AI assistance in a later phase.

## Architecture Direction

The accepted Phase 0 architecture direction is:

- responsive Next.js and React frontend written in TypeScript;
- installable PWA as the initial mobile delivery option;
- API-first FastAPI backend;
- SQLAlchemy and Alembic for database portability and migrations;
- SQLite for early local, single-server development;
- PostgreSQL for later multi-user and synchronized deployment;
- storage interfaces that begin with local files and can move to object storage;
- stable module contracts without a runtime plugin marketplace.

These technologies have not yet been installed or implemented.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Module design](docs/MODULE_DESIGN.md)
- [Multi-device strategy](docs/MULTI_DEVICE_STRATEGY.md)
- [UI design system](docs/UI_DESIGN_SYSTEM.md)
- [Development guide](docs/DEVELOPMENT_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributor and agent rules](AGENTS.md)

## Roadmap

Phase 0 defines the product and its foundations. Phase 1 will create only the
application foundation, shared design system, responsive shell, and engineering
quality baseline after explicit approval. Core experiment functionality begins
in Phase 2.

See [docs/ROADMAP.md](docs/ROADMAP.md) for phase boundaries and acceptance
criteria.

## License

This project is licensed under the [MIT License](LICENSE).
