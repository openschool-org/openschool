# Security, reliability and operations

Part of the [architecture overview](../ARCHITECTURE.md).

## Security

- All primary-flow authentication/password storage is delegated to
  ThunderID.
- Self-service password-reset tokens (the one credential-like thing
  OpenSchool stores itself) are hashed (SHA-256), single-use, and expire
  in 15 minutes. Token consumption is an atomic conditional update, so one
  reset link cannot be claimed by concurrent requests - see `adr/0005`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and
  `Referrer-Policy: same-origin` are set on every response; no CSP, since
  this is a JSON-only API that never serves HTML.
- CORS origins are an explicit allow-list, not a wildcard.
- The server trusts `X-Forwarded-For` only from `TRUSTED_PROXIES`. Outside
  development that setting is required (the proxy's address, or `none`), so
  per-IP rate limiting can be neither spoofed nor collapsed into one bucket.
- Every request is rate-limited per client IP (default 30 req/s, burst
  60), independent of any endpoint-specific stricter limit (e.g. the
  admin-registration and password-reset endpoints). Every authenticated
  request is *also* rate-limited per account (`PerAccountRateLimit`, same
  defaults, separately tunable) inside the `protected` group, so one
  compromised/misbehaving account can't be masked by a shared-IP allowance.
- Every request body is capped at 5 MiB (`BodySizeLimit`, via
  `http.MaxBytesReader`) - Gin applies no cap by default, so without this a
  client could POST an unbounded body regardless of client-side checks.
- JWT validation happens against ThunderID's live JWKS endpoint (RS256,
  issuer-checked, expiry required). The audience is not checked today
  (`THUNDERID_AUDIENCE` is set but unused). The JWKS HTTP client strips `x5c` certificate chains from the
  response before parsing. Only with an explicit `APP_ENV=development`
  does that client skip TLS verification (for a self-signed local
  ThunderID); unset counts as production.
- Teachers reach a class or its students only through `RequireClassAccess`
  / `RequireStudentWorkAccess` (see [backend](./backend.md)): they must
  teach the class or lead its grade. The school-wide student list they use
  as a picker carries no contact details.
- NIC numbers are initial passwords, so teacher and guardian reads blank
  them for everyone but admins.
- Database error details never reach the client (`apierror`); each failure
  is logged with a request id the client can quote.
- Account activation codes are hash-only (optionally encrypted for
  reprinting), single use, rate limited and locked after repeated wrong
  identifiers - see [ADR 0008](../adr/0008-self-service-account-activation.md).
- `RequireStudentAccess` is a third authorization primitive beyond plain
  role checks, used where a route must additionally confirm the caller
  owns or is linked to the specific student in the URL (not just holds a
  role) - the same narrow authorization pattern applied inside module use
  cases elsewhere.


## Availability and reliability

- Migrations run automatically and idempotently on backend startup; the
  process fails fast (refuses to start serving traffic) if migrations
  fail.
- HTTP read/write timeouts (15s) and idle timeout (60s) bound resource
  usage per connection.
- A nightly `pg_dump` (`internal/modules/automation.SystemHealthAgent`, 02:00
  school time, writes to local disk under `JOB_BACKUP_DIR`, retains the
  newest 14 dumps, encrypted with `BACKUP_AGE_RECIPIENT`) is the only backup
  mechanism; `scripts/restore.sh` restores one - there is no managed database
  failover for this single-instance, self-hosted deployment. The same
  agent checks the DB's applied migration version against what the
  running binary expects, reports drift, and flags a dump whose size is
  anomalously small compared to recent backups.
- Background jobs recover from panics and record every run's
  start/finish/status in `job_runs`, so a single failing or wedged job is
  visible (via the Automation panel) rather than silently stuck or taking
  the process down; each run is bounded by a 5-minute timeout.

## Performance

- Rate-limit defaults are deliberately generous: school users are
  frequently behind one shared IP/NAT, so a tight per-IP limit would
  throttle an entire school rather than an individual abusive client.
  Tunable via environment variables without a code change.
- Bulk operations that touch many rows at once (e.g. promotion commit) use
  batched, set-based SQL writes rather than per-row loops where this
  pattern has been applied - not yet applied uniformly everywhere a
  per-row loop exists today.
- Every request has a 15-second deadline that reaches the database calls;
  long work after a workflow apply (intake logins) runs in the background.
- No load testing has been performed against a realistic full-school
  concurrent-usage pattern (e.g. a morning attendance-marking rush); rate
  limit and DB pool defaults are provisional pending that.

## Maintainability

- Each backend module keeps the same shape (routes, use cases,
  `repository.go` adapter) and an architecture test enforces that only
  repository files import `db/sqlc`.
- Generated code (`db/sqlc/`, Swagger docs) is never hand-edited - always
  regenerated from its source of truth.
- One consistent CRUD-page template across the frontend admin portal's
  ~40 pages.
