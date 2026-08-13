# OpenSchool Feature Roadmap

> **Open-items tracker.** Completed work has been trimmed from this document —
> see [`FEATURES.md`](./FEATURES.md) for the current, as-built feature list,
> and git history for how each phase was implemented. This file tracks only
> what's still outstanding.

**Role-hierarchy decision:** the position hierarchy (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher) is implemented as an **in-app position/title layer** on top of the existing 4 ThunderID-backed roles (`admin`/`teacher`/`student`/`parent`), *not* as new identity-provider roles. Reasoning: the role column is 1:1 with ThunderID's IDP role config, and two prior silent production failures were caused by hand-typed strings that have to match out-of-repo ThunderID console configuration. Adding new IDP roles would repeat that exact risk on every environment.

**Phases 1–10 are complete** (session timeout, guardian directory, attendance locking, role hierarchy, promotion/medium-locked classes, staff & profile expansion, analytics/CRUD polish, NIC & password lifecycle, pre-release hardening/deepened dashboard, and the code quality/style refactor). No open items remain in them beyond what's listed below.

---

## Design principles (cross-cutting)

| Principle | Where it lives |
|---|---|
| Role-Based Access Control | Position layer (Phase 4) |
| Academic Year separation | Enforced everywhere via `academic_year_id` FKs + the `is_current` single-row pattern |
| Complete audit logging | `audit_logs` table + `AuditService`, covers house/attendance/account/position changes |
| Soft deletion | Guardian delete-blocked-while-linked pattern |
| Historical record preservation | Promotion never deletes prior-year rows; prefect board archive |
| Responsive, accessible UI | Carbon Design System baseline |
| Modular architecture | `internal/services`/`internal/repositories` layering |
| Secure authentication | ThunderID |
| Scalable DB design, bulk operations, performance | Batched bulk-update work (promotion); load test still open, below |

---

## Open items backlog

Everything still outstanding, in one place (deduplicated from the former per-phase carryover and pre-v1 checklist sections):

- **CI hardening** — `pnpm audit`, `govulncheck`, and `staticcheck`/`deadcode` are still informational-only in CI (`continue-on-error: true`); flip to blocking once the items below are resolved. `pnpm audit --prod` now flags only `react-router` and `dompurify` (down from 5 packages — `brace-expansion`/`immutable`/`postcss` are already clean); both remaining ones are transitive via `@thunderid/react`, not direct deps, so they need an upstream bump rather than a local one.
- **Teacher self-service profile edit (product decision needed)** — `PUT /teachers/:id` (`internal/routes/teacher.go`) is admin-only today, so a teacher has no way to update their own phone number/title. If wanted, add a dedicated `/me/teacher` `PUT` that only lets a teacher touch their own row (check `actor.ID` against the resolved `teacher.UserID`), not an arbitrary `:id`.
- **ThunderID attribute-name fragility (Low, informational)** — hand-typed identity-provider attribute/type-name strings have to match out-of-repo ThunderID console configuration, failing silently at runtime rather than at build/test time (root cause of two prior production bugs). Consider a small integration test exercising `CreateTeacher`/`ProvisionLogin`/`CreateStudent` against a real or recorded ThunderID response, or centralizing the attribute-name constants in one place.
- **Load test — script prepared, not yet run.** `backend/scripts/loadtest_attendance_rush.js` (k6) simulates a morning attendance rush. Needs a seeded dataset and real teacher access tokens (ThunderID has no OAuth2 `password` grant, so tokens must come from a real sign-in flow). Run it by hand before trusting the current DB-pool (25/5) and rate-limit defaults for a real rollout.
- **Unbounded list endpoints** — several `teacherOrAdmin`/`admin` list routes (`/students`, `/teachers`, `/notifications/sent`, etc.) return the entire table in one response with no pagination. Fine at the current ~2,500-student scale; add server-side pagination before a much larger school or a shared multi-tenant deployment makes that response size a real DoS/performance vector.
- **Redis-backed rate limiting** — the per-IP and per-account limiters (`internal/middleware/ratelimit.go`) are in-process and token-bucket only, resetting on restart with no shared state across instances. Move to a shared store (Redis) before running more than one backend instance. Deliberately deferred — infrastructure/deployment decision, not blocking a single-instance deployment.

