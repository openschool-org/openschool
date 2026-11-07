# OpenSchool: issues and fragility review

Date: 12 Oct 2026. Branch `development` at `21f3d47`, plus the uncommitted leave-module fixes from this session.

## Verdict

**Fragility: 63 / 100** (100 = falls over constantly).

The code is not careless. The core write paths have authorization, the workflow engine uses row locks and transactions, tokens are hashed, and every Postgres integration test passes. It is fragile at three seams:

1. **Authorization is uneven.** Teacher writes are mostly scoped to their own classes, but teacher reads are mostly school-wide, and three write paths skip a check that their sibling paths have.
2. **The database and ThunderID are not kept in step.** Account creation, edits, deletes and rollbacks across the two systems use five copy-pasted patterns with three different levels of care. Failures are swallowed.
3. **It only really works on a single box.** Cron, rate limits and backups are in-process or on local disk. There is no timezone handling and no restore path. The API cannot start while the IdP is down.

One careful deployment on one server mostly works. A ThunderID restart, a second replica, a 200-student intake, a real restore, or a teacher who goes looking is where it breaks.

## How this was produced

- Followed `scurity-audit-test/skills/security-audit` in full-audit mode (quick profile), source-only:
  - 4 reconnaissance agents
  - 6 hunters over 19 coverage units
  - 1 coverage critic
  - 4 independent verifiers
  - 1 separate engineering reviewer
- Only findings that a second, independent agent re-traced in source are listed as confirmed. Engineering claims were spot-checked by hand, and one was dropped as wrong.
- Limits:
  - No sandbox, so nothing was executed for the audit.
  - The skill's validators (`report-schema.json`, `validate-*.cjs`) are missing from the folder, so the run is marked `incomplete`.
  - 12 surfaces were found but not hunted (see "Not covered").
- Raw artifacts are in `~/security-audit-skill/openschool/run-1/`.

---

## 1. Review comments on the leave module (done this session, not committed)

| # | Comment | Result |
|---|---|---|
| 1 | `academic_year_id` on `teacher_leave_relief` | **Skipped.** `class_id` is `NOT NULL` and `classes.academic_year_id` is `NOT NULL`, so the year is already derived. A copy would only add drift. |
| 2 | Year filters with `EXTRACT` | Fixed. `start_date >= make_date(year,1,1) AND start_date < ... + 1 year` in three queries. |
| 3 | Per-row relief inserts | Fixed. `:copyfrom` bulk insert. |
| 4 | `exclude_teacher_id` open to any teacher | Fixed. A value other than the caller's own ID now needs approver rank (403 otherwise). |
| 5 | Limit checks outside the transaction | Fixed. `create` locks the teacher row (`FOR NO KEY UPDATE`) and runs the checks in the same transaction. A new concurrency test fails 2 of 3 runs without the lock and passes 3 of 3 with it. |
| 6 | End date not synced for half days | Fixed in `useLeaveForm.set`. |
| 7 | One candidates request per row | Fixed. New `GET /leave/relief-candidates/batch?slot=DATE:N` (max 120). The table makes one call. |
| 8 | Submit while periods are loading | Fixed. `isValid` waits for a successful, non-fetching periods query. |

Checks run:
- Backend: `go build`, `go vet`, `staticcheck` clean. `go test ./...` pass. Full `-tags integration` suite passes on local Postgres.
- `golangci-lint`: 24 issues, all pre-existing (same count before the change).
- Frontend: `pnpm lint`, `tsc -b` and `pnpm test` (50 tests) pass.

---

## 2. Confirmed security issues

| ID | Sev | Issue | Who can do it |
|---|---|---|---|
| S1 | **High** | Per-account brute-force limit on forgot-password can be switched off; endpoint is a yes/no oracle on NIC / index number | Anyone, no login |
| S2 | Medium | Teacher can write attendance, and send "absent" notices to parents, for students not in their class | Any teacher with one class |
| S3 | Medium | Every teacher can read every student's address, phone, WhatsApp, special remarks, index number and any class roster | Any teacher |
| S4 | Medium | Subject teacher can overwrite or delete a student's marks from past (or future) academic years | Subject teacher |
| S5 | Low | Change password needs no current password | Anyone holding a token |
| S6 | Low | Activation "5 wrong tries" lockout is a race | Holder of a lost activation slip |
| S7 | Low | Two concurrent first-run setups can both create an admin | Anyone, before setup |
| S8 | Low | Public reset endpoints and student enrolment return raw DB / SMTP / IdP error text | Anyone / student |
| S9 | Low | Handlers that pass `*gin.Context` never get the 15s deadline | Any caller (reliability) |

