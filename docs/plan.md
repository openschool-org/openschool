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
