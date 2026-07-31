# Contributing to OpenSchool

Thank you for your interest in contributing to OpenSchool. This guide walks you through setting up the full development environment from scratch.

---

## Prerequisites

Install the following before starting:

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/) with [pnpm](https://pnpm.io/installation)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [golang-migrate CLI](https://github.com/golang-migrate/migrate/releases)
- [sqlc CLI](https://docs.sqlc.dev/en/latest/overview/install.html)
- [swag CLI](https://github.com/swaggo/swag)

Install the Go-based CLI tools:

```bash
go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
go install github.com/swaggo/swag/cmd/swag@latest
```

Add Go binaries to your PATH if not already done:

```bash
echo 'export PATH=$PATH:$(go env GOPATH)/bin' >> ~/.bashrc
source ~/.bashrc oor source ~/.zshrc
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/openschool-org/openschool.git
cd openschool
```

---

## 2. Start the Database

```bash
cd backend
docker compose up -d
```

This starts a PostgreSQL 17 instance on port `5432`.

---

## 3. Set Up ThunderID

OpenSchool uses ThunderID as its identity provider. Follow [`docs/THUNDERID.md`](./docs/THUNDERID.md) for the full one-time setup — starting the ThunderID container, creating the `admin`/`teacher`/`student`/`parent` user types and roles, registering the frontend and backend applications, and creating a test admin user. Come back here once that's done.

---

## 4. Backend Setup

```bash
cd backend
go mod download
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env` file:

```env
APP_ENV=development
PORT=8080

DB_HOST=localhost
DB_PORT=5432
DB_NAME=openschool
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSLMODE=disable

THUNDERID_JWKS_URL=https://localhost:8090/oauth2/jwks
THUNDERID_ISSUER=https://localhost:8090

THUNDERID_BASE_URL=https://localhost:8090
THUNDERID_OU_ID=<organization unit ID>

THUNDERID_CLIENT_ID=<backend Client ID from docs/THUNDERID.md>
THUNDERID_CLIENT_SECRET=<backend Client Secret from docs/THUNDERID.md>
THUNDERID_TOKEN_URL=https://localhost:8090/oauth2/token

# role ids from ThunderID (docs/THUNDERID.md "Create Roles")
THUNDERID_ROLE_STUDENT=
THUNDERID_ROLE_TEACHER=
THUNDERID_ROLE_PARENT=
THUNDERID_ROLE_ADMIN=

THUNDERID_RESOURCE=https://localhost:8090/mcp
```

See [`docs/THUNDERID.md`](./docs/THUNDERID.md#environment-variables) for exactly where each of these values comes from and common pitfalls (TLS scheme, issuer format, auth method).

### Run Database Migrations

Migrations run automatically when the backend starts. To run them manually:

```bash
migrate -path db/migrations \
  -database "postgres://postgres:postgres@localhost:5432/openschool?sslmode=disable" \
  up
```

### Generate sqlc Code

If you make any changes to SQL query files under `db/queries/`, regenerate the Go code:

```bash
sqlc generate
```

This reads `sqlc.yaml` and generates typed Go code in `db/sqlc/`.

### Regenerate Swagger Docs

If you make any changes to handler annotations, regenerate the OpenAPI docs:

```bash
swag init -g cmd/api/main.go
```

The warning about no Go files in the root directory is harmless — ignore it.

### Start the Backend

```bash
go run cmd/api/main.go
```

The backend runs on `http://localhost:8080`. Swagger UI is available at `http://localhost:8080/swagger/index.html`.

---

## 5. Frontend Setup

```bash
cd frontend
pnpm install
cp .env.example .env
```

Fill in your `.env` file with the values from your ThunderID frontend application (see `docs/THUNDERID.md`):

```env
VITE_API_URL=http://localhost:8080/api/v1

VITE_THUNDERID_CLIENT_ID=<frontend Application ID>
VITE_THUNDERID_BASE_URL=https://localhost:8090
VITE_THUNDERID_SCOPES="openid profile email roles"
VITE_THUNDERID_AFTER_SIGN_IN_URL=http://localhost:5173
VITE_THUNDERID_AFTER_SIGN_OUT_URL=http://localhost:5173
```

These are read by `ThunderIDProvider` in `frontend/src/main.tsx`.

Start the frontend:

```bash
pnpm dev
```

The frontend runs on `http://localhost:5173`.

---

## 6. Verify Everything is Running

| Service          | URL                                                       |
| ---------------- | ---------------------------------------------------------- |
| Frontend         | http://localhost:5173                                      |
| Backend          | http://localhost:8080                                      |
| Swagger UI       | http://localhost:8080/swagger/index.html                   |
| ThunderID Console | https://localhost:8090/console                            |
| PostgreSQL       | localhost:5432                                              |

---

## 7. Try Signing In

1. Go to `http://localhost:5173`
2. You will be redirected to the sign-in page
3. Sign in with the test admin user you created in `docs/THUNDERID.md`
4. You should be redirected to the home page after successful sign-in

---

## Development Workflow

### Making changes to SQL queries

1. Edit the relevant file under `db/queries/`
2. Run `sqlc generate`
3. Implement the repository method that calls the generated function

### Making changes to handlers

1. Add or update the handler function
2. Add swaggo annotations above the function
3. Run `swag init -g cmd/api/main.go`

### Branch and PR conventions

- Create a feature branch from `development`: `feature/your-feature-name`
- All PRs should target the `development` branch
- Make sure `go build ./...` passes before submitting

---

## Need Help?

- Open an [issue](https://github.com/openschool-org/openschool/issues)
- Join the discussion on [GitHub Discussions](https://github.com/openschool-org/openschool/discussions)
