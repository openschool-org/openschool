## OpenSchool Backend

The OpenSchool backend is a REST API for school management.
It is built as a single Go binary that runs one HTTP server and connects to
one PostgreSQL database.

The backend uses:

- Go 1.25
- Gin for HTTP routing
- PostgreSQL for persistent data
- sqlc for type-safe database queries
- golang-migrate for database migrations
- ThunderID for authentication and user management

### Backend structure

The backend is a modular monolith. It is one deployable application, but each
business area owns its routes, request/response types, application logic,
repository adapter, and tests.

```text
cmd/api/                 Application entry point
internal/app/             Composition root and dependency wiring
internal/modules/         Business modules such as academics, people, and attendance
internal/middleware/      Authentication, roles, security headers, and limits
internal/platform/        Shared HTTP/platform helpers
internal/ports/           Small interfaces used between modules
internal/idp/             Provider-neutral identity-provider contracts
internal/thunderid/       ThunderID client implementation
db/migrations/            Numbered PostgreSQL up/down migrations
db/queries/               SQL queries used by sqlc
db/sqlc/                  Generated Go database code; do not edit manually
```

### Local setup

From the repository root:

```bash
cp backend/.env.example backend/.env
cd backend
docker compose up -d
go run ./cmd/api
```

The API starts on `http://localhost:8080` by default. The frontend normally
runs on `http://localhost:5173`.

The API applies all migrations automatically when it starts. The database
connection is configured through the `DB_*` variables in `.env`.

ThunderID must also be running when using authenticated endpoints. The normal
repository setup can start all required services:

```bash
cd ..
make setup
make dev
```

Do not commit `backend/.env` or real ThunderID credentials.

### Database migrations

Create a new migration in `db/migrations/` with matching `up` and `down` SQL
files. Migration names are ordered, for example:

```text
000041_add_example.up.sql
000041_add_example.down.sql
```

The API runs pending migrations on startup. To apply them manually from the
repository root:

```bash
make migrate
```

To roll back only the latest migration:

```bash
make migrate-down
```

After changing a migration or SQL query, regenerate sqlc code:

```bash
make sqlc
```

Never edit files under `db/sqlc/` directly. The source of truth is the SQL in
`db/queries/` and the schema in `db/migrations/`.

### Build and test

Run these commands from `backend/`:

```bash
go test ./...
go vet ./...
go build ./...
```

The CI checks also run Staticcheck:

```bash
go run honnef.co/go/tools/cmd/staticcheck@latest -tags=integration ./...
```

Database-backed integration tests need a PostgreSQL connection. Set
`TEST_DATABASE_URL` to a PostgreSQL database that the test process may use;
the tests create and remove isolated temporary databases automatically.

Example:

```bash
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable" \
  go test -count=1 -tags=integration ./internal/modules/academics
```

To run the configured backend integration suite from the repository root:

```bash
make test-integration-backend
```

### Development guidelines

When adding or changing backend behavior:

1. Put the code in the module that owns the business capability.
2. Keep SQL access inside that module's `repository.go` adapter.
3. Map sqlc rows to module-owned types at the repository boundary.
4. Use a narrow interface in `internal/ports` for cross-module capabilities.
5. Add or update unit tests for business rules.
6. Add an integration test when the behavior depends on PostgreSQL, a
   transaction, authorization scope, or an external boundary.
7. Keep existing API routes and payloads compatible unless the change is
   intentional and documented.

Before opening a pull request, run:

```bash
go test ./...
go vet ./...
go build ./...
git diff --check
```

For the module layout and dependency rules see
[`../docs/architecture/backend.md`](../docs/architecture/backend.md); for the
wider picture and the complete feature map see
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md),
[`../docs/FEATURES.md`](../docs/FEATURES.md), and the architecture decision
records in [`../docs/adr/`](../docs/adr/).

### API documentation

When `APP_ENV=development`, Swagger is available at:

```text
http://localhost:8080/swagger/index.html
```

The OpenAPI files in `docs/` are a frozen snapshot, not regenerated from
source; see [ADR 0007](../docs/adr/0007-plain-comments-over-swaggo.md).