### S1. Rate-limit bypass and forgot-password oracle (High)
- **Where:**
  - `backend/internal/middleware/ratelimit.go:136-140` and `:93`
  - `backend/internal/modules/auth/routes.go:23`, `auth/handler.go:24-35`
  - Same limiter on `activation/routes.go:15-17`
- **Bug:** the limiter reads the key by decoding into `map[string]string`. One non-string field (`"pad":1`) or a different key case (`"Identifier"`) gives an empty key, and an empty key means "no limit". The handler still binds the body.
- **Impact:**
  - The 5-per-hour-per-account cap (control S2) becomes 1 request per second per IP.
  - Forgot-password returns 400 on mismatch and 200 on match. The caller learns whether a guessed NIC or index number belongs to an email.
  - That number is the default password of every admin-created account.
- **Fix:**
  - Decode into `map[string]json.RawMessage`, look the key up case-insensitively, and reject the request if the field is missing.
  - Bind with `httpx.BindStrict`.
  - Return the same 200 for match and mismatch.
  - Add a regression test with the three body shapes.

### S2. Attendance for students outside the class (Medium)
- **Where:**
  - `attendance/service.go:290-339`
  - `db/queries/attendance.sql:62`
- **Bug:** the session's class is authorized, but `student_id`s in the body are never checked against `class_students`. Term marks do this check. Attendance does not.
- **Impact:**
  - False records in any student's history (parents and students see them).
  - A real "marked absent" notification to that student's guardians.
- **Fix:** reject IDs not enrolled in `session.ClassID` before `markBatch`.

### S3. Student PII open to every teacher (Medium)
- **Where:**
  - `people/students_routes.go:69-106`
  - `people/guardians_routes.go:205`
  - `db/queries/students.sql:66` (`sp.*`)
- **Bug:** `GET /students?class=X` returns the full roster with contact data. `GET /classes/:id/students` blocks the same teacher with `RequireClassAccess`. `docs/FEATURES.md:60-70` says rosters are scoped.
- **Fix:**
  - For non-admins, return a picker projection: id, names, class, house.
  - Hide index number the way NIC is hidden.
  - Put `RequireStudentWorkAccess` on `/students/:id`.

### S4. Marks in other academic years (Medium)
- **Where:**
  - `academics/term_marks.go:35-110`
  - `db/queries/term_marks.sql:13`
- **Bug:** `term_id` is never checked against the class's year, and terms have no lock. The upsert overwrites last year's mark. `DeleteMark` deletes any year's mark for a current student.
- **Fix:** require `term.academic_year_id = class.academic_year_id`. Consider a term "closed" flag.

### S5. Change password without the current password (Low)
- **Where:** `auth/models.go:39`, `auth/service.go:171`.
- **Impact:** a stolen 1-hour token becomes permanent takeover.
- **Fix:** add a `current_password` field and verify it with ThunderID first.

### S6. Activation lockout race (Low)
- **Where:** `activation/service.go:114-126`, `activation.sql:106-111`.
- **Bug:** the lock is read, then the identifier is compared, then the failure is recorded, in separate statements. Combined with S1, guesses per window go from 5 to roughly 5 per IP.
- **Fix:** an atomic conditional `UPDATE ... RETURNING` before the compare.

### S7. First-admin setup race (Low)
- **Where:** `setup/service.go:46-83`.
- **Bug:** count, then IdP create, then recount, then insert, with no lock. A request that lands during the operator's setup gets a silent second admin.
- **Fix:** `pg_advisory_xact_lock` around the count and insert, and delete the loser's IdP user.

### S8. Raw error text to the client (Low)
- **Where:**
  - `auth/handler.go:31,51` (public)
  - `selfservice/student.go:153` (a student can trigger an FK error leak on demand with a random `academic_year_id`)
- **Leaks:** SMTP host:port, internal ThunderID URL, table and constraint names. This contradicts `ARCHITECTURE.md:516`.
- **Fix:** route through `apierror.Respond` / `RespondInternal`.

