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

- **CI hardening** — `pnpm audit`, `govulncheck`, and `staticcheck`/`deadcode` are still informational-only in CI (`continue-on-error: true`); flip to blocking once the items below are resolved. Bump the vulnerable frontend packages found by `pnpm audit` (`brace-expansion`, `immutable`, `react-router`, `postcss`, `dompurify`) to patched versions, verifying each for breaking changes since none are direct dependencies of app code.
- **Teacher self-service profile edit (product decision needed)** — `PUT /teachers/:id` (`internal/routes/teacher.go`) is admin-only today, so a teacher has no way to update their own phone number/title. If wanted, add a dedicated `/me/teacher` `PUT` that only lets a teacher touch their own row (check `actor.ID` against the resolved `teacher.UserID`), not an arbitrary `:id`.
- **Notification fan-out swallows lookup failures (Low)** — `internal/services/notifications/notification.go` and `internal/services/timetable/timetable.go` build recipient lists with `_, _ := ...`-style calls; a failed lookup silently drops a guardian/teacher from a notification with no log line. Add logging at each recipient-resolution step.
- **Duplicated `todayISODate()` helper (Low)** — `TeacherDashboard.tsx` and `TeacherAttendance.tsx` each define an identical local date helper. Extract to a shared `src/lib/date.ts` next time either file is touched.
- **ThunderID attribute-name fragility (Low, informational)** — hand-typed identity-provider attribute/type-name strings have to match out-of-repo ThunderID console configuration, failing silently at runtime rather than at build/test time (root cause of two prior production bugs). Consider a small integration test exercising `CreateTeacher`/`ProvisionLogin`/`CreateStudent` against a real or recorded ThunderID response, or centralizing the attribute-name constants in one place.
- **Load test — script prepared, not yet run.** `backend/scripts/loadtest_attendance_rush.js` (k6) simulates a morning attendance rush. Needs a seeded dataset and real teacher access tokens (ThunderID has no OAuth2 `password` grant, so tokens must come from a real sign-in flow). Run it by hand before trusting the current DB-pool (25/5) and rate-limit defaults for a real rollout.
- **Unbounded list endpoints** — several `teacherOrAdmin`/`admin` list routes (`/students`, `/teachers`, `/notifications/sent`, etc.) return the entire table in one response with no pagination. Fine at the current ~2,500-student scale; add server-side pagination before a much larger school or a shared multi-tenant deployment makes that response size a real DoS/performance vector.
- **Low-priority cross-file duplication** — the `userID`-from-context helper repeated across `parent.go`/`student_self.go`/`teacher_self.go`/`timetable/timetable.go`/`notifications/notification.go`, and role/status strings as raw literals instead of shared constants. Cosmetic; folded into Phase 10 below.
- **Redis-backed rate limiting** — the per-IP and per-account limiters (`internal/middleware/ratelimit.go`) are in-process and token-bucket only, resetting on restart with no shared state across instances. Move to a shared store (Redis) before running more than one backend instance. Deliberately deferred — infrastructure/deployment decision, not blocking a single-instance deployment.

---

## Phase 10 — Code quality & style refactor

**Status: planned, not yet started.** A dedicated pass over both workspaces to raise the baseline code quality and consistency now that the v1 feature set (Phases 1–9) is functionally complete — no behavior changes, comments and style only.

- ⬜ **Comment quality pass (backend + frontend).** Audit every multi-line comment block; condense verbose, multi-paragraph explanations down to a single concise line that keeps only the non-obvious *why* (drop anything that just restates what the code already shows). Example of the target style, already applied in `backend/internal/config/env.go`:
  ```go
  // LoadEnv loads .env into the process environment; only logs errors other than a missing file.
  func LoadEnv() {
  ```
  Leave swagger/godoc annotation blocks (`// @Summary`, `// @Router`, etc.) untouched — those are functional API-doc generation comments, not prose. Preserve Go doc-comment convention (an exported symbol's comment still starts with its name).
- ⬜ **Coding style consistency check** — run `gofmt`/`go vet`/`staticcheck` across the backend and `pnpm lint` across the frontend, fixing anything flagged; confirm no drift between modules that should share a convention (error handling, naming, file layout).
- ⬜ **Cross-file duplication cleanup** — resolves the "Low-priority cross-file duplication" backlog item above: extract the repeated `userID`-from-context helper into one shared place, and replace raw role/status string literals with shared constants.
- ⬜ **Dead-code re-check** — re-run `deadcode` after this pass to confirm the Phase 9 cleanup didn't leave anything new unreachable.
