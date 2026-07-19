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

## 3. Set Up Asgardeo

OpenSchool uses [WSO2 Asgardeo](https://wso2.com/asgardeo/) as its identity provider. Asgardeo is a hosted (SaaS) IdP, so there's nothing to run locally — create a free organization at [console.asgardeo.io](https://console.asgardeo.io) and configure it as below.

### 3.1 Create Roles

In the Asgardeo console, go to **User Management > Roles** and create these application-audience roles:

- `admin`
- `teacher`
- `student`
- `parent`

Note down each role's ID (used for `ASGARDEO_ROLE_*` env vars below).

### 3.2 Create the Frontend Application (SPA)

Go to **Applications** and create a new **Single-Page Application**.

- Note down the **Client ID**
- Set the Authorized redirect URL to `http://localhost:5173`
- Under **Protocol > Access Token**, ensure the `roles` claim (and `email`, `given_name`, `family_name`, `username`, `phone_number` if you use them) is included in the token
- Under **User Attributes**, enable the `roles` attribute and activate the `openid`, `profile`, `email`, `roles` scopes

### 3.3 Create the Backend Service Application (M2M)

Go to **Applications** and create a new **M2M Application**.

- Name: `OpenSchool Backend`
- Grant Type: `client_credentials`
- Note down the **Client ID** and **Client Secret**
- Under **API Authorization**, authorize the **SCIM2 Users API** and **SCIM2 Roles API**, granting the `internal_user_mgt_create`, `internal_user_mgt_update`, `internal_user_mgt_delete`, `internal_user_mgt_list`, `internal_user_mgt_view`, `internal_org_role_mgt_view`, and `internal_org_role_mgt_users_update` scopes

This allows the backend to create and manage users and role assignments in Asgardeo programmatically via SCIM2 (see `backend/internal/asgardeo/client.go`).

### 3.4 Create a Test Admin User

Go to **User Management > Users**, create a test user, and assign it the `admin` role created in step 3.1.

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

ASGARDEO_BASE_URL=https://api.asgardeo.io/t/<org-name>
ASGARDEO_TOKEN_URL=https://api.asgardeo.io/t/<org-name>/oauth2/token
ASGARDEO_JWKS_URL=https://api.asgardeo.io/t/<org-name>/oauth2/jwks
ASGARDEO_ISSUER=https://api.asgardeo.io/t/<org-name>/oauth2/token
ASGARDEO_CLIENT_ID=<backend_service_client_id>
ASGARDEO_CLIENT_SECRET=<backend_service_client_secret>

# role ids from Asgardeo (step 3.1)
ASGARDEO_ROLE_STUDENT=
ASGARDEO_ROLE_TEACHER=
ASGARDEO_ROLE_ADMIN=
```

Get `<org-name>` from your Asgardeo organization's console URL. The `ASGARDEO_BASE_URL`/`ASGARDEO_TOKEN_URL`/`ASGARDEO_JWKS_URL` values shown here are the standard Asgardeo endpoint shapes for that org — you shouldn't need to look them up individually.

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

Fill in your `.env` file with the values from your frontend (SPA) application (step 3.2):

```env
VITE_API_URL=http://localhost:8080/api/v1

VITE_ASGARDEO_CLIENT_ID=<spa_client_id>
VITE_ASGARDEO_BASE_URL=https://api.asgardeo.io/t/<org-name>
VITE_ASGARDEO_SCOPES="openid profile email roles"
```

These are read by `AsgardeoProvider` in `frontend/src/main.tsx`.

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
| Asgardeo Console | https://console.asgardeo.io/t/\<org-name\>                 |
| PostgreSQL       | localhost:5432                                              |

---

## 7. Try Signing In

1. Go to `http://localhost:5173`
2. You will be redirected to the sign-in page
3. Sign in with the test admin user you created in step 3.4
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