### S9. Request timeout not applied (Low, reliability)
- **Where:** `cmd/api/main.go:116`, `middleware/timeout.go:16`.
- **Bug:** gin forwards the deadline only when `ContextWithFallback = true`, which is never set. Leave, attendance, people, academics and others pass `c`, so their DB work has no deadline and survives client disconnect. Only `statement_timeout` (10s per statement) applies. The new relief batch endpoint inherits this.
- **Fix:** one line, `r.ContextWithFallback = true`. Check provisioning rollbacks afterwards (see E1).

---

## 3. Needs your decision or a deployment check (no severity yet)

| ID | Issue | What decides it |
|---|---|---|
| V1 | JWT audience check was removed in `56f952a` ("Fix #98"). Any RS256 token from the same ThunderID issuer is accepted, and roles are trusted from the token. `ARCHITECTURE.md:174,506` still says audience is checked. | Do Console or m2m tokens carry `roles`? Restore `WithAudience` once the SPA `aud` value is known. Fix the docs either way. |
| V2 | `.env.example` ships `APP_ENV=development`. That turns off TLS verification for JWKS and for the IdP admin client (which sends the client secret), and exposes Swagger. The mail production check runs only on exactly `production`, so an unset value lets the console mailer log reset links. `SETUP.md` never tells operators to set `APP_ENV`. | What real schools run. Make every gate fail closed regardless. |
| V3 | `backend/docker-compose.yml` publishes 5432 on `0.0.0.0` with `postgres/postgres`. Docker publishing bypasses ufw. | Whether any school runs it as-is. Bind to `127.0.0.1` and generate the password in `setup.sh` anyway. |
| V4 | `RequireStudentAccess` lets any teacher read any student's guardians, disciplinary records, progress reports and enrolments. `GET /guardians` is also school-wide. | Docs contradict each other (`ARCHITECTURE.md:512` vs `FEATURES.md:60`). If reads should be scoped, this is Medium. |
| V5 | "By Subject" notifications are gated on teacher qualification (`teacher_subjects`), not assignment, and fan out to every student taking the subject school-wide. | Intended reach (`FEATURES.md:55-71` vs `:533`). |
| V6 | `POST /me/student/enrollments` accepts any `level_id` and `academic_year_id`. It can skew year-end placement and block a rollover revert. No UI calls it. | Remove the route, or bind it to the student's grade and the current year. |

---

## 4. Engineering fragility (verified)

| ID | Sev | Issue | Evidence | Fix |
|---|---|---|---|---|
| E1 | High | DB and ThunderID provisioning are not atomic. Rollbacks ignore errors (`_ = s.idp.DeleteUser`) and record nothing, so a failed rollback leaves a working login (password = index or NIC) with no profile. Five copy-pasted provisioning paths. | `people/students.go:136-139`, `people/teachers.go`, `workflows/intake.go`. `activation/service.go` does it right (fresh context, logged). | One shared `provision()` helper, plus an outbox or pending-erasure row on rollback failure. |
| E2 | High | Student Intake creates accounts one by one (3 IdP calls each) inside the 15s request deadline. After the deadline every remaining account fails and is only logged, so some students silently get no login. | `workflows/routes.go:162` (`c.Request.Context()`), `workflows/service.go:251`, `intake.go:412-416` | Run AfterApply as a background job with per-student status. |
| E3 | High | Cron runs in-process with a local mutex only. Two replicas mean double backups and double retention deletes (which delete IdP users). | `automation/scheduler.go:42-56`, no advisory lock anywhere | `pg_try_advisory_lock` per job. |
| E4 | High | API exits at startup if JWKS can't be fetched. An IdP restart or start-order issue crash-loops the API, `/healthz` included. | `cmd/api/main.go:98-100` | Start with an empty key set, refresh in background, 503 until ready. |
| E5 | Medium | No timezone. No `tzdata` or `TZ` in the image, `cron.New()` has no location, 13 `CURRENT_DATE` in SQL, `Asia/Colombo` appears nowhere. The "02:00" backup runs at 07:30 local. Before 05:30 local, "today" is yesterday. | `backend/Dockerfile`, `scheduler.go:42`, `db/queries/*` | Add tzdata, `cron.WithLocation`, set the pgx session timezone. |
| E6 | Medium | Backups exist, restore does not. No `pg_restore` anywhere in the repo, and no shipped manifest mounts the backup volume the Dockerfile asks for. A container rebuild can lose every backup. | `Dockerfile:23-25`, `automation/system_health.go` | Restore script plus a CI restore drill. |
| E7 | Medium | Rate limiting is in memory and per IP. Behind nginx with `TRUSTED_PROXIES` unset (the default), the whole school shares one bucket: 30 rps for everyone, 1 rps on reset and activation. | `cmd/api/main.go:122-142`, `ratelimit.go` | Fail startup in production without `TRUSTED_PROXIES`, and key on the user when there is one. |
| E8 | Medium | Unknown errors map to HTTP 400 with raw text, so IdP outages look like client errors and 5xx alerts never fire. | `apierror/respond.go:36-37` | Default to 500. |
| E9 | Medium | CI never runs the integration tests for `leave`, `workflows` (7 files) or `activation`. Those are the riskiest flows and they hold security regression tests. | `.github/workflows/backend-ci.yml:72`, `Makefile:89` | `go test -tags=integration ./...` |
| E10 | Medium | Core logic is barely unit-tested: curriculum 1.4%, academics 2.2%, people 4.1%, notifications 6.5%, leave 8.1%, workflows 12.4%. The frontend has 21 test files for 516 source files and no role-guard tests. | `go test -cover` | Start with the S2/S3/S4 paths. |
| E11 | Low | Failures are dropped silently: 27 audit `Record` errors ignored, the absence notice uses `_ =`, and golangci-lint reports 20 errcheck issues. | `attendance/service.go:373`, `workflows/service.go:307` | Log at minimum. |
| E12 | Low | `/grades`, `/houses` and `/mediums` send `private, max-age=300`, so an admin's new grade "doesn't appear" for up to 5 minutes. | `middleware/cache.go:30`, `school/module.go:17,29` | `no-cache` with the existing ETag. |
| E13 | Low | Leave days count weekdays only, with no holiday table. Poya days inflate leave used. | `leave/rules.go:88` | Holiday table. |

