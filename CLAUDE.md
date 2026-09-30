# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenSchool is a self-hosted school management system. It is a monorepo with two workspaces:

- `backend/` - Go REST API (Gin framework)
- `frontend/` - React SPA (Vite, TypeScript, Carbon Design System)

For anything beyond a quick fix, read further before making changes:

- [`docs/FEATURES.md`](docs/FEATURES.md) - current feature list by module
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - component layout, full data model, external interfaces
- [`docs/adr/`](docs/adr/) - *why* behind non-obvious decisions (e.g. why positions aren't ThunderID roles, why the current-academic-year invariant exists) - check here before "fixing" something that looks wrong but is deliberate

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
and, informationally (not yet blocking - see the workflow file for why),
`govulncheck` and a dead-code scan.

### Database Workflow (sqlc)

SQL queries live in `db/queries/`. After editing queries or migrations, regenerate Go code:

```bash
cd backend
sqlc generate
```

Never edit files in `db/sqlc/` directly - they are generated. Schema is inferred from `db/migrations/`.

### Architecture

- `cmd/api/main.go` - entry point: loads env, runs migrations, connects DB, inits JWKS, starts Gin router
- `internal/config/` - loads `.env` via `godotenv`
- `internal/database/` - DSN builder, pgxpool connection, `golang-migrate` runner
- `internal/middleware/` - `AuthMiddleware` (validates ThunderID-issued JWTs against JWKS) and `RequireRole` (per-route role gating)
- `db/migrations/` - numbered up/down SQL migrations (golang-migrate format)
- `db/queries/` - raw SQL queries annotated for sqlc
- `db/sqlc/` - generated type-safe query code (do not edit)

### Environment Variables

See `.env.example`. Key vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE`, `PORT`, plus the identity-provider vars used for JWT validation and user management.

### Identity provider (ThunderID)

The backend authenticates against ThunderID exclusively.

- `internal/idp/` - provider-neutral seam: the `Provider` interface (CreateUser/UpdateUser/DeleteUser/AssignRole), the shared `User` return type, and env helpers `JWKSURL()`, `Issuer()`, `RoleID(role)` that resolve to the `THUNDERID_*` vars.
- `internal/authz/` - OpenSchool role constants and token-role resolution, separate from external identity-provider concerns.
- `internal/thunderid/` - the concrete client; satisfies `idp.Provider`.
- `internal/app/` constructs the ThunderID client and injects the provider-neutral `idp.Provider` capability into modules.
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
pnpm test     # vitest
pnpm preview  # preview production build
```

CI (`.github/workflows/frontend-ci.yml`) runs lint, unit tests, build and a
blocking `pnpm audit --prod`; `dompurify` is pinned via `pnpm-workspace.yaml`
overrides until `@thunderid/react` updates.

### Architecture

Authentication is handled by **ThunderID** (`@thunderid/react`). The provider is configured in `main.tsx` via `VITE_THUNDERID_CLIENT_ID`, `VITE_THUNDERID_BASE_URL`, and `VITE_THUNDERID_SCOPES` (see `frontend/.env.example`). Auth state and the access token come from the `useThunderID()` hook (`isSignedIn`/`isLoading`/`getAccessToken`/`signOut`). All routes except `/signin` are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/signin`. Role (`admin`/`teacher`/`student`/`parent`) is read from the `roles` claim of the access token via the `useRole` hook.

- `src/app/main.tsx` - root: `ThunderIDProvider` → `QueryClientProvider` → `BrowserRouter` → `App`
- `src/app/App.tsx` - mounts `ApiAuthBridge` (wires the ThunderID token into the axios client), resolves role from the JWT and renders one of four route trees (admin/teacher/student/parent), each behind its own layout and `ProtectedRoute`; there's no separate URL per role, routing is decided by claim
- `src/shared/` - code with no feature owner: `api/` (axios client, `keys.ts` query-key factory, error helpers), `auth/` (`useRole`, `ProtectedRoute`, idle logout, password policy), `ui/` (shared components: `DataGrid`, `FilterBar`, `ActiveFilterTags`, `ListState`, `FormModal`, `ConfirmDeleteModal`, ...), `hooks/`, `lib/` (date, name, phone, constants), `styles/` (SCSS partials; `_tokens.scss` is the only place colours are defined)
- `src/layouts/` - `PortalShell.tsx` renders header + sidebar + `<Outlet>` inside a `RouteErrorBoundary`; the four role layouts only pick a nav config from `layouts/nav/`
- `src/features/<name>/` - one folder per domain (students, teachers, guardians, staff, academics, curriculum, attendance, marks, timetable, notifications, portfolio, positions, school, reports, system, parent, auth). Each holds `api/` (axios wrappers with their types), `queries/` (TanStack hooks), `keys.ts` (query-key factory), `components/` and `pages/` (route targets, split by portal: `admin/`, `self/`, `teacher/`, `student/`). A bug in a domain is fixed inside that one folder
- `src/app/routes/*.routes.tsx` - one lazy route table per portal; `App.tsx` only picks the table for the JWT role
- Layer rules are enforced by ESLint: `api/` files import no React or hooks; nothing outside `api/` touches axios; a feature may use another feature's queries, keys and components but never its pages or api values (types are fine)
- Imports use the `@/` alias (`@/shared/ui/DataGrid`); ESLint rejects `../` parent imports and warns on files over 250 lines
- List pages compose `FilterBar` + `ActiveFilterTags` + `useListFilters` + `ListState` + `DataGrid` (see `features/students/pages/admin/Students.tsx` as the reference) - deviating from that template is a signal something's off, not a style choice. Grids whose rows hold form controls (marks entry, attendance marking, period editor) stay as plain `<table className="os-table">`
- No inline `style={{}}` except for runtime values, and no hex colours outside `_tokens.scss`. Layout and text use the `os-*` utility classes in `shared/styles/_utilities.scss`; state-driven looks use toggle classes such as `is-active`
- Files stay under 250 lines (ESLint error). A page that grows past it moves logic into `features/<name>/hooks/` and markup into `components/`

UI uses **IBM Carbon Design System** (`@carbon/react`, `@carbon/icons-react`). Data fetching uses **TanStack Query** (`@tanstack/react-query`). Styles are SCSS (`index.scss`).

## Data Model

Core entities, enough to orient yourself:

- `User` - accounts with roles: `admin`, `teacher`, `student`, `parent`
- `TeacherProfile` / `StudentProfile` / `Guardian` - extended profile tables linked to `User`
- `School` - single-row table for the instance's school info
- `AcademicYear` - scopes almost all academic data via `academic_year_id` FKs; only one row may have `is_current = true` (enforced by a database constraint since migration 000054 - see [`docs/adr/0003-single-current-academic-year.md`](docs/adr/0003-single-current-academic-year.md))
- `Grade` / `Class` / `Stream` / `StreamGroup` / `Medium` - school structure
- `Subject` / `Level` / `SelectionGroup` - curriculum; selection groups hold the optional subject choices for a level
- `AttendanceSession` / `AttendanceRecord` - attendance tracking per class session

The schema has grown well beyond this (54 migrations, ~67 tables - also
covering timetable, notifications, prefects, staff/positions, student
portfolio, and the audit log). Don't hand-maintain a full list here - see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#4-data-model) for the
current, grouped breakdown, or `db/sqlc/models.go` (generated from the
migrations) for exact columns/types.