---

## Maintenance/ops agents

**Status: built** — 8 of the 10 originally-proposed agents ship as
scheduled background jobs; see `FEATURES.md` § Automation for the
as-built shape and `internal/jobs/` for the code. Architecture, exactly as
recommended below: a new `internal/jobs/` package with an in-process
`github.com/robfig/cron/v3` scheduler started from `cmd/api/main.go`
(`routes.Setup` builds it, returns it, main starts/stops it around the
HTTP server's lifecycle) — no new infra or deployment unit. One file per
job implementing a small `Job` interface (`Name`/`Schedule`/`Description`/
`Run`), self-contained; `internal/jobs/registry.go`'s `BuildAll` is the
single place that lists every job, so adding a new one is one file + one
line there. On/off state lives in a `job_settings` table (a job with no row
defaults to enabled, so new jobs need no seed migration) and a `job_runs`
history table (pruned to the last 50 rows per job) backs a small
"Automation" panel in the admin System nav — toggle, "Run now", and each
job's last status/summary/finding-count. Jobs reuse existing services
exactly as planned: `NotificationService.SendDirect` (the same
"system-composes-and-fires" path the timetable workflow already uses,
attributed to the earliest-created admin account since `created_by` is a
NOT NULL FK) for anything that should alert admins, and the ad-hoc
read-mostly queries live in `db/queries/job_checks.sql` /
`internal/repositories/job_checks.go` since each backs exactly one job, not
a full entity's CRUD.

**Items 1–6, 8, 9 are built**, each smoke-tested against a real seeded DB
before shipping. Items 2, 5, and 8 originally shipped as one combined job
apiece, then were each split into single-purpose jobs so a page-specific
banner never shows a finding unrelated to that page (e.g. a Students-page
banner showing an academic-year-count issue) — see `FEATURES.md` §
Automation for the current 15-job list and which page each surfaces on;
`internal/jobs/onboarding.go` factors the two role-scoped onboarding
watchers (item 8's split) through one shared unexported type rather than
duplicating the file, since only the role and display label differ. Two
deliberate deviations from the original 10-item list:

- **Item 7 (promotion pre-commit sanity check) was *not* built as a
  scheduled job.** Re-examined during implementation: it's a synchronous,
  admin-triggered, one-time check tied to a specific promotion run, not a
  recurring background scan — forcing it into the `Job` interface would
  have meant either running it on a schedule against no particular
  promotion (meaningless) or triggering it via "Run now" with no way to
  scope it to the promotion actually being committed. Still open; the
  right shape is a synchronous method on `PromotionService` surfaced as a
  warning banner in the Promotion UI before commit, not a cron job.
- **Item 10 (`govulncheck`/`pnpm audit` triage) was *not* built.**
  `govulncheck` and `pnpm audit` need the Go/Node toolchains present at
  scan time — reasonable in CI, not a safe assumption for the deployed API
  binary in a self-hosted install. Running them in-process would either
  silently no-op on hosts without those toolchains or add a hard
  dependency the rest of this package doesn't have. Left as the
  CI-only, informational check it already is (§ Open items backlog, CI
  hardening) rather than force a poor fit.

The originally "considered, not pursued" items are unchanged: a
class-capacity alert (no `capacity` column exists on `classes`) and a
notification zero-recipient check (no partial-failure signal exists to
build one on).

---

## Exploratory — modules platform (external, third-party agents)

Brainstormed architecture, not yet scoped into an actual implementation
plan — captured here so the reasoning isn't lost. This section covers a
different case from the maintenance/ops agents above: **optional,
third-party or community-built extensions** — something not written by the
core maintainer, something in a different language, something an admin
might not want to hand full DB access to. Nothing here has a known
consumer yet (no such module exists), which is exactly why it stays
exploratory rather than scoped for implementation.

**Why separate repos, not this monorepo.** Since a deployment is
single-tenant (one `school` row per install, per the Data Model) and this
is open source (no centrally-hosted marketplace to operate), the value of
this platform *is* independent deployability — a module can be added or
removed by an admin without a PR to core, written in whatever language the
author prefers, and run with only the access it's granted rather than the
full trust the core binary has. Folding third-party code into this
monorepo would defeat that: every module would need core's Go toolchain,
core's release cadence, and core's review bar. Separate repos, linked
through a small versioned contract, is the only shape that keeps "helper"
modules from becoming coupled to core's own development.

**How it would work, end to end:**

1. **Manifest contract.** Each module repo publishes a manifest: name,
   version, config schema (JSON Schema), which webhook events it wants,
   which read-scopes it needs from the Agent API.
2. **Registration.** Admin pastes the manifest URL into the "Modules" admin
   page. Core fetches and validates it, then stores a `modules` row
   (`manifest_url`, `config jsonb`, `enabled = false`, `token_hash`,
   `last_seen_at`, `last_status`).
3. **Config.** Admin fills in the module's config, rendered from the
   manifest's JSON Schema. *Open question, not resolved here:* the
   frontend has no JSON-Schema-driven form renderer today — every existing
   admin form is hand-coded Carbon fields with `react-hook-form`
   (see e.g. `frontend/src/pages/admin/staff/components/StaffFormModal.tsx`).
   Whether to hand-roll a minimal schema→Carbon-field mapper or pull in a
   form library is a decision for when a real manifest exists to render.
4. **Enable.** Toggling `enabled` on the `modules` row is what makes the
   module live — same on/off model as the built-in jobs above, but backed
   by a real external endpoint instead of an in-process function.
5. **Scoped token.** A 32-byte random token (`crypto/rand`), SHA-256 hash
   stored server-side, shown to the admin once — the same pattern already
   used for password-reset tokens (`issueAndEmailResetToken`,
   `internal/services/auth.go`). The module sends it as bearer auth on any
   call back into a small "Agent API" scoped to what its manifest declared.
6. **Dispatch.** A `DispatchEvent(eventType, payload)` call looks up
   enabled modules subscribed to that event and fires one HTTP POST per
   module in its own goroutine with a bounded timeout — dispatch, don't
   call: core never blocks a request on a module's response. Each
   attempt's outcome updates `last_status`/`last_seen_at`; there's no
   retry or queue — a failed delivery just shows up as unhealthy on the
   admin page, and building retry/task-queue logic is left to the module's
   own repo, not core.
7. **Health, not control.** The admin page shows each module's
   `last_seen_at`/`last_status` and the on/off toggle — it does not manage
   the module's internal task state. Hard boundary: no module/agent is
   ever allowed on a request's critical path; the moment one is, this
   stops being a safe "helper" and becomes a distributed-systems problem
   this design deliberately avoids taking on.

**Outbound request hardening (SSRF), required before implementation —
applies to both the manifest fetch in step 2 and every dispatch callback in
step 6.** Core (a trusted server) making outbound HTTP requests to
admin-supplied URLs is a textbook SSRF vector — an admin (or a manifest URL
they were tricked into pasting) could point either at internal-only
services (metadata endpoints, the DB's own network segment, other
containers) that a module's actual purpose could never justify accessing.
None of this is implemented (nothing outbound exists yet), but it has to be
part of the contract from the first line of code, not bolted on after:
   - HTTPS-only; reject plain HTTP outright.
   - Reject loopback, private (RFC 1918), link-local, and cloud metadata
     (169.254.169.254 and equivalents) destinations — checked against the
     *resolved* IP, not the hostname string, since a hostname can resolve
     differently at request time than at validation time (DNS rebinding).
   - Re-validate on every redirect hop, not just the initial URL — a
     validated URL can still redirect somewhere disallowed.
   - Bounded request timeout and bounded response size on both the
     manifest fetch and every dispatch callback, so a slow or oversized
     response from a module can't tie up core resources.

**Where each piece would live, following existing convention:**
- Backend: `db/migrations/0000XX_create_modules.up/down.sql`,
  `db/queries/modules.sql`, `internal/repositories/modules.go`,
  `internal/services/modules.go`, `internal/routes/modules.go`
  (`RegisterModuleRoutes(admin, pool)`, admin-only, added to `Setup` in
  `internal/routes/routes.go` the same way every other feature is wired in).
- Frontend: a new nav entry in `frontend/src/layouts/RootLayout.tsx`,
  `pages/admin/modules/Modules.tsx` following the existing
  list+detail/modal-form convention (`NonAcademicStaff.tsx` is the closest
  precedent), `queries/useModules.ts`, `services/modules.ts`.
- Discovery/"marketplace" can start as nothing more than the admin pasting
  a manifest URL directly; a public JSON index of manifests (à la Home
  Assistant's HACS) is a later nicety, not a v1 requirement.
- An open-core paid-module gate, if ever wanted, is a separate concern
  layered on top of this later, not part of this contract.

**Next step:** stays exploratory until there's an actual third-party
module to build this for — designing the manifest/webhook/token contract
is real, deliberate work, and premature without a real consumer to shape
it against.

---

## Phase 11 — School identity & societies

**Status: items 1 and 2 are built** (school type & gender-aware validation;
the Societies feature) — see `FEATURES.md` § School setup & academic
structure and § People for the as-built shape. Item 3 below is still open.
This schema already mirrors the Sri Lankan government-school system
specifically (NIC numbers, index numbers, language mediums, A/L streams,
prefects/houses) — item 3 is grounded in how that system actually works,
not a generic school software feature.

- **Item 3 — Agent enhancements — extensions of § Maintenance/ops agents,
  not new standalone agents:**
   - **Gender-aware promotion distribution.** `PromotionGroup.tsx`'s
     existing shuffle helpers (`roundRobinAssign`/`distributeByMarks`/
     `distributeRandomly`, from Phase 10) balance only on count or marks,
     never on any student attribute. In a `mixed` school (item 1 above),
     add a `distributeByGender` strategy that balances the boys/girls
     ratio evenly across target class sections during promotion —
     irrelevant and skipped entirely for `boys`/`girls` schools, where
     every promoted student is already the same gender.
     *Note on "agent" framing:* promotion distribution is a synchronous,
     admin-triggered, one-time action — confirmed `internal/services/
     promotion.go`'s `CommitAssignments` is a pure bulk-write with no
     server-side scheduling. It doesn't fit the scheduled/background
     definition the rest of § Maintenance/ops agents uses, so
     this is really a frontend enhancement to the existing Promotion
     feature, not a new cron job. Grouped here because it was requested
     alongside the others, not because it shares their architecture.
   - **Hierarchy-aware escalation, splitting the Operational nudge agent**
     (§ Maintenance/ops agents, item 5). Today
     `PositionService.RankForTeacher` (`internal/services/position.go`)
     only answers "what is *my own* rank" — confirmed there's no existing
     resolver that walks from a subordinate to their specific superior.
     Split the one nudge agent into:
     - a **student-scoped** variant (attendance/marks gaps affecting a
       student — already what items 3 and 5 in § Maintenance/ops agents cover), and
     - a **teacher-scoped, escalating** variant: if a Class/Subject Teacher
       hasn't acted within N days of the first nudge, escalate to their
       Section Head (`section_heads WHERE grade_id = ... AND
       academic_year_id = current`), then to the scoped Vice Principal
       (`vice_principal_grade_scopes`), then to the Principal
       (`teacher_positions WHERE position = 'principal'`) — walking the
       same reporting line the position layer already models but doesn't
       currently resolve top-down. This is genuinely new resolver code,
       not just reuse of `RankForTeacher`.

**Next step:** architecture-level writeup only, same treatment as
§ Exploratory — modules platform — not yet scoped into a file-by-file
implementation plan.
