# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenSchool is a self-hosted school management system. It is a monorepo with two workspaces:

- `backend/` — Go REST API (Gin framework)
- `frontend/` — React SPA (Vite, TypeScript, Carbon Design System)

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
go test ./...
go test ./path/to/package  # single package
```

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
- `internal/middleware/` — `AuthMiddleware` (validates Asgardeo-issued JWTs against JWKS) and `RequireRole` (per-route role gating)
- `internal/asgardeo/` — SCIM2 client used to provision/update/delete users and assign roles in Asgardeo
- `db/migrations/` — numbered up/down SQL migrations (golang-migrate format)
- `db/queries/` — raw SQL queries annotated for sqlc
- `db/sqlc/` — generated type-safe query code (do not edit)

### Environment Variables

See `.env.example`. Key vars: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSLMODE`, `PORT`, plus the `ASGARDEO_*` vars (base/token/JWKS/issuer URLs, client credentials, role IDs) used for JWT validation and SCIM user management.

> `internal/thunderid/` and the `THUNDERID_*` env vars are leftover from the previous identity provider and are no longer wired into `main.go` or any route/service/handler — treat them as dead code pending removal, not as active configuration.

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

### Architecture

Authentication is handled by **WSO2 Asgardeo** (`@asgardeo/react`). The provider is configured in `main.tsx` via `VITE_ASGARDEO_CLIENT_ID`, `VITE_ASGARDEO_BASE_URL`, and `VITE_ASGARDEO_SCOPES` (see `frontend/.env.example`). All routes except `/signin` are wrapped in `ProtectedRoute`, which redirects unauthenticated users to `/signin`. Role (`admin`/`teacher`/`student`/`parent`) is read from the `roles` claim of the Asgardeo access token via the `useRole` hook.

- `main.tsx` — root: `AsgardeoProvider` → `QueryClientProvider` → `BrowserRouter` → `App`
- `App.tsx` — route definitions; `ProtectedRoute` guards the root layout
- `src/layouts/RootLayout.tsx` — Carbon `Header` with nav; `<Outlet>` for page content
- `src/pages/` — route-level page components
- `src/components/` — shared components

UI uses **IBM Carbon Design System** (`@carbon/react`, `@carbon/icons-react`). Data fetching uses **TanStack Query** (`@tanstack/react-query`). Styles are SCSS (`index.scss`).

## Data Model

Core domain entities (from `db/sqlc/models.go`):

- `User` — accounts with roles: `admin`, `teacher`, `student`, `parent`
- `TeacherProfile` / `StudentProfile` / `Guardian` — extended profile tables linked to `User`
- `School` — single-row table for the instance's school info
- `AcademicYear` — scopes all academic data; only one row should have `is_current = true` (enforced at app level)
- `Grade` / `Class` / `Stream` / `StreamGroup` — school structure
- `Subject` / `SubjectBucket` — curriculum; buckets group optional subject choices per grade
- `AttendanceSession` / `AttendanceRecord` — attendance tracking per class session
