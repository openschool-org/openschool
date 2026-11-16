# OpenSchool: open issues from the 12 Oct 2026 review

The review (fragility 63/100) listed security issues S1-S9, decisions V1-V6,
engineering issues E1-E13 and hardening items. On 16 Nov 2026 each one was
checked against the code. Fixed items are listed briefly at the end; this
file keeps only what is still open. Delete a row when it is done, and the
file when it is empty.

## Still open

| ID | Sev | Issue | What is needed |
|---|---|---|---|
| S5 | Low | Change password does not ask for the current password, so a stolen 1-hour token can take over the account. | ThunderID needs to verify the current password. The backend client has no call for that today (`internal/thunderid/client.go`). Add one, then a `current_password` field to `POST /auth/change-password` (not for the forced first-login change). A token-age check was rejected: silent refresh keeps tokens fresh. |
| E8 | Medium | Unknown errors still map to HTTP 400 with their text (`apierror.Respond` default), so identity provider outages look like client errors. | Give domain errors a type (or sentinel) per module, then make the default 500. Changing the default alone would turn every hand-written 400 message into a 500. |
| E10 | Medium | Low unit-test coverage in curriculum, academics, people, notifications, leave and workflows; few frontend role-guard tests. | Ongoing. The S2, S3, S4 and S6 paths now have regression tests. |
| E13 | Low | Leave counts weekdays only; Poya and school holidays are charged. | A holiday table, admin screen and use in `leave/rules.go`. |
| CI restore drill | Low | `scripts/restore.sh` restores a backup (checked by hand on 16 Nov 2026) but CI does not run it. | A CI job that dumps a migrated database and restores it with the script. Needs matching `pg_dump` and server versions on the runner. |
| Revoked access | Low | Deleted, resigned or left accounts keep API access until their token expires (up to 1h). | A per-request check of `users.is_active` (cached), or a short token lifetime. |
| Action pinning | Low | GitHub Actions are pinned by tag (`@v4`), not by commit SHA (the k6 action is SHA-pinned). | Pin `actions/checkout`, `actions/setup-go`, `actions/setup-node` and `pnpm/action-setup` to SHAs. |

## Decisions for the maintainers

| ID | Question |
|---|---|
| V1 | The JWT audience check was removed in `56f952a` ("Fix #98"); `THUNDERID_AUDIENCE` is still in `.env` but unused. Turning it back on locks everyone out if the token's `aud` differs. Find the SPA token's real `aud`, then restore `jwt.WithAudience`. |
| V4 | `RequireStudentAccess` lets any teacher read any student's guardians, discipline, progress reports and enrolments, and `GET /guardians` is school-wide. Should these be scoped to the teacher's classes like `GET /students/:id` now is? |
| V5 | "By subject" notifications are gated on a teacher's qualification, not their assignment, and reach every student taking the subject. Is that the intended reach? |

## Fixed on 16 Nov 2026

- **S1** Per-account limiter reads the field case-insensitively, tolerates other fields, refuses a body without it and caps it at 4 KiB. Forgot-password returns the same 200 for a match and a mismatch. Regression tests added.
- **S2** Attendance refuses students not enrolled in the session's class (no record, no absence notice). Test added.
- **S3** Teachers get the student list without contact fields or remarks, and `GET /students/:id` needs a class they teach or lead. Tests added.
- **S4** Marks can only be written to, or deleted by a teacher from, a term of the class's academic year.
- **S6** Activation attempts are counted in one atomic `UPDATE` before the compare.
- **S7** First admin is created under a Postgres advisory lock; the loser removes its ThunderID account.
- **S8** Password, forgot-password and student enrolment errors no longer return raw IdP, SMTP or SQL text.
- **S9** `ContextWithFallback` is on, so the 15s deadline reaches every handler.
- **V2** Only an explicit `APP_ENV=development` relaxes mail, TLS and Swagger; unset counts as production. Documented in SETUP.
- **V3** Postgres is published on `127.0.0.1` only.
- **V6** The unused student submit and confirm enrolment routes were removed.
- **E1** Student, teacher and intake rollbacks run on their own deadline, are logged, and failed steps go to the hourly identity-erasure retry.
- **E2** Workflow after-apply work (intake logins) runs in the background with a 30 minute limit and logs a created/failed count.
- **E3** Each scheduled job takes a Postgres advisory lock, so replicas do not double-run it.
- **E4** Already fixed by the keyfunc library (the first JWKS fetch may fail); unknown keys now refetch every 30s instead of 5 min.
- **E5** `SCHOOL_TIMEZONE` (default Asia/Colombo) sets the process clock, cron schedules and the database session; zone data is embedded.
- **E6** `scripts/restore.sh` restores plain or age-encrypted backups; SETUP documents it and the backup volume.
- **E7** `TRUSTED_PROXIES` is required outside development (`none` for direct access); per-account limiting was already in place.
- **E9** CI runs the integration tests for every package.
- **E11** The audit service logs every failed write; absence notice failures are logged.
- **E12** Grades, houses and mediums revalidate on every load (ETag gives a 304).
- **Hardening** CI `permissions: contents: read` on both workflows; staticcheck, govulncheck and deadcode pinned; load-test secrets passed through env and the token file always removed; ThunderID image pinned by digest; `frame-ancestors 'none'` and `nosniff` in both nginx configs; offline timetable copies cleared on sign-out; reset links revoked when a new one is issued or the password changes; `jwt.WithExpirationRequired`; notification title and message capped at 200 and 5000 characters; CSV export defuses leading tab and carriage return; orphan-account delete accepts only a UUID.
