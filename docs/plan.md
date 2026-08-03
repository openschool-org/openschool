# OpenSchool Feature Roadmap

**Source:** grew out of a codebase audit and a feature-enhancement request to grow OpenSchool into a full Sri Lankan Government School ERP, plus a session-timeout ask. This document is the single, current source of truth for both the audit's remaining open items and the feature roadmap — the standalone audit document has been folded in here and removed.

**How to read this:** each phase lists what already exists to build on (so we don't reinvent it) and what's net-new. Phases 1–3 are independent of the role-hierarchy work in Phase 4 and can proceed in parallel. Phases 5 and 6 depend on Phase 4's position model existing first (promotion and staff permissions need it).

**Role-hierarchy decision:** the new position hierarchy (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher) will be implemented as an **in-app position/title layer** on top of the existing 4 ThunderID-backed roles (`admin`/`teacher`/`student`/`parent`), *not* as new identity-provider roles. Reasoning: the role column is 1:1 with ThunderID's IDP role config, and two prior silent production failures were caused by hand-typed strings that have to match out-of-repo ThunderID console configuration (see the ThunderID attribute-name note in §0). Adding new IDP roles would repeat that exact risk on every environment. The existing `section_head.go`/`prefect.go` pattern — an in-app permission overlay on top of a base role — already proves this approach works here.

**Session-timeout decision:** 30 minutes of inactivity triggers an auto sign-out and redirect to `/signin`.

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

---

## Phase 3 — Attendance: late status verification, session locking, absence notifications

- **Late status:** already fully implemented end-to-end — the `present`/`absent`/`late`/`excused` check constraint exists in migration `000006`, and `internal/services/attendance.go` already validates it. Verify only that the teacher-facing marking UI exposes all three/four options; if not, that's a frontend-only fix.
- **Session locking (net-new):** no time-window edit restriction exists today. Reuse the `student_enrollment_locks` schema pattern (migration `000020`) as a model: add a 24-hour lock check to `MarkAttendance`/edit paths, with an admin-only override, recorded through the Phase 1 audit-log helper.
- **Guardian absence notification (net-new):** hook into the existing notification system — either the rule-based path in `internal/services/notifications/notification.go` or a direct `SendDirect` call (same integration pattern already used by `timetable.go`'s `notifyPublication`) — to notify a student's guardian(s) whenever a record is marked `absent`, including student name, date, class, and status.

---

## Phase 4 — Roles: in-app position/hierarchy layer

Per the decision above, this does **not** touch ThunderID or the base `role` column.

- Add a position/title concept (Principal, Vice Principal, Section Head, Class Teacher, Subject Teacher, Teacher) scoped to `teacher_profiles` (and the new staff module from Phase 6) as data, not as a new auth mechanism.
- Extend the existing overlay pattern already used in `section_head.go`, `prefect.go`, and the class/subject ownership checks in the attendance and marks services (`authorizeTeacherForClass`, `authorizeTeacherForClassSubject`) so a position determines the *scope* of what a user can act on (e.g. a Section Head's scope is their assigned grade's classes) — no parallel RBAC engine.
- Extend `notification.go`'s `authorizeSender` so notification permissions follow the same hierarchy (Class Teacher → own class/students/guardians; Subject Teacher → own subject's students/guardians; Section Head → assigned grades/staff), building on the existing `RecipientRule` types rather than inventing a new one.

---

## Phase 5 — Academic year promotion & class reassignment

*Depends on Phase 4's position model for who is authorized to run promotion/reassignment at each scope.*

- **Promotion (net-new):** no promotion or enrollment-history mechanism exists — `class_students` is just a per-year join row today. Add an end-of-year batch service that inserts next-year `class_students` rows per eligible student (grade N → N+1), never deleting prior-year rows so history is preserved automatically by the existing join-row-per-year model.
- **Class reassignment/shuffle (net-new):** bulk-move endpoint(s) for redistributing students across new classes before publishing a year, plus a single-student move. Use the same batched-`UNNEST`-update pattern already applied for the resolved house-assignment N+1 (audit finding 4.1) instead of a per-student update loop.
- **Timetable copy/revise/delete UI:** surface the already-implemented `useCopyTimetable`/`useReviseTimetable`/`useDeleteTimetable` hooks in the `Timetables.tsx` list page here — a new academic year is exactly when these actions are needed, closing out the dead-hook decision from §0.

---

## Phase 6 — Staff management & student profile / prefect expansion

*Depends on Phase 4's position model for staff permission scoping.*

- **Non-academic staff (net-new):** no concept beyond `teacher_profiles` exists today. Add a `staff_profiles`-style module generalizing the existing teacher-profile shape (attendance, leave, employment history) to non-academic roles (Lab Assistant, Librarian, Office Staff, IT Officer, Security, etc.).
- **Student profile expansion:** add the additional record types from the feature request (activities, clubs, awards, disciplinary records) as new tables plus a profile tab, following the existing `StudentDetail.tsx` tab-composition pattern already used for `ClassMarks`/`SubjectEnrollment`/`StudentGuardians`.
- **Prefect boards:** `prefect.go`/`Prefects.tsx` already implement current-board management; extend with `academic_year_id` scoping and an archive/history view rather than building a new domain.

---

## Phase 7 — Analytics dashboard & CRUD consistency polish

- **Analytics:** extend `pages/admin/dashboard/Dashboard.tsx` with the additional breakdowns requested (gender/house distribution, staff analytics, notification and timetable-completion stats) — these are new aggregate queries against existing tables, not new domain concepts.
- **CRUD consistency:** audit existing admin pages against the already-established convention (Carbon `ComposedModal` forms, shared `ConfirmDeleteModal`, `EmptyState`, `InlineNotification`) and close gaps — missing edit-confirmation dialogs, inconsistent soft-delete usage — rather than introducing a new design system.

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



### New features to built 
- Every member has password reset Feature And working Correctly with onetime password. initial accout creation. 
- In the Student,s Gaurdians, Teachers Add a new feature to see the orphans Gaurdians without children. Teachers Resigned or transfers from school, Students leave the school And make them inactive accordingly                                                                                          
