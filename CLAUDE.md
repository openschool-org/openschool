# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenSchool is a self-hosted school management system. It is a monorepo with two workspaces:

- `backend/` — Go REST API (Gin framework)
- `frontend/` — React SPA (Vite, TypeScript, Carbon Design System)

For anything beyond a quick fix, read further before making changes:

- [`docs/FEATURES.md`](docs/FEATURES.md) — current feature list by module
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — component layout, full data model, external interfaces
- [`docs/adr/`](docs/adr/) — *why* behind non-obvious decisions (e.g. why positions aren't ThunderID roles, why the current-academic-year invariant exists) — check here before "fixing" something that looks wrong but is deliberate
- [`audit.md`](audit.md) — known bugs/code-quality findings with severity; check it isn't already tracking whatever you just found before re-reporting it

## Backend

### Setup & Running

```bash
cd backend

# Start PostgreSQL
docker compose up -d

# Copy and configure environment
cp .env.example .env

# Run the API (migrations run automatically on startup)
go run ./cmd/api/main.go
```

The server starts on `:8080`. Migrations in `db/migrations/` are applied via `golang-migrate` on every startup.

### Building & Testing

```bash
cd backend
go build ./...
go vet ./...
go test ./...
go test ./path/to/package  # single package
```

CI (`.github/workflows/backend-ci.yml`) also runs `staticcheck` (blocking)
and, informationally (not yet blocking — see the workflow file for why),
`govulncheck` and a dead-code scan.

### Database Workflow (sqlc)

SQL queries live in `db/queries/`. After editing queries or migrations, regenerate Go code:

```bash
cd backend
sqlc generate
```

Never edit files in `db/sqlc/` directly — they are generated. Schema is inferred from `db/migrations/`.

### Architecture

- `cmd/api/main.go` — entry point: loads env, runs migrations, connects DB, inits JWKS, starts Gin router
- `internal/config/` — loads `.env` via `godotenv`
- `internal/database/` — DSN builder, pgxpool connection, `golang-migrate` runner
- `internal/middleware/` — `AuthMiddleware` (validates ThunderID-issued JWTs against JWKS) and `RequireRole` (per-route role gating)
- `db/migrations/` — numbered up/down SQL migrations (golang-migrate format)
- `db/queries/` — raw SQL queries annotated for sqlc
- `db/sqlc/` — generated type-safe query code (do not edit)

### Environment Variables

See `.env.example`. Key vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE`, `PORT`, plus the identity-provider vars used for JWT validation and user management.

### Identity provider (ThunderID)

The backend authenticates against ThunderID exclusively.

- `internal/identity/` — provider-neutral seam: the `Provider` interface (CreateUser/UpdateUser/DeleteUser/AssignRole), the shared `User` return type, and env helpers `JWKSURL()`, `Issuer()`, `RoleID(role)` that resolve to the `THUNDERID_*` vars.
- `internal/thunderid/` — the concrete client; satisfies `identity.Provider`.
- `internal/routes/idp.go` — `newIdentityProvider()` factory that constructs the ThunderID client; route files inject it into services.
- Token validation reads `JWKSURL()`/`Issuer()`; provisioning uses the injected `Provider` and `RoleID(...)`.

## Frontend

### Setup & Running

```bash
cd frontend
pnpm install
pnpm dev   # starts Vite dev server at http://localhost:5173
```

### Building & Linting

```bash
cd frontend
pnpm build    # tsc + vite build
pnpm lint     # eslint
pnpm preview  # preview production build
```

CI (`.github/workflows/frontend-ci.yml`) also runs `pnpm audit --prod`
informationally (not yet blocking — two known advisories are still open,
see `audit.md`).

### Architecture

Authentication is handled by **ThunderID** (`@thunderid/react`). The provider is configured in `main.tsx` via `VITE_THUNDERID_CLIENT_ID`, `VITE_THUNDERID_BASE_URL`, and `VITE_THUNDERID_SCOPES` (see `frontend/.env.example`). Auth state and the access token come from the `useThunderID()` hook (`isSignedIn`/`isLoading`/`getAccessToken`/`signOut`). All routes except `/signin` are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/signin`. Role (`admin`/`teacher`/`student`/`parent`) is read from the `roles` claim of the access token via the `useRole` hook.

- `main.tsx` — root: `ThunderIDProvider` → `QueryClientProvider` → `BrowserRouter` → `App`
- `App.tsx` — resolves role from the JWT and renders one of four route trees (admin/teacher/student/parent), each behind its own layout and `ProtectedRoute`; there's no separate URL per role, routing is decided by claim
- `src/layouts/` — `RootLayout.tsx` (admin), `TeacherLayout.tsx`, `StudentLayout.tsx`, `ParentLayout.tsx` — each a Carbon `Header` with nav + `<Outlet>` for page content
- `src/pages/` — route-level page components, one directory per portal (`admin/`, `teacher/`, `student/`, `parent/`, `notifications/` shared across portals); admin pages are further split by module
- `src/queries/` — TanStack Query hooks, one typed query-key builder per entity; mutations invalidate the keys they affect
- `src/services/` — one file per backend module, thin `axios` wrappers matching `internal/models/` shapes
- `src/components/common/` — shared CRUD building blocks (`ConfirmDeleteModal`, `EntityCombobox`, `EmptyState`, etc.) that almost every admin page composes from — deviating from the list+modal-form+confirm-delete template is a signal something's off, not a style choice

UI uses **IBM Carbon Design System** (`@carbon/react`, `@carbon/icons-react`). Data fetching uses **TanStack Query** (`@tanstack/react-query`). Styles are SCSS (`index.scss`).

## Data Model

Core entities, enough to orient yourself:

- `User` — accounts with roles: `admin`, `teacher`, `student`, `parent`
- `TeacherProfile` / `StudentProfile` / `Guardian` — extended profile tables linked to `User`
- `School` — single-row table for the instance's school info
- `AcademicYear` — scopes almost all academic data via `academic_year_id` FKs; only one row should have `is_current = true` (enforced at app level, not a DB constraint — see [`docs/adr/0003-single-current-academic-year.md`](docs/adr/0003-single-current-academic-year.md))
- `Grade` / `Class` / `Stream` / `StreamGroup` / `Medium` — school structure
- `Subject` / `SubjectBucket` — curriculum; buckets group optional subject choices per grade
- `AttendanceSession` / `AttendanceRecord` — attendance tracking per class session

The schema has grown well beyond this (32 migrations, ~50 tables — also
covering timetable, notifications, prefects, staff/positions, student
portfolio, and the audit log). Don't hand-maintain a full list here — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#4-data-model) for the
current, grouped breakdown, or `db/sqlc/models.go` (generated from the
migrations) for exact columns/types.
