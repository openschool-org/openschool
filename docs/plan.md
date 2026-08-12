# OpenSchool Feature Roadmap

> **Open-items tracker.** Completed work has been trimmed from this document —
> see [`FEATURES.md`](./FEATURES.md) for the current, as-built feature list,
> and git history for how each phase was implemented. This file tracks only
> what's still outstanding.

**Role-hierarchy decision:** the position hierarchy (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher) is implemented as an **in-app position/title layer** on top of the existing 4 ThunderID-backed roles (`admin`/`teacher`/`student`/`parent`), *not* as new identity-provider roles. Reasoning: the role column is 1:1 with ThunderID's IDP role config, and two prior silent production failures were caused by hand-typed strings that have to match out-of-repo ThunderID console configuration. Adding new IDP roles would repeat that exact risk on every environment.

**Phases 1–9 are complete** (session timeout, guardian directory, attendance locking, role hierarchy, promotion/medium-locked classes, staff & profile expansion, analytics/CRUD polish, NIC & password lifecycle, and pre-release hardening/deepened dashboard). No open items remain in them beyond what's listed below.

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

## Proposed — maintenance/ops agents (not yet built)

Scheduled, read-mostly jobs that support the system's operation without being
a user-facing feature — none of the app's existing functions depend on
these; they can be added or dropped independently. Ranked by value (risk
mitigated vs. effort):

1. **Backup + migration-drift agent.** This is a single-instance,
   self-hosted deployment with no managed DB failover, so a bad migration or
   host failure is currently unrecoverable. A cron job running `pg_dump` on
   a schedule, plus a check that the DB's applied `golang-migrate` version
   matches what the running binary expects, closes the one gap on this list
   whose failure mode is permanent data loss rather than an inconvenience.
2. **Data-invariant checker.** Nearly every table is scoped by
   `academic_year_id`, and the "exactly one current year" rule
   ([`docs/adr/0003-single-current-academic-year.md`](./adr/0003-single-current-academic-year.md))
   is enforced at the app level only, not the DB. A periodic scan for
   invariant violations (zero/multiple current years, orphaned FKs,
   post-promotion inconsistencies) catches silent corruption before it
   propagates into attendance, marks, and timetable data that all trust
   that invariant.
3. **Operational nudge agent (attendance / marks / timetable).** The
   notification system already has `Attendance`/`Academic`/`Timetable`
   categories and a server-side composer path (§ Notifications,
   `FEATURES.md`), so this is mostly wiring, not new infrastructure: flag
   classes with no `AttendanceSession` created by a cutoff time, subjects
   with missing term marks near a term-lock deadline, and timetables stuck
   in "submitted for review" past N days — then push through the existing
   composer to the relevant teacher/Section Head.

Not ranked in the top tier but noted for later: an audit-log anomaly
watcher (the `audit_logs` table already captures actor/before/after but
nothing currently alerts on unusual patterns in it) and a scheduled
`govulncheck`/`pnpm audit` triage job that turns the informational CI
findings above into a tracked queue instead of noise.

---

## Exploratory — modules platform, instance identity & demo playground

Brainstormed direction, not yet scoped into an actual plan or committed to
the backlog above — captured here so the reasoning isn't lost. Three
separate concerns; none blocks the others.

