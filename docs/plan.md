# OpenSchool Feature Roadmap

> **Historical document.** This is the phase-by-phase build log the project
> grew from — kept for context on *why* things are built the way they are.
> For the current, as-built feature list, see [`FEATURES.md`](./FEATURES.md)
> instead; a few items marked "not yet built" below (e.g. medium-locked
> classes in Phase 5) have since shipped and are current in that document.

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
  - Build UI for: `useLinkGuardian` (Phase 2, done) — these mapped to real backend actions the roadmap needed. `useCopyTimetable`/`useReviseTimetable`/`useDeleteTimetable` (Phase 5) are now wired up too.
- **CI hardening** — add `pnpm audit`, `govulncheck`, and `staticcheck`/`deadcode` (backend — `go vet` alone doesn't catch unused exported functions) as CI steps; bump the 5 vulnerable frontend packages found by `pnpm audit` (`brace-expansion`, `immutable`, `react-router`, `postcss`, `dompurify`) to patched versions, verifying each for breaking changes since none are direct dependencies of app code.
- ✅ **Orphaned-identity reconciliation — done, admin-triggered.** `identity.Provider` gained a `ListUsers` method (`internal/thunderid/client.go`, paginating ThunderID's `GET /users`); `IdentityReconciliationService` (`internal/services/identity_reconciliation.go`) diffs that against the local `users` table. Admin-only `GET /admin/orphaned-accounts` lists orphans, `DELETE /admin/orphaned-accounts/{id}` deletes one (re-verifying it's still orphaned immediately before deleting, and audit-logged). Frontend: a new **Orphaned Accounts** tab in Settings (`OrphanedAccounts.tsx`) — a manual "check" button (not auto-run, since it pages through every ThunderID account) plus a per-row delete with the standard `ConfirmDeleteModal`. Deliberately admin-triggered, not a background job — deleting a live identity account isn't something to automate unattended.
- **Teacher self-service profile edit (Medium, product decision needed)** — `PUT /teachers/:id` (`internal/routes/teacher.go`) is admin-only today, so a teacher has no way to update their own phone number/title. If self-edit is wanted, add a `teacherOrAdmin` route (or a dedicated `/me/teacher` `PUT`) that only lets a teacher touch their own row (check `actor.ID` against the resolved `teacher.UserID`), not an arbitrary `:id`.
- **Notification fan-out swallows lookup failures (Low)** — `internal/services/notifications/notification.go` and `internal/services/timetable/timetable.go` build recipient lists with `_, _ := ...`-style calls; a failed lookup silently drops a guardian/teacher from a notification with no log line. Add logging at each recipient-resolution step so a "why didn't I get notified" investigation has somewhere to look — delivery can stay best-effort, just make failures visible.
- **Duplicated `todayISODate()` helper (Low)** — `TeacherDashboard.tsx` and `TeacherAttendance.tsx` each define an identical local date helper. Extract to a shared `src/lib/date.ts` next time either file is touched.
- **ThunderID attribute-name fragility (Low, informational)** — two prior production bugs (teacher account creation, guardian portal provisioning) were caused by hand-typed identity-provider attribute/type-name strings that have to match out-of-repo ThunderID console configuration, failing silently at runtime with a generic error code rather than at build/test time. Consider a small integration test exercising `CreateTeacher`/`ProvisionLogin`/`CreateStudent` against a real or recorded ThunderID response, or centralizing the attribute-name constants in one place.
- ⬜ **Load test — script prepared, not yet run.** `backend/scripts/loadtest_attendance_rush.js` (k6) simulates a morning attendance rush (ramping to 50 concurrent teachers hitting `/me/teacher` then `POST /attendance/sessions`). Not executed against a real stack yet — needs a seeded dataset and a pool of real teacher access tokens (ThunderID doesn't implement the OAuth2 `password` grant, confirmed against its own discovery-metadata tests, so tokens have to come from a real sign-in flow, not a scripted grant call). Run it by hand before trusting the current DB-pool (25/5) and rate-limit defaults for a real rollout. ✅ The per-JWT-subject rate-limiting layer this item used to gate is now built regardless (see "Per-account rate limiting" above) — a caching layer (e.g. Redis) in front of read-heavy, slow-changing endpoints (class/subject/grade lists) is still deferred until the load test shows a need for it.

### §0.1 New findings from this pass — unscoped data exposure (Critical) — ✅ both fixed

Found while scoping the deeper role-differentiated dashboard work below (§9.3) — both are the same root cause the earlier audit already flagged as a systemic risk ("identity-provider role assignment is handled differently at every call site"; here it's *authorization* handled differently at every call site): an endpoint built for one call site (an admin-only dashboard page) gets registered on the broad `teacherOrAdmin` route group with no matching handler-level check, unlike the well-factored `authorizeTeacherForClass` pattern used everywhere else in the attendance module.

- ✅ **Cross-school attendance dashboard exposed to any teacher — fixed.** `GET /attendance/sessions` (`AttendanceHandler.ListSessionsByDate`) now requires admin or a leadership rank (Principal/VP/Section Head) via `PositionService.LeadershipScope` (`internal/services/position.go`) — a plain Class/Subject Teacher gets `ErrInsufficientRank` → 403. Results are scoped at the SQL `WHERE` clause level (new `grade_ids` nullable-array param on `ListAttendanceSessionsByDate`, `db/queries/attendance.sql`): whole school for admin/Principal/an unrestricted VP, `vice_principal_grade_scopes` for a scoped VP, `ListGradeIDsHeadedByTeacher` for a Section Head.
- ✅ **Whole-staff HR attendance data exposed to any teacher — fixed.** All five `/staff-attendance/*` routes (`internal/routes/staff_attendance.go`) moved from `teacherOrAdmin` to `admin`-only, matching the admin-only frontend page that was already the only real caller.

---

## Phase 1 — Session timeout, house colors, audit-log foundation

**Status: mostly done.** Audit-log foundation and house colors are implemented and committed. Session timeout is the one item still outstanding.

**Why first:** small and self-contained, and the audit-log table it introduces is reused by every later phase that needs a change history (house reassignment, attendance-lock overrides, promotion, staff moves).

- ✅ **Session timeout (frontend) — done.** `useIdleLogout` (`frontend/src/hooks/useIdleLogout.ts`), wired into `ProtectedRoute` — throttled pointer/keyboard/scroll activity listeners reset a 30-minute timer; on expiry, calls `useThunderID().signOut()` and redirects to `/signin`. Confirmed `@thunderid/react`'s `ThunderIDReactConfig`/`ThunderIDContextProps` expose no token-lifecycle/idle option, so this is hand-rolled as planned.
- ⬜ **Password reset — moved to Phase 8.** Originally scoped here; grew into its own phase once NIC-based default passwords and a universal (every-role) reset flow were added to the ask. See Phase 8.
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
- **What actually differs by rank:** a `RoleBadge` in the welcome banner (color-coded by rank); a `LeadershipPanel` shown only for Section Head and above, describing their notification reach in plain language; `QuickActions`' "Send Notification" tile description text, which reflects what that rank can actually do (e.g. "Notify the whole school" vs "Notify your class and its guardians"). **The underlying data (classes, attendance, sessions) is the same for every teacher** — position only changes the framing and the notification-composer options (4.3), not what data is actually fetched or shown.
- ⬜ **Deeper differentiation — planned, not yet built.** A Principal/Vice Principal or Section Head's dashboard today shows the exact same "my classes" data as a plain Class/Subject Teacher's, just with different label text around it. See §9.3 for the concrete design (a school-/grade-scoped "Overview" panel backed by a new, properly-authorization-gated endpoint) — deliberately scoped to close §0.1's leak #1 as part of building it, rather than adding a fourth ad hoc authorization path alongside the ones §0.1 already flags as inconsistent.

---

## Phase 5 — Academic year promotion & class reassignment

**Status: done.** Promotion, shuffle (marks-based + random distribution), medium-locked classes, and the timetable UI wiring are all done.

- ✅ **Promotion & class reassignment/shuffle — done, built as one shared preview-then-commit flow.** No new "draft" schema was needed: `academic_years.is_current` (already the gate nearly everything filters live data by, e.g. `GetStudentCurrentClass`) doubles as the publish switch — promotion/shuffle just write `class_students` rows into a not-yet-current year, fully editable until an admin flips it current via the pre-existing `SetCurrentAcademicYear`.
  - `GET /promotion/preview?source_year_id=&target_year_id=&rank_by_term_id=` (`internal/services/promotion.go`'s `Preview`) computes, without writing anything, each actively-enrolled (`enrollment_status = 'active'`) student's next grade (net-new — no "next grade" logic existed anywhere; resolved via `GetNextGrade`, the grade with the smallest `sort_order` greater than the current one) and a non-binding same-name-carryover suggestion (`FindClassByGradeAndName`, e.g. "6A" → "7A"). Students at the top grade (no next grade) are flagged `graduating`, not silently dropped.
  - `POST /promotion/commit` (`CommitAssignments`) bulk-writes the admin's final per-student class choices — the **first batched-UNNEST bulk write in the codebase** (`BulkDeleteClassStudentsForYear` + `BulkInsertClassStudents`, paired via `UNNEST(...) WITH ORDINALITY` rather than the two-array `UNNEST(a, b)` form, since sqlc's static analyzer doesn't resolve that overload). One endpoint serves both promotion-commit and general reassignment/shuffle, since both are "set these students' class for this year." **Deferred, not done:** retrofitting `HouseService.ReassignMissing`/`ReassignMissingStaff` (`house.go:94-141`) to use this same batched pattern instead of its existing per-student loop — flagged as a follow-up, not required for Phase 5 to function.
  - Marks-based ranking: a genuinely new aggregate query (`ListStudentTotalMarksForTerm`) — no such aggregate existed anywhere (`term_marks` only had per-subject upsert/list queries; the earlier assumption that one could be "reused from `term_mark.go`" was wrong). Originally scoped as a sort aid only, then extended on request to a real **"Distribute by marks" auto-assign button** per grade group: sorts students highest-to-lowest total marks, then deals them round-robin across that grade's target classes (student *i* → `targetClasses[i % targetClasses.length]`) — every class ends up with a similar high-to-low spread and average, and class sizes differ by at most 1 (e.g. 30/30/29), never lopsided. A second **"Assign randomly" button** does the identical round-robin dealing over a shuffled (Fisher–Yates) student order instead of a marks-sorted one — same equal-size guarantee, unrelated to marks. Both are still just prefill actions — every resulting assignment stays a normal, freely-overridable per-student `EntityCombobox` pick, so the always-overridable guarantee holds either way. Both are pure frontend computations over already-loaded preview data; no backend change was needed.
  - Same-classroom-name carryover and combinations/splits (stream classes merging/dividing across grades): the suggested target class is always just a pre-filled, freely-overridable `EntityCombobox` pick per student — never a hard mapping — so stream transitions (e.g. Grade 10 → 11 A/L stream selection, where class names don't carry over at all) just show no suggestion and fall to a manual pick, which is the correct behavior for that case.
  - Frontend: `pages/admin/promotion/Promotion.tsx` (Operations nav group) — year pickers, a per-grade preview table, and the **first checkbox-select-rows + bulk-action-toolbar pattern in the admin frontend** (no prior art existed beyond `SubjectEnrollment.tsx`'s grouped-but-not-row-selection checkboxes).
- ✅ **Medium-locked classes — done.** `classes.medium_id UUID REFERENCES mediums(id) ON DELETE SET NULL` added via migration `000032_add_class_medium`. The setup wizard (`SchoolSetup.tsx`) now runs `School → Houses → Grades → Mediums → Classes → Done` — Mediums before Classes — and the Classes step tags each section with a medium picker instead of blind `A`/`B`/`C` generation. `AddClass.tsx` has the same optional medium picker for ad-hoc creation. Promotion (`internal/services/promotion.go`, `Promotion.tsx`) resolves a same-*medium* target class for medium-locked students and excludes both them and medium-designated target classes from the "Distribute by marks"/"Assign randomly" pools — still visible, still a normal overridable pick, just outside the shuffle.
- ✅ **Timetable copy/revise/delete UI — done.** The `useCopyTimetable`/`useReviseTimetable`/`useDeleteTimetable` hooks (confirmed defined but not even imported anywhere before this) are now wired into `Timetables.tsx` via a per-row `OverflowMenu` — Copy opens a small target-class picker modal, Revise (published timetables only) fires directly, Delete goes through the existing `ConfirmDeleteModal` convention. Closes out the dead-hook decision from §0.

---

## Phase 6 — Staff management & student profile / prefect expansion

**Status: done.**

*Depended on Phase 4's position model for staff permission scoping.*

### 6.1 Staff categories & profiles

**Status: done.**

- ✅ **Academic Staff** — unchanged, this *is* `teacher_profiles`.
- ✅ **Non-Academic Staff — done.** `non_academic_staff` table (migration `000026`; `full_name`, `employee_number`, `designation` CHECK-constrained to Lab Assistant/Librarian/Office Staff/Development Officer/IT Officer/Security/Minor Employee, `phone`, `joined_date`, `gender`, `house_id`, `employment_status`), deliberately without login/IDP machinery — no `user_id`. Full backend stack (`internal/{models,repositories,services,handlers,routes}/non_academic_staff.go`) and `frontend/src/pages/admin/staff/NonAcademicStaff.tsx`, mirroring `GuardiansDirectory.tsx`'s single-page list+detail+modal pattern. Admin-only CRUD, hard delete. House changes go through the same audit-logged pattern as Phase 1 (`entityType="non_academic_staff_house"`).
- ✅ **Employee number automation — done.** `employee_number_seq` (migration `000026`) shared between `teacher_profiles` and `non_academic_staff` — plain zero-padded string (`00001`, `00002`, ...). `TeacherRepository.NextEmployeeNumber`/`NonAcademicStaffRepository.NextEmployeeNumber` fetch the next value explicitly (needed before the IDP user exists, for teachers); `employee_number` dropped from `CreateTeacherRequest`/`UpdateTeacherRequest` and is now immutable in `TeacherDetail.tsx`.
- **Deferred, not built:** leave management, employment history as a distinct concept (employment_status covers the "left the school" case) — flagged as a follow-up, not required for 6.1 to function.

### 6.2 Staff attendance & leave

**Status: done.**

- ✅ `staff_attendance_records` (migration `000027`) — one row per staff member per day, `teacher_id`/`non_academic_staff_id` mutually exclusive via CHECK, `present`/`late`/`absent`/`leave` statuses (a separate CHECK constraint from student attendance's `present`/`absent`/`late`/`excused`, per the plan's note). Backend: `internal/{repositories,services,handlers,routes}/staff_attendance.go`, upsert-on-mark semantics. Monthly summary aggregates (`MonthlyTeacherAttendanceSummary`/`MonthlyNonAcademicStaffAttendanceSummary`) per staff member. Frontend: `frontend/src/pages/admin/staff/StaffAttendance.tsx` — daily mark view + monthly summary toggle.

### 6.3 Student profile portfolio expansion

**Status: done.**

- ✅ **Net-new tables (migration `000028`):** `student_progress_reports` (term-scoped narrative), `student_activities` (clubs/sports/societies/competitions **consolidated into one table** with a `category` CHECK column, rather than four near-duplicate CRUD stacks — a deliberate simplification since the four are structurally identical), `student_leadership_roles`, `student_awards`, `student_disciplinary_records`. Full backend stack in `internal/{models,repositories,services,handlers,routes}/student_portfolio.go`.
- ✅ **Read-only rollups — done.** `StudentRecordsRollup.tsx` composes attendance history (new `GET /students/:id/attendance`, backed by the pre-existing `ListAttendanceByStudent` query which had no route before), examination results (reused the already-existing but previously-unused `useStudentMarks`/`ListStudentMarksByTerm` — the §0 dead-code list's decision to delete it is superseded by this real use), and prefect appointments (new `ListPrefectAppointmentsByStudent` query/route, see 6.4).
- ✅ **Frontend tabs — done.** `StudentDetail.tsx` now has 8 tabs: the original Profile/Guardians/Subject Enrollment, plus `StudentProgressReports.tsx`, `StudentActivities.tsx`, `StudentLeadershipAwards.tsx` (leadership + awards combined), `StudentDisciplinary.tsx`, and `StudentRecordsRollup.tsx` — each following `StudentGuardians.tsx`'s `studentId`-prop, self-fetching tab-component pattern.

### 6.4 Prefect board expansion

**Status: done.**

- ✅ The existing `rank` column turned out to be a plain `VARCHAR` CHECK constraint, not an integer — no enum/lookup table existed. Extended via migration `000029` to add `house_captain`/`vice_house_captain` to the CHECK list (and to `ListPrefectsByYear`'s sort-order `CASE`); `Prefects.tsx`'s `RANKS` array extended to match.
- ✅ **Year selector + archive — done.** `Prefects.tsx` now has a year `Select` (new `GET /prefects/years` route, backed by `ListPrefectYears`) covering every year with a recorded board plus the current year. Selecting a past year switches the page into a read-only archive view (Appoint/Remove actions hidden, an info banner shown) — reusing the existing `usePrefects(yearId)` hook, just parameterized by the selected year instead of always the current one.

### 6.5 Staff houses

Already done in Phase 1 — nothing further needed here.

---

## Phase 7 — Analytics dashboard & CRUD consistency polish

**Status: done.**

- ✅ **Analytics — done.** New `GET /dashboard/analytics` (`internal/services/dashboard.go`, backed by `db/queries/dashboard.sql`'s ~15 aggregate queries, all implicitly scoped to the current academic year/term via the existing `is_current` pattern) composes one response covering:
  - *Student:* total, by grade, by class, gender distribution, house distribution (colored by each house's real color), a 14-day attendance trend.
  - *Staff:* academic/non-academic staff counts, this-month attendance totals (built on Phase 6.2's staff-attendance tables).
  - *Academic:* subject performance, examination summary, grade-wise performance, overall attendance percentage.
  - *School:* student growth by year, staff growth by joining year, notifications-sent count, timetable completion % (published timetables ÷ total classes for the current year).
  - Frontend: `Dashboard.tsx` renders `AnalyticsSection.tsx` below the existing content — stat tiles + lightweight custom horizontal-bar/sparkline charts (no charting library added; kept consistent with the existing Carbon-derived color tokens already used for attendance status elsewhere in the app) rather than a new visual language.
- ✅ **CRUD consistency — edit confirmation — done.** Added `ConfirmEditModal` (mirrors `ConfirmDeleteModal`, `kind="primary"` instead of `"danger"`), wired into the two highest-value inline-edit flows — `TeacherDetail.tsx` and `StudentDetail.tsx` — where "Save Changes" previously saved immediately with no confirmation step. Modal-based edit flows (`GuardiansDirectory.tsx`, `NonAcademicStaff.tsx`) were left as-is since the modal itself already is the deliberate confirmation step; stacking a second confirm on top would be redundant.
- ✅ **Report export templates — done, server-side Go PDF (per product decision).** Added `github.com/jung-kurt/gofpdf`. `internal/services/report_export.go` renders two fixed templates — Attendance (by class + date range) and Marks (by class + term + subject) — to a simple bordered-table PDF, each with an optional column subset (a lightweight field picker rather than free-form drag-and-drop layout). New `GET /reports/attendance` / `GET /reports/marks` (admin-only, streamed as `application/pdf`). Frontend: `frontend/src/pages/admin/reports/Reports.tsx` — template picker, filters, column checkboxes, and a blob-download button.

---

## Phase 8 — NIC-based account creation & universal password reset

**Status: done.** Groups everything about how accounts get their initial password and how members change it — supersedes Phase 1's placeholder password-reset bullet (moved and expanded here) rather than duplicating it.

### 8.1 NIC number field

✅ **Done.** `nic_number VARCHAR(20) NOT NULL UNIQUE` added to `teacher_profiles` and `guardians` via migration `000030_add_nic_number` (existing rows backfilled with a placeholder so the constraints could be added in the same migration, since NIC — unlike `employee_number` — is editable afterward). Validated loosely at the application layer only (required, non-empty), not via a DB `CHECK`, since Sri Lankan NICs come in both the old 9-digit+V/X and new 12-digit-numeric forms. **Not** added to `student_profiles` — students already have `index_number`. Required field in `AddTeacher.tsx`/`TeacherDetail.tsx`'s edit form and wherever a guardian is created or edited (`StudentGuardians.tsx`'s add-guardian modal, `GuardiansDirectory.tsx`'s edit modal).

### 8.2 Default passwords, not manual entry

✅ **Done.** All three still go through `internal/identity.Provider`'s existing `CreateUser`/`password` attribute — only *what value* is used changed, not the creation mechanism:

- **Teachers:** the manual `PasswordInput` is gone from `AddTeacher.tsx`; `TeacherService.CreateTeacher` uses the NIC number as the initial password (`Password` dropped from `CreateTeacherRequest`).
- **Guardians:** `ProvisionLogin` now reads the guardian's already-on-file `nic_number` as the password (`Password` dropped from `ProvisionGuardianLoginRequest`).
- **Students:** `AddStudent.tsx`'s random `generateTempPassword()` is deleted; `index_number` is now passed directly as the password.

### 8.3 "One-time password" first-login flow

✅ **Done.** Confirmed ThunderID's `identity.Provider` has no temporary-credential/force-change primitive (`CreateUser`/`UpdateUser`/`DeleteUser`/`AssignRole` only), so a local `users.must_change_password` column (migration `000031_add_password_lifecycle`) tracks it instead — set `TRUE` whenever Phase 8.2 assigns a default password. `GET /me` now returns the flag; `App.tsx` gates every route behind `PasswordInterstitial.tsx` (a full-page, non-dismissible screen) whenever it's `TRUE`, offering **"Keep this password"** (`POST /auth/keep-default-password`) or **"Set a new password"** (same `ChangePassword` path as 8.4).

### 8.4 Universal self-service password reset

✅ **Done.** ThunderID exposes no reset primitive either, so it's hand-rolled: `password_reset_tokens` (migration `000031`, shared with 8.3) stores only a SHA-256 hash of a short-lived (15 min), single-use token. `AuthService` (`internal/services/auth.go`) exposes `ForgotPassword`/`ResetPassword` (unauthenticated — identity verified via login email + the Phase 8.2 default-password secret: NIC for teacher/parent, index number for student; **admin excluded**, no secondary secret on file, falls back to the authenticated path) and `ChangePassword`/`KeepDefaultPassword` (authenticated, reused by 8.3). Routes on `internal/routes/auth.go`, rate-limited like `/setup/admin`. `ForgotPassword` delivers the reset token out-of-band via `internal/mailer` (SMTP, env-configured; logs instead of sending if `SMTP_HOST` is unset) rather than returning it in the response (audit C-1). Frontend: a "Forgot password?" link on `/signin` → `ForgotPassword.tsx` (identify → generic "check your email" message) and a separate `ResetPassword.tsx` at `/reset-password?token=...` for the emailed link; a "Change password" action shared by every role via `AppHeaderActions` (`ChangePasswordModal.tsx`), plus a dedicated button on `TeacherProfile.tsx`'s banner.

---

## Phase 9 — Pre-release hardening & the deepened role dashboard

**Status: planned — documented here, not yet built.** Everything in this
phase is a proposal for what to prioritize before a first real (v1) release,
written up per request rather than implemented. Nothing below has shipped.

### 9.1 What's left before v1 — functional gaps

Pulled together from every "not yet built" marker elsewhere in this
document, in one place:

- ✅ **Session timeout (Phase 1)** — done, see Phase 1 above.
- ✅ **Medium-locked classes (Phase 5)** — done, see Phase 5 above.
- ✅ **Deeper role-differentiated dashboard (§9.3)** — done, see below.
- ✅ **Orphaned-identity reconciliation job (§0)** — done, see above.
- **Teacher self-service profile edit (§0)** — still admin-only; needs a product decision on scope before building.
- **Load test (§0)** — current DB-pool/rate-limit defaults are untested against realistic concurrent load.
- **CI hardening completion (§0, restated in 9.2)** — `govulncheck`/`deadcode`/`pnpm audit` are still informational-only in CI.
- ✅ **Dead exported functions — done.** A fresh `deadcode` scan (the `audit.md`-era count was stale) found 18 unreachable functions, all thin wrapper methods superseded by a sibling that does the same query with proper authorization/params (e.g. `AttendanceService.GetSummary` superseded by `GetSummaryForTeacher`, `PositionService.IsPrincipal`/`IsVicePrincipalAuthorizedForGrade` superseded by call sites hitting the repo directly) — none were a missing caller that should exist, so all 18 were deleted. `go build`/`vet`/`deadcode` all clean afterward.
- **Low-priority cross-file duplication** (`audit.md` Low tier) — the `userID`-from-context helper repeated across `parent.go`/`student_self.go`/`teacher_self.go`/`timetable/timetable.go`/`notifications/notification.go`, and role/status strings as raw literals instead of shared constants. Cosmetic; fine to defer past v1.

### 9.2 Security hardening checklist before v1

Organized by the categories asked about specifically (XSS, injection, DoS),
plus what else came up while reviewing the current security posture.

**Already in good shape (confirmed, not action items — listed so the gaps
below read as genuine gaps, not a from-scratch list):**
- **SQL/query injection** — every query goes through parameterized `sqlc`-generated code; no string-concatenated SQL exists anywhere in the codebase. Keep this invariant: route all new queries through `sqlc` rather than raw `pool.Query` calls with interpolated strings.
- **XSS** — no `dangerouslySetInnerHTML`/`eval`/`as any` anywhere in the frontend (confirmed in the earlier audit pass); React escapes all rendered content by default. The backend is JSON-only and never serves HTML, so there's no server-rendered-HTML XSS surface either.
- **CSRF** — not applicable as currently built: auth is a Bearer token attached by JS (`useApi.ts`'s axios interceptor), never a cookie, so there's nothing for a cross-site form/request to ride on. Re-evaluate only if auth ever moves to cookie-based sessions.

**Gaps to close before v1:**
- ✅ **§0.1's two data-exposure findings — fixed.** The cross-school attendance leak and the wide-open staff-attendance routes are both closed (see §0.1 above).
- ✅ **Request body size limit — done.** `middleware.BodySizeLimit` (`internal/middleware/body_limit.go`) wraps every request body in an `http.MaxBytesReader` capped at 5 MiB, wired API-wide in `cmd/api/main.go`.
- ✅ **Server-side validation on `logo_url` — done.** `validateLogoURL` (`internal/services/school.go`) requires a `data:image/...` prefix and caps the string at 700,000 chars (a generous ceiling above the frontend's 500KB raw-image check, accounting for base64 inflation), enforced in both `CreateSchool` and `UpdateSchool`.
- ✅ **Per-account rate limiting — done.** `middleware.PerAccountRateLimit` (`internal/middleware/ratelimit.go`, sharing its token-bucket-per-key core with the existing `RateLimit` via a new `keyedRateLimit` helper) keys on the signed-in JWT subject (`userID`), layered on the `protected` route group right after `AuthMiddleware`. Tunable via `API_PER_ACCOUNT_RATE_LIMIT_RPS`/`_BURST` (defaults match the per-IP limiter: 30/60). **Still open, deliberately not done:** moving to a shared store (Redis) — that's an infrastructure/deployment decision (new service dependency, topology), not just code, and isn't blocking while running a single backend instance as today.
- **Unbounded list endpoints** — several `teacherOrAdmin`/`admin` list routes (`/students`, `/teachers`, `/notifications/sent`, etc.) return the entire table in one response with no pagination. Fine at the current ~2,500-student scale; add server-side pagination before a much larger school or a shared multi-tenant deployment makes that response size a real DoS/performance vector on its own.
- ✅ **TLS note added to `docs/SETUP.md` — done.** The app itself still speaks plain HTTP by design (a reverse proxy/load balancer is expected to terminate TLS); a "Production note — TLS" callout now makes that explicit rather than assumed-but-unstated.
- ✅ **Audit log now covers account/role changes — done.** Extended beyond house reassignment/attendance-lock overrides to: teacher account creation/deletion (`internal/services/teacher.go`), student account creation/deletion (`student.go`), guardian portal-login provisioning and guardian record deletion (`guardian.go`), and position assignment/removal — Principal, Vice Principal, and position delete (`position.go`). Not covered: non-academic staff (no login account to provision, lower privilege) — left as a possible follow-up, not required for this gap to be closed.

### 9.3 Role-differentiated teacher dashboard, deepened — ✅ done

What §4.4 built was framing (badge, one panel, copy changes) over identical
underlying data. This makes the data itself differ by rank:

- ✅ **Principal / Vice Principal / Section Head** — a new "Overview" panel (`LeadershipOverviewPanel.tsx`) shows total classes/students in scope and today's attendance completion (marked vs. pending), scoped to whole school (Principal, or a VP with `notify_whole_school`) or specific grades (a scoped VP's `vice_principal_grade_scopes`, or a Section Head's `ListGradeIDsHeadedByTeacher`). Sits alongside the existing `LeadershipPanel` (notification reach), doesn't replace it.
- ✅ **Class Teacher / Subject Teacher** — dashboard stays exactly as it was (own classes only); no overview panel, since they hold no grade- or school-wide scope to summarize.
- ✅ **Backend:** `GET /me/teacher/leadership-overview` (`TeacherSelfHandler.LeadershipOverview`), gated to Principal/VP/Section Head via `PositionService.LeadershipOverview` — a plain Class/Subject Teacher gets `403` (`ErrInsufficientRank`), not empty data. Reuses `PositionService.LeadershipScope` (added when §0.1's leak #1 was fixed) for authorization.
- ✅ **Database — no new tables, as planned.** Two new read-only aggregate queries (`db/queries/leadership.sql`: `LeadershipOverviewCounts`, `LeadershipOverviewGradeNames`), both filtering by grade at the SQL `WHERE` clause level, not fetched-then-filtered in application code.

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
| 8 — NIC & password lifecycle | — | 1–7 |
| 9 — Pre-release hardening & deepened dashboard | Phase 4 (position model) | — (gates v1 release) |