Dropped after checking: "Intake revert leaves logins behind" is wrong. `WfStudentsInUse` refuses the revert once any account exists (`db/queries/workflows.sql:329-335`).

---

## 5. Hardening (not vulnerabilities, worth doing)

- CI:
  - Add `permissions: contents: read`.
  - Pin actions to SHAs.
  - Pin `staticcheck`, `govulncheck` and `deadcode` instead of `@latest`.
- `load-test.yml`:
  - Pass secrets via `env:`.
  - Delete `TOKENS.json` after the run.
  - Add a protected environment.
- `thunderid/quickstart-compose.yml` uses `:latest` for the IdP. Pin it.
- Shipped `frontend/nginx.conf` has no CSP, nosniff or frame-ancestors. The example config also lacks frame-ancestors.
- Offline timetable cache in `localStorage` is not cleared on sign-out (shared lab PCs).
- Deleted, resigned or left accounts keep API access until the token expires (up to 1h). Resigned teachers keep class access until an admin edits assignments.
- Reset tokens are not invalidated when a new one is issued or the password changes.
- Add `jwt.WithExpirationRequired()`.
- The `PerJSONFieldRateLimit` limiter reads up to 5 MiB before the handler. Cap it at about 4 KiB.
- Notification title and message have no max length (title errors at the DB at 200 chars).
- `csvCell` in `codeSheet.ts` misses leading TAB and CR. Data is admin-entered only today.
- Orphan-account delete passes a raw path parameter into the IdP URL (admin-only). Validate it as a UUID.

## 6. Not covered in this run

The coverage critic found 12 surfaces no hunter reviewed. They are recorded as `deferred` in the ledger:
- parent portal handlers
- student self-service reads
- reference routes open to all logged-in users
- prefect and society reads and writes
- teacher timetable reads and review queue
- position-gated teacher analytics
- staff directory
- workflow apply/revert transitions
- identity reconciliation and job controls
- admin reports, search, audit and mail
- admin structure config

A second run should start there. One quick look: parent list and summary are keyed to the caller, which is fine.

## 7. Suggested order

1. S1 (one middleware function) and S9 (one line).
2. S2, S4 and S3 (scoping checks, each about 20 lines plus a test).
3. E9: turn on the missing CI integration tests, so 1 and 2 stay fixed.
4. Decide V1 to V6. Fix V2 and V3 defaults regardless.
5. E1 to E4: provisioning helper, background intake, job locks, lazy JWKS.
6. E5 and E6: timezone, restore drill.
