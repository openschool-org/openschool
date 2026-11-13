# OpenSchool

The open-source platform for digitising the day-to-day operations of Sri Lankan schools.

[![Backend CI](https://github.com/openschool-org/openschool/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/openschool-org/openschool/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/openschool-org/openschool/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/openschool-org/openschool/actions/workflows/frontend-ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Status: under development](https://img.shields.io/badge/status-under%20development-yellow.svg)](CHANGELOG.md)

> [!WARNING]
> OpenSchool is under active development. Features, interfaces and data models may change between releases. See the [changelog](CHANGELOG.md).

## Overview

OpenSchool brings everyday school work into one system: student and staff records, classes, attendance, curriculum, timetables, marks, notifications, reports, and administration. It replaces paper records and disconnected tools with a single source of truth.

It is designed to be self-hosted. A school or public-sector organisation can run it on infrastructure it controls, which keeps student and administrative data under local control. It is released under the Apache License 2.0, with no licence fees and no vendor lock-in.

## Features

- **School setup:** academic years, grades, classes, houses, and streams
- **People:** student, teacher, guardian, and non-academic staff records
- **Attendance:** daily student and staff attendance
- **Academics:** subjects, curriculum choices, term marks, and promotions
- **Timetables:** planning, review, and publishing
- **Operations:** in-app notifications, reports, dashboards, and automation checks
- **Portals:** separate interfaces for administrators, teachers, students, and parents

The [feature guide](docs/FEATURES.md) describes each module in detail.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Go, [Gin](https://github.com/gin-gonic/gin) |
| Frontend | React, TypeScript, Vite |
| Database | PostgreSQL |
| Identity and access | [ThunderID](https://github.com/thunderid) |

The backend is a modular monolith: one application, one database, and clear feature modules. See the [architecture guide](docs/ARCHITECTURE.md) for details.

## Quick start

**Prerequisites:** Go 1.25+, Node.js 18+ with pnpm, Docker with Docker Compose.

```bash
git clone https://github.com/openschool-org/openschool.git
cd openschool

make setup   # start PostgreSQL and ThunderID, configure environment, install dependencies
make dev     # run the backend (:8080) and the frontend (:5173)
```

Open <http://localhost:5173> and create the first administrator account.

`make setup` starts ThunderID with OpenSchool's resources preloaded, generates a client secret, and writes the `.env` files. To configure ThunderID by hand, see the [ThunderID guide](docs/THUNDERID.md). For a step-by-step manual setup, see the [setup guide](docs/SETUP.md).

## Documentation

| Document | Description |
| --- | --- |
| [Setup](docs/SETUP.md) | Run OpenSchool locally and set up a new school |
| [ThunderID](docs/THUNDERID.md) | Configure the identity provider |
| [Features](docs/FEATURES.md) | What the system can do, by module |
| [Architecture](docs/ARCHITECTURE.md) | Project structure and data model |
| [Architecture decisions](docs/adr/) | Why key technical decisions were made |
| [Changelog](CHANGELOG.md) | Release history |

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request, and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Do not report security issues in a public issue. Follow the process in [SECURITY.md](SECURITY.md).

## License

OpenSchool is licensed under the [Apache License 2.0](LICENSE).
