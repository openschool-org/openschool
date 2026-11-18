# Server setup

Installing and running OpenSchool: the database, ThunderID, the backend and
the frontend, plus what a production server needs. Once the app runs, set up
the school itself with the [school setup guide](./school.md).

ThunderID (apps, roles, user types, CORS) is configured once by hand or by
`make setup`; see [`THUNDERID.md`](../THUNDERID.md).

## Prerequisites

- [Go 1.26+](https://go.dev/dl/)
- [Node.js 24](https://nodejs.org/) with [pnpm 12](https://pnpm.io/installation)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- If you'll be editing SQL queries or the database schema: the
  [golang-migrate CLI](https://github.com/golang-migrate/migrate/releases)
  and [sqlc CLI](https://docs.sqlc.dev/en/latest/overview/install.html) -
  ```bash
  go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
  ```
  (make sure `$(go env GOPATH)/bin` is on your `PATH`)

## Quick start

```bash
make setup   # Starts Postgres & ThunderID, configures environment & downloads dependencies
make seed    # (Optional) Seeds a demo class with teachers, students, parents, attendance & term marks
make unseed  # (Optional) Safely removes the demo seeded data without affecting other records
make dev     # Starts backend (:8080) and frontend (:5173) together
```

## Manual setup

```bash
git clone https://github.com/openschool-org/openschool.git
cd openschool

# Postgres
cd backend
docker compose up -d

# ThunderID - one-time setup, see ../THUNDERID.md, then come back here

# Backend - runs migrations automatically on startup (still in backend/)
go mod download
cp .env.example .env   # fill in DB + identity-provider values (see ../THUNDERID.md), plus mail settings (see below)
go run ./cmd/api/main.go

# Frontend
cd ../frontend
pnpm install
cp .env.example .env   # fill in VITE_THUNDERID_* values (see ../THUNDERID.md)
pnpm dev
```

Open `http://localhost:5173`.

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| Swagger UI (dev only, frozen snapshot, see [ADR 0007](../adr/0007-plain-comments-over-swaggo.md)) | http://localhost:8080/swagger/index.html#/ |
| ThunderID console | https://localhost:8090/console |
| PostgreSQL | localhost:5432 |

## Configuration

### Email

Password reset and account activation send email links. Set these in `backend/.env` (see `.env.example` and
[ADR 0009](../adr/0009-transactional-email.md)):

| Setting | Purpose |
| --- | --- |
| `MAIL_PROVIDER` | `resend`, `smtp` or `console`. Left empty, it picks Resend if `RESEND_API_KEY` is set, SMTP if `SMTP_HOST` is set, otherwise console. |
| `RESEND_API_KEY` or `SMTP_*` | Credentials for the chosen provider. Resend also works over SMTP (`smtp.resend.com`, port 465, username `resend`). |
| `MAIL_FROM` | Sender, e.g. `OpenSchool <no-reply@yourschool.lk>`. Must be on a domain you have verified with the provider. |
| `MAIL_REPLY_TO` | Optional; defaults to the school email in Settings > General. |
| `FRONTEND_URL` | The address used in email links. |
| `MAIL_REDIRECT_TO` | Testing only: sends every email to one inbox with a note naming the real recipient. |

For local development, leave the provider empty: links are written to the
backend log instead. Without a verified domain, Resend only delivers to your
own Resend account address, so set `MAIL_REDIRECT_TO` to that address while
testing; the backend warns about this at startup. Outside `APP_ENV=development` the backend refuses to
start with the console provider or with `MAIL_REDIRECT_TO` set. After
starting, **Settings > Email** shows the active provider and sends a test.

### Activation codes

**Activation note:** set `ACTIVATION_CODE_KEY` (see `.env.example`) so unused
activation codes can be reprinted. Without it, codes are shown only once.

### Environment and time

| Setting | Purpose |
| --- | --- |
| `APP_ENV` | `development` turns on Swagger, the console mail sender and skipped TLS checks against a local ThunderID. Use `production` (or leave it unset) on any real server; only an explicit `development` relaxes those checks. |
| `SCHOOL_TIMEZONE` | The school's clock for "today", scheduled jobs and the database session. Defaults to `Asia/Colombo`. |
| `TRUSTED_PROXIES` | The reverse proxy's address(es), or `none` when clients reach the API directly. Required outside development. |

## Production

**TLS:** the backend speaks plain HTTP. A real deployment needs a reverse
proxy or load balancer (nginx, Caddy, Traefik, a cloud LB) terminating
HTTPS in front of both the frontend and the backend; without it, Bearer
tokens are sniffable in transit. See `deploy/nginx.conf.example` for a
reference config (TLS, security headers, `X-Forwarded-For`, static asset
caching) and set `TRUSTED_PROXIES` to that proxy's address.

**Postgres:** `docker-compose.yml` publishes Postgres on
`127.0.0.1` only. Change `DB_PASSWORD` from the `postgres` default before
the first start, since it is set when the volume is created.

**Secrets:** `backend/.env` holds `DB_PASSWORD`,
`SMTP_PASSWORD` or `RESEND_API_KEY`, `ACTIVATION_CODE_KEY` and
`THUNDERID_CLIENT_SECRET`. Don't leave it world-readable
on the host - use Docker/systemd secrets or an equivalent secret store, and
set the file mode to `600` if it must be a plain file. Never commit a real
`.env`, and never log its contents. Rotate the SMTP and DB passwords
periodically and after any suspected exposure (S16).

**Postgres tuning and backups:** the defaults in
`docker-compose.yml` are fine for local development, not for a real
deployment. Set `shared_buffers` to ~25% of the host's RAM, tune `work_mem`
for the sort-heavy report/dashboard queries, confirm autovacuum is on (the
default), and `REINDEX` the `pg_trgm` indexes from migration `000041`
weekly, since trigram GIN indexes fragment faster than btree under regular
writes. For backups, set `BACKUP_AGE_RECIPIENT` and `BACKUP_OFFSITE_DIR`
(see `backend/.env.example`, S11) and run a **restore drill quarterly**:
restore the latest encrypted dump into a scratch database and confirm the
app can start against it — an untested backup is not a backup.

To restore, use `scripts/restore.sh BACKUP_FILE TARGET_DB [AGE_IDENTITY_FILE]`.
It decrypts a `.dump.age` file with your age key, checks the dump, creates
the target database if needed and restores into it, then prints the
migration version and student count. For a drill, restore into a new name
such as `openschool_restore`; restoring over the live `DB_NAME` asks you to
type the name first. Mount the API's backup directory (`JOB_BACKUP_DIR`,
`/home/openschool/backups` in the image) on a volume, or a container rebuild
loses every local backup.

## Starting over

Everything above is idempotent in the sense that you can wipe app data and
redo it, but the two pieces live in different systems:

- **App data** (school, grades, classes, students, teachers, attendance,
  …) lives in Postgres. To reset it:
  ```sql
  TRUNCATE TABLE
    academic_years, activation_codes, activation_email_tokens,
    attendance_records, attendance_sessions, audit_logs, class_students,
    class_subject_teachers, classes, classrooms, grade_section_grades,
    grade_sections, grades, group_subjects, guardians, houses, job_runs,
    job_settings, levels, mediums, non_academic_staff,
    notification_recipients, notifications, password_reset_tokens,
    pending_identity_erasures, prefects, promotion_policies, school,
    section_heads, selection_groups, societies, society_members,
    staff_attendance_records, stream_groups, streams,
    student_activities, student_awards, student_disciplinary_records,
    student_enrollment_locks, student_guardians, student_intakes,
    student_leadership_roles, student_profiles,
    student_progress_reports, student_siblings,
    student_subject_enrollments, subject_period_requirements, subjects,
    teacher_availability, teacher_positions, teacher_profiles,
    teacher_subjects, term_marks, terms, timetable_entries,
    timetable_option_block_classes, timetable_option_block_subjects,
    timetable_option_blocks, timetable_periods, timetable_settings,
    timetable_status_history, timetables, users,
    vice_principal_grade_scopes, workflow_runs
  RESTART IDENTITY CASCADE;
  ```
  `activation_settings` is left out on purpose: it holds one settings row
  created by a migration, and activation stops working without it.

  This does **not** delete the corresponding identities (student/teacher/
  admin accounts) on ThunderID - those are a separate system and need to be
  removed there too if you want a truly clean slate.
- **Identities and roles** (ThunderID users, apps, roles, user types) are
  untouched by the above - see [`THUNDERID.md`](../THUNDERID.md) for managing those directly.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `schema_validation_failed` (`USR-1019`) creating a student/teacher | An identity-provider-side user-type schema field doesn't match what the backend sends - see the equivalent entry in [`THUNDERID.md`](../THUNDERID.md)'s troubleshooting table. |
| The API stops at start with `TRUSTED_PROXIES is required outside development` | Set it to your proxy's address, or `none` if nothing sits in front of the API. For local work set `APP_ENV=development`. |
| The API stops at start with `an email provider is required in production` | Set `RESEND_API_KEY` or `SMTP_HOST`, or set `APP_ENV=development` for local work. |