1. **Modules platform (agents live in separate repos, not this monorepo).**
   Since a deployment is single-tenant (one `school` row per install, per
   the Data Model) and this is open source (no centrally-hosted marketplace
   to operate), the lightest workable shape is:
   - Each module/agent ships its own repo with a manifest
     (name, version, config as JSON Schema, which read-scopes/webhook
     events it needs) instead of living in `backend/`/`frontend/`.
   - Core gets a `modules` table (manifest URL, config JSON, enabled,
     a scoped API token per module) and an admin page that renders the
     config form *from* the manifest's JSON Schema — no bespoke UI per
     module.
   - A small versioned "Agent API" + webhook dispatcher for exactly the
     events modules need — start scoped to what the three items in
     § Proposed — maintenance/ops agents (above) actually require
     (attendance-session state, term-marks state, timetable-review state)
     rather than a general permission system up front.
   - Discovery/"marketplace" can start as nothing more than the admin
     pasting a manifest URL directly; a public JSON index of manifests
     (à la Home Assistant's HACS) is a later nicety, not a v1 requirement.
   - Real cost is designing the manifest/webhook/token contract once,
     deliberately — not the admin page itself.

2. **Per-school instance identity (not a license).** Open source means a
   hard license lock doesn't hold — anyone with DB access to their own
   self-hosted server can bypass a check baked into code they control
   (same reason GitLab EE / Odoo Enterprise / Zabbix don't try to DRM the
   local binary). What's actually useful is an **instance identity**:
   - At first-run (the existing School Setup wizard, § Setup in
     `FEATURES.md`), generate a UUID *and* an asymmetric keypair for the
     instance; store both locally (new `instance` table or alongside the
     single `school` row). Private key never leaves the server.
   - The UUID + public key is what the instance presents to anything
     external — a module registry, opt-in telemetry, a support channel —
     so requests can be verified as coming from one consistent install,
     via signed requests rather than a password-like license string.
   - This is the identity a module (item 1 above) would use to
     authenticate itself to the instance, and vice versa.
   - An open-core paid-module gate, if ever wanted, is a separate signed
     JWT-license-file layer on top of this (GitLab-license-style) —
     explicitly deferred until there's something to gate.

3. **1-hour demo playground (OpenChoreo.dev-style).** Deliberately *outside*
   this repo — demo infra, not app code. Two shapes considered, in
   increasing cost:
   - **Shared demo instance, session-scoped (recommended starting point).**
     One always-on OpenSchool instance seeded with realistic fake data,
     reset on a nightly cron; each visitor gets a 1-hour signed session
     token that logs them out on expiry. A day of infra work, not a
     platform build.
   - **Per-visitor ephemeral instance.** A script (naturally living in
     `openschool-web` or a dedicated demo/infra repo, per the user's
     suggestion) spins up a fresh containerized backend+DB+seed data per
     visitor with a TTL teardown. Best experience, real ongoing cost —
     upgrade path if the shared-instance demo proves popular.
   - Either shape needs its own demo ThunderID tenant with pre-seeded
     demo admin/teacher/student/parent accounts — a demo-auth bypass
     should never live in core app code.

**Next step:** pick one of the three to scope into an actual plan (see
proposal above) before any implementation starts.

---

## Phase 10 — Code quality & style refactor

**Status: complete.** A dedicated pass over both workspaces to raise the baseline code quality and consistency now that the v1 feature set (Phases 1–9) is functionally complete — no behavior changes, comments and style only. Frontend component decomposition (last item below) extends beyond this phase's original scope; added when the pass was carried out, kept here since it's the same "no behavior change" cleanup spirit.

- ✅ **Comment quality pass.** Backend: condensed ~50 wrapped multi-line `//` comments to single concise "why" lines across `internal/services/`, `internal/repositories/`, `internal/middleware/`, `internal/thunderid/`; normalized the one ASCII-divider comment block in `curriculum_preset.go`. Swagger annotation blocks and Go doc-comment convention (comment starts with the symbol's name) left untouched/enforced. Frontend comment density was already minimal and load-bearing — audited, no changes needed.
- ✅ **Coding style consistency check** — `gofmt -l`, `go vet ./...`, `staticcheck ./...` all clean on backend; `pnpm lint` (`eslint .`), `npx tsc -b`, and `npx vite build` all clean on frontend.
- ✅ **Cross-file duplication cleanup** — added `middleware.UserIDFromContext`, replacing the duplicated/triplicated inline `uuid.Parse(c.GetString("userID"))` pattern across `parent.go`, `timetable/timetable.go`, `student_self.go`, `teacher_self.go` (3 inline copies), `staff_attendance.go`, `student_portfolio.go`, `attendance.go`, `non_academic_staff.go`, `notifications/notification.go`. Added `models.Role{Admin,Teacher,Student,Parent}` plus attendance/timetable/notification status constants, replacing ~60 raw string-literal call sites (`internal/services/*`, `internal/routes/routes.go`).
- ✅ **Dead-code re-check** — `deadcode ./...` clean.
- ✅ **Frontend component decomposition (new item, beyond original scope), 16/16 files.** No page had a local `components/` folder before this pass; one convention was established and applied to every admin page over 400 lines:

  | File | Before | After | Extracted into |
  |---|---|---|---|
  | `pages/admin/setup/SchoolSetup.tsx` | 997 | 321 | `components/` (6 step components + `StepShell`/`RepeatableRow`), `hooks/useSchoolSetupSubmit.ts`, `constants.ts` |
  | `pages/admin/classes/ClassDetail.tsx` | 949 | 444 | `components/` (3 tab components, 5 modals — `Marks` tab was already `ClassMarks.tsx`) |
  | `pages/admin/curriculum/LevelDetail.tsx` | 675 | 233 | `components/` (`SubjectCard`, `GroupsList`, `GroupFormModal`, `AddSubjectModal`) |
  | `pages/admin/academic-years/AcademicYears.tsx` | 649 | 125 | `components/` (`YearsList`, `CreateYearModal`, `TermsModal`, row skeleton) |
  | `pages/admin/curriculum/Curriculum.tsx` | 620 | 252 | `components/` (`LevelsList`, 3 form modals, `PresetConfirmModal`, row skeleton) |
  | `pages/admin/students/StudentGuardians.tsx` | 545 | 106 | `components/` (`AddGuardianModal`, `ProvisionLoginModal`, `GuardianRow`) |
  | `pages/admin/attendance/AttendanceMark.tsx` | 497 | 343 | `components/` (`StatusButton`, `StudentAttendanceRow`), `constants.ts`; built shared `StatusTag` |
  | `pages/notifications/NotificationComposer.tsx` | 494 | 208 | `components/` (`RecipientPicker`, `SentHistoryRow`, `DraftRow`), `constants.ts` |
  | `pages/admin/promotion/Promotion.tsx` | 479 | 248 | `components/` (`PromotionGroup`, with the round-robin/shuffle helpers) |
  | `pages/admin/students/StudentDetail.tsx` | 464 | 264 | `components/` (`StudentProfileTab` — Profile/Current Class/House/Enrollment sections) |
  | `pages/admin/teachers/TeacherDetail.tsx` | 438 | 234 | `components/` (`TeacherProfileSections`), `constants.ts` |
  | `pages/admin/staff/NonAcademicStaff.tsx` | 434 | 125 | `components/` (`StaffFormModal`, `StaffDetail`), `constants.ts` |
  | `pages/admin/guardians/GuardiansDirectory.tsx` | 431 | 119 | `components/` (`EditGuardianModal`, `GuardianDetail`), `constants.ts` |
  | `pages/admin/grades/Grades.tsx` | 431 | 288 | `components/` (`GradeRow`, `GradeFormModal`) |
  | `pages/admin/timetable/GradeSections.tsx` | 410 | 215 | `components/` (`PeriodsEditor`, `SectionRow`, `SectionFormModal`), `constants.ts` |
  | `pages/admin/dashboard/Dashboard.tsx` | 401 | 108 | `components/` (`StatCard`, `AttendanceByClassSection`, `RecentActivitySection`, `AttendanceTodaySidebar`, `AcademicYearSidebar`), `constants.ts` |

  New shared pieces in `src/components/common/`: `FormModal` (the header/body/error-notification/footer skeleton every create/edit modal was hand-duplicating), `Avatar` (the initials-circle renderer), and `StatusTag` (the colored status-pill pattern, built out from `AttendanceMark.tsx` where it originated). Every extraction verified with `npx tsc --noEmit`, `npx eslint <path>` per file, and a final `npx tsc -b && npx eslint . && npx vite build` across the whole frontend — all clean. No page was manually exercised in a browser as part of this pass; this was a mechanical extract-with-identical-JSX refactor (no logic, prop, or markup changes), not a functional change, so it wasn't spot-checked live.
