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

OpenSchool uses [ThunderID](https://thunderid.dev) as its identity provider. Start it with Docker:

```bash
docker compose -f oci://ghcr.io/thunder-id/thunderid-quick-start:latest up -d
```

This command automatically initializes the database for ThunderID, runs the setup process, and starts the ThunderID server.

Access the ThunderID console at `https://localhost:8090/console` using the default credentials:

- Username: `admin`
- Password: `admin`

### 3.1 Create User Types

Go to **User Types** in the left sidebar and create the following two user types. Self-registration should be disabled for both.

**Student user type**

- Name: `student`
- Organization Unit: Default
- Self-Registration: Disabled
- Attributes:

| Property Name | Display Name  | Type   | Required | Unique | Credential |
| ------------- | ------------- | ------ | -------- | ------ | ---------- |
| username      | Username      | String | Yes      | Yes    | No         |
| email         | Email Address | String | Yes      | Yes    | No         |
| given_name    | First Name    | String | Yes      | No     | No         |
| family_name   | Last Name     | String | Yes      | No     | No         |
| phone_number  | Phone Number  | String | No       | No     | No         |
| password      | Password      | String | Yes      | No     | Yes        |

**Teacher user type**

Same as student but also add:

| Property Name   | Display Name    | Type   | Required | Unique | Credential |
| --------------- | --------------- | ------ | -------- | ------ | ---------- |
| employee_number | Employee Number | String | Yes      | Yes    | No         |

### 3.2 Create Roles

Go to **Roles** in the left sidebar and create these roles:

- `admin`
- `teacher`
- `student`
- `guardian`

### 3.3 Create the Frontend Application

Go to **Applications** and create a new application for the React frontend.

- Choose any web application type
- Note down the **Application ID**
- Set the Application URL to `http://localhost:5173`
- Set the redirect URI to `http://localhost:5173/signin`

Go to **Token Attributes and Response** for this application and add the following attributes to the Access Token:

- `email`
- `given_name`
- `family_name`
- `username`
- `phone_number`
- `roles`

Go to **Available Scopes** and activate: `phone`, `roles`

Go to **Flows** and assign the default authentication flow to the application.

### 3.4 Create the Backend Service Application

Go to **Applications** and create a new **Backend Service** application.

- Name: `OpenSchool Backend`
- Grant Type: `client_credentials`
- Token Endpoint Auth Method: `client_secret_post`
- Note down the **Client ID** and **Client Secret**

Go to **Available Scopes** and add `system` as a custom scope and activate it.

### 3.5 Assign Administrator Role to the Backend Application

Go to **Roles** in the left sidebar, open the **Administrator** role, go to the **Assignments** tab, and assign the **OpenSchool Backend** application to it.

This allows the backend to create and manage users in ThunderID programmatically.

### 3.6 Create a Test Admin User

Go to **Users** and create a new user with the default **Person** user type:

- Username: any
- Email: any
- Password: any
- Assign the `admin`and `Administrator` role to this user

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

THUNDERID_BASE_URL=https://localhost:8090
THUNDERID_OU_ID=<organization_unit_id_from_thunderid_console>
THUNDERID_CLIENT_ID=<backend_service_client_id>
THUNDERID_CLIENT_SECRET=<backend_service_client_secret>
THUNDERID_TOKEN_URL=https://localhost:8090/oauth2/token
THUNDERID_JWKS_URL=https://localhost:8090/oauth2/jwks
THUNDERID_ISSUER=https://localhost:8090

# role ids from thunderid
THUNDERID_ROLE_STUDENT=
THUNDERID_ROLE_TEACHER=
THUNDERID_ROLE_ADMIN=
```

Get the Organization Unit ID from **Organization Units** in the ThunderID console.

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
```

Open `frontend/src/main.tsx` and update the ThunderID configuration with the values from your frontend application:

```tsx
<ThunderIDProvider
  applicationId="YOUR_APPLICATION_ID"
  baseUrl="https://localhost:8090"
  afterSignInUrl="/"
  afterSignOutUrl="/signin"
  ...
>
```

Start the frontend:

```bash
pnpm dev
```

The frontend runs on `http://localhost:5173`.

---

## 6. Verify Everything is Running

| Service           | URL                                      |
| ----------------- | ---------------------------------------- |
| Frontend          | http://localhost:5173                    |
| Backend           | http://localhost:8080                    |
| Swagger UI        | http://localhost:8080/swagger/index.html |
| ThunderID Console | https://localhost:8090/console           |
| PostgreSQL        | localhost:5432                           |

---

## 7. Try Signing In

1. Go to `http://localhost:5173`
2. You will be redirected to the sign-in page
3. Sign in with the test admin user you created in step 3.6
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
