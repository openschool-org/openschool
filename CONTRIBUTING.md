# Contributing to OpenSchool

Thanks for helping improve OpenSchool. This guide is for first-time contributors and covers the usual workflow from setup to pull request.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). For a security problem, do not open a public issue; follow [SECURITY.md](SECURITY.md) instead.

## Before you begin

- For a small bug fix, you can open a pull request directly.
- For a new feature or a larger change, open an issue first so the approach can be discussed.
- Look for an existing issue before creating a new one.

## Set up your computer

OpenSchool has a Go backend, a React frontend, PostgreSQL, and ThunderID for sign-in.

1. Follow [ThunderID setup](docs/THUNDERID.md) once for your local machine.
2. Follow the [server setup guide](docs/setup/server.md) to start PostgreSQL, the backend, and the frontend.
3. Open `http://localhost:5173` and confirm that you can sign in.

Useful project maps:

- [Architecture](docs/ARCHITECTURE.md) explains the main parts of the system.
- [Feature list](docs/FEATURES.md) shows what each area does.
- [Architecture decisions](docs/adr/) explain important design choices.

## Make a change

Create a branch from `development`:

```bash
git switch development
git pull
git switch -c feature/short-description
```

Keep each change focused. Avoid mixing formatting, refactoring, and a new feature in one pull request unless they need to be together.

### Backend

Backend code is in `backend/`.

- Keep feature code inside its owning module in `backend/internal/modules/`.
- Put database queries in `backend/db/queries/`. Run `sqlc generate` after changing a query or migration. Do not edit `backend/db/sqlc/` by hand.
- Add or update tests when behaviour changes.

Before opening a pull request:

```bash
cd backend
go test ./...
go vet ./...
go build ./...
```

### Frontend

Frontend code is in `frontend/`.

- Reuse shared UI components from `src/shared/ui/` (`DataGrid`, `FilterBar`, `FormModal`, etc.) where they fit.
- Keep API types and HTTP wrappers in `src/shared/api/` or `src/features/<feature>/api/` aligned with backend JSON responses.
- Add clear loading, empty, and error states for new data screens.

Before opening a pull request:

```bash
cd frontend
pnpm lint
pnpm build
```

## Open a pull request

- Target the `development` branch, not `main`.
- Use a short title that explains the result.
- Describe what changed, why it changed, and how you tested it.
- Link the related issue when there is one.
- Respond to review comments and keep the pull request up to date.

## Need help?

- [Open an issue](https://github.com/openschool-org/openschool/issues)
- [Start a discussion](https://github.com/openschool-org/openschool/discussions)
