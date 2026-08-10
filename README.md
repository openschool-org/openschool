<p align="center">
  <img src="frontend/public/w-favicon.webp" alt="OpenSchool" width="120" />
</p>

<h1 align="center">OpenSchool</h1>

<p align="center">
  Digital infrastructure for Sri Lankan government schools.
</p>

<p align="center">
  <a href="https://github.com/openschool-org/openschool/actions/workflows/backend-ci.yml"><img src="https://github.com/openschool-org/openschool/actions/workflows/backend-ci.yml/badge.svg" alt="Backend CI"></a>
  <a href="https://github.com/openschool-org/openschool/actions/workflows/frontend-ci.yml"><img src="https://github.com/openschool-org/openschool/actions/workflows/frontend-ci.yml/badge.svg" alt="Frontend CI"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="./CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" alt="Contributor Covenant"></a>
</p>

---

## What is this about

OpenSchool is a self-hosted school management system built for the way Sri
Lankan schools actually run — houses, grades, streams, terms, attendance,
guardians, and the admin/teacher/student/parent roles around them. It's a
monorepo with a Go REST API backend and a React (Carbon Design System)
frontend, authenticating through [ThunderID](https://github.com/thunderid).

See [`docs/FEATURES.md`](docs/FEATURES.md) for the full, current feature
list, or [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it's built.

## Getting started

New to the project? Start here, in order:

1. [`CONTRIBUTING.md`](CONTRIBUTING.md) — set up the full local dev
   environment (Postgres, ThunderID, backend, frontend) from scratch.
2. [`docs/THUNDERID.md`](docs/THUNDERID.md) — one-time identity-provider
   configuration, if you haven't already got a ThunderID instance running.
3. [`docs/SETUP.md`](docs/SETUP.md) — walk through first-run admin
   registration, the school setup wizard, and every module hands-on.

## Documentation

| Doc | What's in it |
| --- | --- |
| [`docs/FEATURES.md`](docs/FEATURES.md) | What OpenSchool does today, module by module |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Component layout, layering, data model, external interfaces, non-functional design |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records — the *why* behind non-obvious choices |
| [`docs/SETUP.md`](docs/SETUP.md) | End-to-end operational setup walkthrough |
| [`docs/THUNDERID.md`](docs/THUNDERID.md) | Identity-provider configuration |
| [`docs/plan.md`](docs/plan.md) | Historical, phase-by-phase build log this project grew from |
| [`audit.md`](audit.md) | Standing code-quality and security audit, with severity |
| [`CLAUDE.md`](CLAUDE.md) | Quick architecture reference for AI coding assistants / new contributors |

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for
the local dev setup and PR workflow. Please also read the
[Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Security

Found a security issue? Please **don't** open a public GitHub issue — see
[`SECURITY.md`](SECURITY.md) for how to report it privately.

## Founders

OpenSchool was started by:

- [Chamal Senarathna](https://github.com/chamals3n4)
- [Hasitha Erandika](https://github.com/HasithaErandika)

See the [contributors graph](https://github.com/openschool-org/openschool/graphs/contributors)
for everyone who's helped since.

## License

[MIT](LICENSE) — see the [`LICENSE`](LICENSE) file for the full text.
