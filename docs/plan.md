# OpenSchool Feature Roadmap

**Source:** grew out of a codebase audit and a feature-enhancement request to grow OpenSchool into a full Sri Lankan Government School ERP, plus a session-timeout ask. This document is the single, current source of truth for both the audit's remaining open items and the feature roadmap — the standalone audit document has been folded in here and removed.

**How to read this:** each phase lists what already exists to build on (so we don't reinvent it) and what's net-new. Phases 1–3 are independent of the role-hierarchy work in Phase 4 and can proceed in parallel. Phases 5 and 6 depend on Phase 4's position model existing first (promotion and staff permissions need it).

**Role-hierarchy decision:** the new position hierarchy (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher) will be implemented as an **in-app position/title layer** on top of the existing 4 ThunderID-backed roles (`admin`/`teacher`/`student`/`parent`), *not* as new identity-provider roles. Reasoning: the role column is 1:1 with ThunderID's IDP role config, and two prior silent production failures were caused by hand-typed strings that have to match out-of-repo ThunderID console configuration (see the ThunderID attribute-name note in §0). Adding new IDP roles would repeat that exact risk on every environment. The existing `section_head.go`/`prefect.go` pattern — an in-app permission overlay on top of a base role — already proves this approach works here.

**Session-timeout decision:** 30 minutes of inactivity triggers an auto sign-out and redirect to `/signin`.

---

## Design principles (cross-cutting)

The final-goal ask is a standing list of system-wide principles rather than a phase of its own — each one is already enforced somewhere or lands inside an existing phase below, so nothing here is unmapped:

| Principle | Where it lives |
|---|---|
| Role-Based Access Control | Phase 4 (position layer) |
| Academic Year separation | Already enforced everywhere via `academic_year_id` FKs + the `is_current` single-row pattern |
| Complete audit logging | Phase 1 (done) |
| Soft deletion | Phase 2 (guardian delete-blocked-while-linked pattern); extended by Phase 7's CRUD audit |
| Historical record preservation | Phase 5 (promotion never deletes prior-year rows), Phase 6 (prefect board archive) |
| Responsive, accessible UI | Carbon Design System baseline (existing); Phase 7 CRUD polish |
| Modular architecture | Existing `internal/services`/`internal/repositories` layering |
| Secure authentication | ThunderID (existing); Phase 1's password-reset item |
| Scalable DB design, bulk operations, performance | §0's load-test item; Phase 5's batched bulk-update work |

---

## §0. Carryover from the audit

Every still-open finding from the (now-removed) codebase audit, tracked here so there's one place instead of two. Resolved findings (broken access control on attendance/marks, swagger gating, the two N+1 query batches, DB-pool sizing, API-wide rate limiting) are not repeated here — they're already fixed and committed (`5a3db38`, `48043d8`, `aab53c9`).

- **Dead code** — decided:
  - Delete: `frontend/src/pages/Home.tsx`, `frontend/src/pages/Showcase.tsx`, and these 10 hooks with no roadmap use: `useRemoveSectionHead`, `useUpdateLevel`, `useUpdateTerm`, `useStudent`, `useClassSubjectTeachers`, `useStudentMarks`, `useSubject`, `useUpdateNotificationDraft`, `useTimetablesByClass`, `useDeleteSubjectPeriodRequirement`.
  - Build UI for: `useLinkGuardian` (Phase 2), `useCopyTimetable` / `useReviseTimetable` / `useDeleteTimetable` (Phase 5) — these map to real backend actions the roadmap actually needs.
- **CI hardening** — add `pnpm audit`, `govulncheck`, and `staticcheck`/`deadcode` (backend — `go vet` alone doesn't catch unused exported functions) as CI steps; bump the 5 vulnerable frontend packages found by `pnpm audit` (`brace-expansion`, `immutable`, `react-router`, `postcss`, `dompurify`) to patched versions, verifying each for breaking changes since none are direct dependencies of app code.
- **Orphaned-identity reconciliation** — `internal/services/identity_rollback.go`'s `rollbackIDPUser` only logs if a compensating ThunderID delete fails, which can leave a live ThunderID account with no matching Postgres row and permanently block retries on that email/username. Add a periodic or admin-triggered job that lists ThunderID accounts with no matching local `users` row and offers to delete them. Revisit if this becomes a recurring support burden; at minimum, log these failures at a level that's easy to alert on.
- **Teacher self-service profile edit (Medium, product decision needed)** — `PUT /teachers/:id` (`internal/routes/teacher.go`) is admin-only today, so a teacher has no way to update their own phone number/title. If self-edit is wanted, add a `teacherOrAdmin` route (or a dedicated `/me/teacher` `PUT`) that only lets a teacher touch their own row (check `actor.ID` against the resolved `teacher.UserID`), not an arbitrary `:id`.
- **Notification fan-out swallows lookup failures (Low)** — `internal/services/notifications/notification.go` and `internal/services/timetable/timetable.go` build recipient lists with `_, _ := ...`-style calls; a failed lookup silently drops a guardian/teacher from a notification with no log line. Add logging at each recipient-resolution step so a "why didn't I get notified" investigation has somewhere to look — delivery can stay best-effort, just make failures visible.
- **Duplicated `todayISODate()` helper (Low)** — `TeacherDashboard.tsx` and `TeacherAttendance.tsx` each define an identical local date helper. Extract to a shared `src/lib/date.ts` next time either file is touched.
- **ThunderID attribute-name fragility (Low, informational)** — two prior production bugs (teacher account creation, guardian portal provisioning) were caused by hand-typed identity-provider attribute/type-name strings that have to match out-of-repo ThunderID console configuration, failing silently at runtime with a generic error code rather than at build/test time. Consider a small integration test exercising `CreateTeacher`/`ProvisionLogin`/`CreateStudent` against a real or recorded ThunderID response, or centralizing the attribute-name constants in one place.
- **Load test** — run a `hey`/`k6` simulation of a morning attendance rush against the seeded ~2,560-student dataset before trusting the current DB-pool (25/5) and rate-limit (30 rps / burst 60) defaults for a real rollout. Deferred until the load test shows a need: a per-JWT-subject rate-limiting layer on top of the existing per-IP one (relevant since school users are often behind one shared IP), and a caching layer (e.g. Redis) in front of read-heavy, slow-changing endpoints (class/subject/grade lists).

---

## Phase 1 — Session timeout, house colors, audit-log foundation

**Status: mostly done.** Audit-log foundation and house colors are implemented and committed. Session timeout is the one item still outstanding.

**Why first:** small and self-contained, and the audit-log table it introduces is reused by every later phase that needs a change history (house reassignment, attendance-lock overrides, promotion, staff moves).

- ⬜ **Session timeout (frontend) — not started.** Add an idle-timeout hook (e.g. `useIdleLogout`) wired near `ProtectedRoute` — debounced pointer/keyboard activity listener resetting a 30-minute timer; on expiry, call `useThunderID().signOut()` and redirect to `/signin`. Check whether `@thunderid/react`'s provider config already exposes a token-lifecycle/idle option before hand-rolling the timer.
- ⬜ **Password reset with OTP (backend + frontend) — not started.** Today only initial account creation generates a one-time password (`AddStudent.tsx`'s "share it out-of-band, change on first login" flow) — there is no self-service or admin-triggered reset path for an existing account. Add a `ForgotPassword`/`ResetPassword` flow; check first whether ThunderID exposes a reset primitive through the same `internal/identity.Provider` seam before hand-rolling token generation/expiry, and mirror the existing OTP UX conventions (never predictable, shared out-of-band, forced change on next login).
- ✅ **Audit-log infrastructure (backend) — done.** `audit_logs` table added via migration `000023` (`entity_type`, `entity_id`, `action`, `actor_id`, `before`/`after` jsonb, `reason`, `created_at`), plus `internal/services/audit.go` (`AuditService.Record`/`List`) and `internal/repositories/audit.go`. Wired into house changes and attendance-lock overrides (see Phase 3). Exposed read-only at `GET /audit-logs` (admin-only) with a matching **Audit Log** tab in Settings.
- ✅ **House colors — done, and the assignment algorithm was corrected along the way.** Added `houses.color`; extended `CreateHouseRequest`/`Houses.tsx`'s existing modal with a color picker + swatches. The old `ReassignMissing()` round-robin (index-number `mod` a manually-configured `remainder` per house) was replaced with a **least-populated-house + random-tiebreak** query (`PickBalancedHouseForStudent`/`PickBalancedHouseForTeacher`) — it self-balances without admin-maintained remainder config and automatically pulls newly-added houses into rotation. Manual house changes go through `HouseService.ChangeStudentHouse`/`ChangeTeacherHouse`, which call the audit-log helper (admin-only routes, unchanged).
  - **Also done, ahead of Phase 6:** staff (teacher) houses now mirror student houses — `teacher_profiles.house_id`, auto-assigned on hire from a separate balance pool, admin-only manual override via `PUT /teachers/:id/house`, audited the same way.

---

## Phase 2 — Guardian directory & shared-guardian support

**Status: done**, plus edit/delete support that wasn't in the original scope.

**Why the schema work is smaller than it looks:** the `student_guardians` many-to-many junction already supports one guardian linked to multiple students and one student having multiple guardians — the core data-model ask in the feature request is already met. What's missing is discoverability (search) and a real UI surface (today guardians only appear inline on a student's detail page).

- ✅ **Backend — done.** `ListGuardians` now takes an optional `search` param (`ILIKE` across name/phone/email). Added `ListStudentsByGuardianID` (works without a portal login), `FindGuardianDuplicateCandidates` (soft duplicate warning by phone/email at create time — never a hard block), and `DELETE /guardians/:id` (blocked while linked to any student, since the M:N junction cascades on delete and silently unlinking a shared guardian from every child would be surprising).
- ✅ **Frontend — done.** `/guardians` route + `GuardiansDirectory.tsx` under the People nav group, using the existing CRUD convention (`ComposedModal` forms, `ConfirmDeleteModal`, `EmptyState`, `InlineNotification`). The "link an existing guardian to another student" flow now uses `useLinkGuardian` directly, as a first step in `StudentGuardians.tsx`'s add-guardian modal (search first, "none of these — create new" as the fallback) — the create+link combo `useAddGuardian` is now the fallback path, not the only path.
- ✅ **Guardian detail view — done.** Notification history (`GET /guardians/:id/notifications`, reusing the existing `ListMyNotifications` query with an arbitrary user id) and portal-authentication status (`user_id` presence) are both shown in the directory's detail panel.
- ✅ **Edit/delete (not originally scoped, added on request):** the directory's detail panel now has Edit (reuses `UpdateGuardianRequest`) and Delete (`useDeleteGuardian`, surfaces the backend's in-use block with a clear "unlink first" message) actions.
- ✅ **Orphan/inactive filtering — done, not originally scoped.** `GuardiansDirectory.tsx` filters guardians with no linked students (commit `ffb9dbc`). Teacher (`employment_status`: active/resigned/transferred) and student (`enrollment_status`: active/left) status already exist as columns (migration `000024`) and are surfaced in `Teachers.tsx`/`TeacherDetail.tsx`/`Students.tsx`/`StudentDetail.tsx`, satisfying the "mark leavers/transfers inactive" ask directly.

---

## Phase 3 — Attendance: late status verification, session locking, absence notifications

**Status: done.**

- ✅ **Late status — done.** The `present`/`absent`/`late`/`excused` check constraint exists in migration `000006` and `internal/services/attendance.go` validates it server-side. `AttendanceMark.tsx` now exposes all four statuses (previously missing `excused` — this was the one real gap; fixed by adding it to the `Status` type, `STATUS_STYLES`, the per-row buttons, the 5-tile summary grid, and note-field visibility).
- ✅ **Session locking — done, already implemented before this pass.** `attendance.go`'s `isLocked`/`ErrSessionLocked`/`attendanceLockWindow` (24h) gate `MarkAttendance` and `DeleteSession`; admins bypass the lock, and overrides are recorded via the Phase 1 audit-log helper (`entityType="attendance_session"`/`"attendance_record"`, `action="edited_after_lock"`/`"deleted_after_lock"`). It's computed on the fly from `session.CreatedAt` rather than a `student_enrollment_locks`-style table — no separate lock table was needed.
- ✅ **Guardian absence notification — done, already implemented before this pass.** `notifyGuardiansOfAbsence` in `attendance.go` calls `SendDirect` (same integration pattern as `timetable.go`'s `notifyPublication`) whenever a record newly becomes `absent`, including student name, date, and class.

---

## Phase 4 — Roles: in-app position/hierarchy layer

**Status: done** for Principal/Vice Principal (the only genuinely net-new positions — see below); Academic/Non-Academic Staff deferred to Phase 6.

Per the decision above, this does **not** touch ThunderID or the base `role` column. Three of Phase 4.1's positions turned out to already exist under different names — **Section Head** (`section_heads`, migration `000014`), **Class Teacher** (`classes.form_teacher_id`, migration `000004` — the "Class Teacher" label is already used in `ClassDetail.tsx`'s UI, just not in the schema/code name), and **Subject Teacher** (implicit via `class_subject_teachers`/`authorizeTeacherForClassSubject`) — so only Principal and Vice Principal needed new schema.

### 4.1 Full position list

- **Administrator** — unchanged, full system access (base ThunderID role, not a position).
- ✅ **Principal — done.** Unlike Section Head/Prefect, this is **not year-scoped** — a Principal is a permanent appointment (per the product decision that these roles persist "until they get promoted or resigned," not renewed every academic year like `section_heads`/`prefects`). At most one exists at a time, enforced via a partial unique index on `teacher_positions (position) WHERE position = 'principal'`; `AssignPrincipal` replaces the row outright, and clears any prior Vice Principal row for that teacher (a promotion supersedes it) — an admin removes/reassigns manually on resignation.
- ✅ **Vice Principal — done.** Also permanent, not year-scoped. Multiple allowed; `teacher_positions.notify_whole_school` + the `vice_principal_grade_scopes` join table implement "assigned sections, or whole school if permitted."
- **Section Head** — already existed as `section_heads`, unchanged — this one genuinely *is* year-scoped (a grade/stream TIC assignment that legitimately changes each year), unlike Principal/Vice Principal.
- **Class Teacher** — already existed as `classes.form_teacher_id`, unchanged; already fully wired into `IsTeacherAssignedToClass` and notification recipient resolution. Also year-scoped (via `classes.academic_year_id`), correctly so.
- **Subject Teacher** — already existed via `class_subject_teachers`, unchanged. Also year-scoped, correctly so.
- **Academic Staff / Non-Academic Staff** — still deferred to Phase 6 (no `staff_profiles` table exists yet to attach them to).

New backend stack (mirrors `section_head.go`/`prefect.go`, minus the academic-year column since Principal/VP aren't year-scoped): migration `000025_create_teacher_positions` (`teacher_positions` + `vice_principal_grade_scopes`), `db/queries/teacher_positions.sql`, `internal/{models,repositories,services,handlers,routes}/position.go`, registered as `RegisterPositionRoutes` in `routes.go`. Frontend: `frontend/src/pages/admin/positions/Positions.tsx` (People nav group) + `services/position.ts` + `queries/usePositions.ts` — no year picker, since there's nothing to pick.

### 4.2 Hierarchy chain & inheritance

✅ **Done.** Principal → Vice Principal → Section Head → Class Teacher → Subject Teacher → Teacher, as a `PositionRank` ordinal constant in `internal/services/position.go`, with `PositionService.RankForTeacher` computing it by checking each existing mechanism in order (no new stored column) — Principal/Vice Principal checked directly (permanent, no year needed), Section Head/Class Teacher/Subject Teacher checked against the given academic year (since those are legitimately year-scoped). `RankLabel()` gives the human-readable name reused by both the dashboard and the notification composer (4.4 below).

### 4.3 Notification permission matrix

✅ **Done**, extending `notification.go`'s `authorizeSender`/`isTeacherAuthorizedForGrade` — reused the existing `RecipientRuleType` enum rather than inventing a new one:

| Position | Can notify | Implementation |
|---|---|---|
| Administrator / Principal | Everyone | `authorizeSender` now bypasses all rule checks for a Principal, same as admin |
| Vice Principal | Assigned grade(s), or whole school if granted | `isTeacherAuthorizedForGrade` now also checks `PositionRepository.IsVicePrincipalAuthorizedForGrade` (whole-school flag or `vice_principal_grade_scopes`) |
| Section Head | Assigned grade(s) + staff | Already correctly enforced pre-existing — `resolveClass`/`resolveGrade` already include class teachers as recipients; no change needed |
| Class Teacher | Own class, its students, their guardians | Already correctly enforced pre-existing — `IsTeacherAssignedToClass` already includes `form_teacher_id`; no change needed |
| Subject Teacher | Students enrolled in the assigned subject + their guardians | Already correctly enforced pre-existing via `RuleSubject`; no change needed |

`NotificationComposer.tsx`'s `RecipientPicker` now filters the "Everyone" option out of the rule-type dropdown unless `canBroadcastEveryone` (admin, or a teacher whose `/me/teacher/position` summary has `notify_whole_school`) — previously it exposed all 8 rule types to every sender and let the backend reject unauthorized ones; now the UI doesn't offer an option that would just error. The composer header also shows the sender's rank ("Sending as Vice Principal — whole-school reach.") when it's above plain Teacher.

### 4.4 Role-differentiated teacher dashboard

✅ **Done**, addressing the ask that "teacher dashboards have to differ for the roles, and notification access levels/sending also according to the levels":

- **Backend:** `GET /me/teacher/position` (`TeacherSelfHandler.Position`, `internal/routes/teacher_self.go`) returns `PositionSummary{rank, rank_label, notify_whole_school}` for the signed-in teacher, built on `PositionService.SummaryForTeacher`.
- **Frontend restructure:** `pages/teacher/TeacherDashboard.tsx` (previously one ~280-line file) was split into `pages/teacher/dashboard/`: `TeacherDashboard.tsx` (composition root), `WelcomeBanner.tsx` (+ `RoleBadge.tsx`), `TodaysClasses.tsx`, `RecentSessions.tsx`, `QuickActions.tsx`, `TodaySummary.tsx`, `MyClassesPanel.tsx`, `LeadershipPanel.tsx` — one component per concern, matching the "more structured files" ask, rather than one monolithic component branching internally on rank.
- **What actually differs by rank:** a `RoleBadge` in the welcome banner (color-coded by rank); a `LeadershipPanel` shown only for Section Head and above, describing their notification reach in plain language; `QuickActions`' "Send Notification" tile description text, which reflects what that rank can actually do (e.g. "Notify the whole school" vs "Notify your class and its guardians"). The underlying data (classes, attendance, sessions) is the same for every teacher — position only changes the framing and the notification-composer options (4.3).

---

## Phase 5 — Academic year promotion & class reassignment

*Depends on Phase 4's position model for who is authorized to run promotion/reassignment at each scope.*

- **Promotion (net-new):** no promotion or enrollment-history mechanism exists — `class_students` is just a per-year join row today (migration `000011` even enforces `UNIQUE(student_id, academic_year_id)`, confirming there's no cross-year linkage yet). Add an end-of-year batch service that inserts next-year `class_students` rows per eligible student (grade N → N+1), never deleting prior-year rows so history is preserved automatically by the existing join-row-per-year model.
- **Class reassignment/shuffle (net-new):** bulk-move endpoint(s) for redistributing students across new classes before publishing a year, plus a single-student move. Note: there is currently **no** batched-`UNNEST`-update pattern anywhere in the codebase to reuse — `HouseService.ReassignMissing`/`ReassignMissingStaff` (`house.go:94-141`), the closest analog, is itself a per-student update loop, not a batch fix. This endpoint will be the *first* batched-UNNEST-update in the codebase; once built, retrofit `ReassignMissing`/`ReassignMissingStaff` to use it too instead of leaving that N+1 in place.
  - Support marks-based ranking when shuffling: order students by last-term-test or last-academic-year aggregate marks before distributing across new classes, reusing whatever aggregate query already backs `term_mark.go`/class marks views rather than computing ranks ad hoc.
  - Support same-classroom-name carryover (6A → 7A, 12-M1 → 13-M1): model as an optional "suggested target class" per student, pre-filled but always overridable, not an automatic hard mapping.
  - Support combinations/splits (e.g. stream classes like M1/M2 merging or dividing across grades) by keeping target-class selection free-form rather than a fixed 1:1 grade mapping.
- **Timetable copy/revise/delete UI:** surface the already-implemented `useCopyTimetable`/`useReviseTimetable`/`useDeleteTimetable` hooks (defined but unused anywhere today — confirmed via repo-wide search) in the `Timetables.tsx` list page here — a new academic year is exactly when these actions are needed, closing out the dead-hook decision from §0.

---

## Phase 6 — Staff management & student profile / prefect expansion

*Depends on Phase 4's position model for staff permission scoping.*

### 6.1 Staff categories & profiles

No concept beyond `teacher_profiles` exists today (confirmed: no `staff_profiles`, `leave_requests`, `leave_balances`, or `employment_history` tables anywhere). Add a `staff_profiles`-style module generalizing the existing teacher-profile shape, split into two categories mapped directly onto Phase 4.1's bottom two positions:

- **Academic Staff** — Teachers, Section Heads, Deputy Principals, Principal.
- **Non-Academic Staff** — Lab Assistants, Librarians, Office Staff, Development Officers, IT Officers, Security, Minor Employees.

Carry a `position_id` FK to the Phase 4 position table rather than a separate category enum, so category and rank stay in one place.

### 6.2 Staff attendance & leave (net-new)

No staff-attendance concept exists at all today — `attendance_sessions`/`attendance_records` are student-only, and `taken_by` on those records just records who marked *student* attendance, not staff attendance itself. Add:

- A staff-attendance table mirroring the existing student-attendance shape but scoped to `staff_profiles`, with `present`/`late`/`absent`/`leave` statuses — one state different from student attendance's `present`/`absent`/`late`/`excused`, so reuse the check-constraint *pattern* from migration `000006`, not the same constraint.
- Monthly attendance, late, and absence reports as new aggregate queries — same reporting shape as any Phase 7 analytics query, not a separate reporting engine.

### 6.3 Student profile portfolio expansion

`StudentDetail.tsx` currently has exactly **3 tabs**: `Profile`, `Guardians`, `Subject Enrollment` — no marks tab exists yet. Add the requested portfolio as new tables + tabs following the existing `StudentGuardians.tsx` tab-composition pattern:

- **Net-new tables:** progress reports, activities, clubs, sports, societies, competitions, leadership roles, awards/achievements, disciplinary records.
- **Read-only rollups of data that already exists elsewhere** (no new tables, just a tab + query): attendance history (`attendance_records`), examination results (existing marks tables), prefect appointments (the `prefects` table, see 6.4), house info (existing `house_id`).

### 6.4 Prefect board expansion

`academic_year_id` scoping **already exists** — `prefects` (migration `000016`) has `academic_year_id` with `UNIQUE(academic_year_id, student_id)`, and `ListPrefectsByYear` already filters by year. The gap is **UI-only**: `Prefects.tsx` only ever calls `usePrefects(currentYear?.id)` with no year selector and no archive view. Add:

- A rank/title distinction for Head Prefect / Deputy Head Prefect / Senior Prefect / Junior Prefect / House Captain / Vice House Captain — check whether the existing `rank` integer column already maps 1:1 to these titles or needs a proper enum/lookup.
- A year selector on `Prefects.tsx`, reusing the same `useCurrentAcademicYear`/year-picker pattern used elsewhere in the app.
- A read-only archive view for past boards (list-by-year, no edit).

### 6.5 Staff houses

Already done in Phase 1 ("staff houses now mirror student houses, auto-assigned on hire, admin-only manual override") — nothing further needed here.

---

## Phase 7 — Analytics dashboard & CRUD consistency polish

- **Analytics:** `Dashboard.tsx` today only shows student/teacher/class/subject counts, per-class attendance, an audit-log feed, and current-year info — everything below is net-new aggregate queries against existing tables, not new domain concepts:
  - *Student:* total, by grade, by class, gender distribution, house distribution, attendance trends.
  - *Staff:* total teachers, academic staff, non-academic staff, attendance statistics (built on Phase 6.2's staff-attendance tables).
  - *Academic:* subject performance, examination summaries, grade-wise performance, attendance percentages.
  - *School:* student growth, staff growth, active academic year, notifications sent, timetable completion.
- **CRUD consistency — edit confirmation (net-new):** confirmed no edit-confirmation pattern exists anywhere in the frontend today — only `ConfirmDeleteModal` exists. Add a shared `ConfirmEditModal` (or a generic `ConfirmActionModal` covering both edit and delete) alongside the existing `ConfirmDeleteModal`, and roll it out across admin forms that make significant field changes. Beyond that, audit existing admin pages against the already-established convention (Carbon `ComposedModal` forms, `EmptyState`, `InlineNotification` — see `StudentGuardians.tsx` for a single file exercising all four) and close remaining gaps rather than introducing a new design system.
- **Report export templates (net-new, previously untracked):** drag-and-drop report templates for admins (attendance and other exports) to PDF. No PDF generation exists outside the dead `Showcase.tsx` page already slated for deletion in §0, so this is a from-scratch feature. Needs a library/format decision (server-side Go PDF library vs. a client-side template builder) as a follow-up design decision before implementation — the original ask ("drag and drop templates to get attendance and wanted things") doesn't pin down the export format.

---

## Sequencing summary

| Phase | Depends on | Can parallelize with |
|---|---|---|
| 1 — Session timeout, house colors, audit log | — | 2, 3 |
| 2 — Guardian directory | — | 1, 3 |
| 3 — Attendance locking & notifications | Phase 1 (audit-log helper) | 1, 2 |
| 4 — Role hierarchy | — | 1, 2, 3 |
| 5 — Promotion & class reassignment | Phase 4 | 6 |
| 6 — Staff & profile expansion | Phase 4 | 5 |
| 7 — Analytics & CRUD polish | 1–6 (touches most modules) | — |