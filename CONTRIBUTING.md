# Contributing to OpenSchool

Thank you for your interest in contributing to OpenSchool! This guide will help you get the project running locally.

## Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [Node.js 18+](https://nodejs.org/) with [pnpm](https://pnpm.io/installation)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [golang-migrate CLI](https://github.com/golang-migrate/migrate/releases)
- [sqlc](https://docs.sqlc.dev/en/latest/overview/install.html)

---

## 1. Clone the Repository

```bash
git clone https://github.com/openschool-org/openschool.git
cd openschool
```

---

## 2. Start ThunderID (Identity Provider)

OpenSchool uses [ThunderID](https://thunderid.dev) as its identity provider. Start it using Docker:

```bash
docker compose -f oci://ghcr.io/thunder-id/thunderid-quick-start:latest up
```

> **Note:** This command will automatically:
> - Initialize the database for thunderid
> - Run the setup process
> - Start the ThunderID server

✅ Access ThunderID on **https://localhost:8090/console**

### Configure ThunderID

Once the console is accessible:

1. **Register an Application**
   - Go to **Applications** in the left sidebar
   - Create a new application for OpenSchool
   - Note down the **Application ID**
   - Set the Application URL to `http://localhost:5173`

2. **Create Roles**
   - Go to **Roles** in the left sidebar
   - Create the following roles:
     - `admin`
     - `teacher`
     - `student`

3. **Create a Test User**
   - Go to **Users** in the left sidebar
   - Create a new user with the following mandatory fields:
     - Username
     - Password
     - Email

4. **Set up an Authentication Flow**
   - Go to **Flows** in the Application
   - Ensure the **Default Basic Authentication Flow** is assigned to your application

---

## 3. Frontend Setup

```bash
cd frontend
pnpm install
```

### Configure ThunderID in the Frontend

Open `frontend/src/main.tsx` and replace the ThunderID configuration with your own values:

```tsx
<ThunderIDProvider
  applicationId="YOUR_APPLICATION_ID"   // Replace with your Application ID from ThunderID console
  baseUrl="https://localhost:8090"       // ThunderID server URL
  afterSignInUrl="/"
  afterSignOutUrl="/signin"
  ...
>
```

### Start the Frontend

```bash
pnpm dev
```

✅ Frontend runs on **http://localhost:5173**

---

## 4. Backend Setup

```bash
cd backend
go mod download
```

### Start the Database

```bash
docker compose up -d
```

This starts a PostgreSQL 17 instance on port `5432`.

### Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

The `.env` file should look like this:

```env
APP_ENV=development
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=openschool
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSLMODE=disable
```

### Run Migrations

Migrations run automatically when the backend starts. But if you want to run them manually:

```bash
migrate -path db/migrations \
  -database "postgres://postgres:postgres@localhost:5432/openschool?sslmode=disable" \
  up
```

### Start the Backend

```bash
go run cmd/api/main.go
```

✅ Backend runs on **http://localhost:8080**

You can verify it's working:

```bash
curl http://localhost:8080/health
# {"status":"ok"}

curl http://localhost:8080/test-db
# {"result":1,"success":true}
```

---

## 5. Verify Everything is Running

| Service    | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:5173            |
| Backend    | http://localhost:8080            |
| ThunderID  | https://localhost:8090/console   |
| PostgreSQL | localhost:5432                   |

---

## 6. Try Signing In

1. Go to `http://localhost:5173`
2. You will be redirected to the sign-in page
3. Enter the credentials of the test user you created in ThunderID
4. You should be redirected to the home page after successful sign-in

---

## Need Help?

- Open an [issue](https://github.com/openschool-org/openschool/issues)
- Join the discussion on [GitHub Discussions](https://github.com/openschool-org/openschool/discussions)
