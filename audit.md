# OpenSchool Codebase Audit

**Scope:** full manual review of `backend/internal/**` (Go) and
`frontend/src/**` (TypeScript/React) as of commit `9a3161b` (branch
`development`, 2026-08-10). Read-only review — nothing in this document has
been fixed yet; it's a punch list.

**Method:** two independent full-codebase passes (one per stack), followed
by manual verification of every Critical/High finding against the actual
source before inclusion here. Medium/Low findings were spot-checked but not
all individually re-verified — treat their line numbers as accurate as of
this commit but re-confirm before acting on any single one in isolation.

**Overall take:** this is an above-average codebase for its size — no SQL
injection surface (100% parameterized `sqlc` queries), no `dangerouslySetInnerHTML`/`eval`/`as any`
on the frontend, consistent layering on the backend, and a disciplined
TanStack Query cache layer on the frontend. The findings below are real, but
mostly concentrated in a few specific spots rather than being systemic rot —
see the "Architectural observations" sections at the end of each half for
what's *working*, which is worth preserving while fixing the rest.

---

## Severity summary

| Severity | Count | Where |
| --- | --- | --- |
| Critical | 1 | Backend — password reset |
| High | 4 | Backend — auth/setup, attendance, promotion |
| Medium | 15 | 8 backend, 6 frontend, 1 frontend dependency |
| Low | 33 | 19 backend, 13 frontend, 1 backend dead code |

---

## Critical

### C-1. Password-reset token is handed back to the same client that requested it, with no out-of-band delivery
**File:** `backend/internal/services/auth.go:58-100` (`ForgotPassword`/`issueResetToken`), `backend/internal/models/auth.go:17`
**Category:** bug (security)

`ForgotPassword` verifies the caller knows a user's login email plus one
"secret" — the person's **NIC number** (teacher/parent) or **index number**
(student) — and then returns a working, single-use password-reset token
**directly in the HTTP response body** (`ForgotPasswordResponse{ResetToken: token, ...}`,
`auth.go:100`). The caller can then immediately call `POST /auth/reset-password`
with that token to set a brand-new password and take over the account —
there is no email/SMS confirmation step in between.

The problem is that NIC numbers and student index numbers are not truly
secret to just the account owner in a school setting — they appear on ID
cards, report cards, admission paperwork, and are often known to family
members, classmates, or school staff. Rate limiting on the endpoint
(`middleware.RateLimit(1, 5)` per IP — see `backend/internal/routes/auth.go:30`)
doesn't mitigate this, because the attack is "one correct guess of a
semi-public identifier," not brute force.

**Failure scenario:** anyone who knows a student's email (often
`firstname.lastname@school` or similar, or simply observed once) and their
index number (visible on their ID card/report card) can call
`/auth/forgot-password`, receive a working reset token in the JSON
response, and immediately call `/auth/reset-password` to lock the real
student out and take over their account — no access to the student's
inbox, phone, or physical device required at any point.

**Note:** the code comment at `auth.go:26-29` documents this as an
intentional design tradeoff ("the token is handed straight back to the
same client that just verified its own identity"), so this may be a
conscious decision the team is willing to accept for v1 — but it should be
a **decision**, made with the tradeoff explicit, not a default. The
straightforward fix is to deliver the token out-of-band (email is the
obvious channel, since every account already has one on file) rather than
in the API response, which is the whole point of a "forgot password" flow.

---

## High

### H-1. First-run admin registration can permanently deadlock a fresh instance
**File:** `backend/internal/services/setup.go:84-87`
**Category:** bug

`RegisterFirstAdmin` creates the ThunderID identity, then the local
`users` row (`role = "admin"`), then calls `s.idp.AssignRole(...)`. Every
earlier failure branch in this same function calls `rollbackIDPUser(...)`
to clean up before returning — but the `AssignRole` failure branch does
not, and doesn't delete the just-created `users` row either:

```go
if err := s.idp.AssignRole(ctx, identity.RoleID("admin"), idpUser.ID); err != nil {
    return db.User{}, fmt.Errorf("failed to assign admin role: %w", err)
}
```

**Failure scenario:** ThunderID is briefly unreachable, or
`THUNDERID_ROLE_ADMIN` is misconfigured, at the exact moment someone
completes the one-time `/setup` flow. The local `users` row with
`role = "admin"` now exists, so `NeedsSetup()` (`count(role='admin') == 0`)
returns `false` forever after — `/setup` redirects everyone to sign-in — but
the ThunderID account has no admin role, so that person can't sign in
either. The instance is now unbootstrappable without manual DB/IDP
surgery, on what's supposed to be the most reliable path in the app (it
only runs once, on day one).

### H-2. `ListSessionsByClass` is missing the authorization check every sibling method has
**File:** `backend/internal/services/attendance.go:188-190`, `backend/internal/handlers/attendance.go:164-178`, route: `backend/internal/routes/attendance.go:42`
**Category:** bug (broken access control)

Every other method in `AttendanceService` that takes a `classID`
(`MarkAttendance`, `GetSession`, `DeleteSession`, `ListBySession`,
`ListByStudentForTeacher`, `GetSummaryForTeacher`) calls
`authorizeTeacherForClass(ctx, actor, classID)` before touching data.
`ListSessionsByClass` does not — the handler doesn't even extract an
`actor` — and it's registered on the `teacherOrAdmin` route group, meaning
*any* signed-in teacher, not just one assigned to that class:

```go
func (s *AttendanceService) ListSessionsByClass(ctx context.Context, classID uuid.UUID) ([]db.AttendanceSession, error) {
    return s.repo.ListSessionsByClass(ctx, classID)
}
```

**Failure scenario:** `GET /classes/:id/attendance/sessions` with any
valid class UUID, from any teacher's token, returns that class's full
session list (dates, who took attendance) regardless of whether the
requesting teacher has any relationship to that class. Given how
consistently this exact check is applied everywhere else in the same file,
this reads as a one-line oversight rather than a design choice — a quick,
low-risk fix.

### H-3. New student/teacher accounts can be silently created with no role, permanently locking the user out
**File:** `backend/internal/services/student.go:68-70`, `backend/internal/services/teacher.go:76-78`
**Category:** bug

`CreateStudent`/`CreateTeacher` call `s.idp.AssignRole(...)` after
provisioning the ThunderID user and local profile, but only log a failure
(`log.Printf(...)`) rather than returning an error — unlike the equivalent
call in guardian provisioning (`guardian.go:174`), which correctly returns
a hard error on the same failure.

**Failure scenario:** a transient ThunderID hiccup during role assignment
still results in `201 Created` with a fully-formed student/teacher record.
The account has no `student`/`teacher` claim on its JWT, so
`middleware.RequireRole` rejects every subsequent request from that user
with 403 — and the only trace of what went wrong is a log line the admin
who created the account will never see. They'll file this as "the account
doesn't work" with no clue why.

### H-4. Promotion's bulk class-reassignment write isn't transactional
**File:** `backend/internal/services/promotion.go:71`, `backend/internal/repositories/promotion.go:71-82`
**Category:** bug

`CommitAssignments` — used for both year-end promotion and general class
shuffle — runs `BulkDeleteClassStudentsForYear` and then
`BulkInsertClassStudents` as two separate statements, not wrapped in a
transaction. The repository's own comment acknowledges this ("not wrapped
in a transaction ... safe to re-run since it's idempotent"), which is true
for *retrying after a clean failure*, but doesn't cover a crash or
connection drop between the two calls.

**Failure scenario:** an admin commits promotion for 300 students; the
delete succeeds, then the pool connection drops before the insert runs.
Every one of those 300 students now has **no class assignment at all**
for the target academic year — a class list that shows entirely
"unassigned" students — until someone notices and manually re-runs the
commit. Given this operates on enrollment data for an entire grade at
once, the blast radius of a mid-write interruption is large.

---

## Medium

### Backend

- **M-1 — `backend/internal/middleware/auth.go:138-141`** — JWT validation checks issuer and signing method but never the `aud` (audience) claim (`jwt.WithAudience` is not passed to `jwt.ParseWithClaims`). If ThunderID is ever shared by a second application (or in a future multi-tenant setup), a valid token minted for that other app would also be accepted here, since only the issuer is checked.
- **M-2 — `backend/internal/services/guardian.go:138-145`** — `ProvisionLogin` uses `guardian.NicNumber` as the initial portal password with no non-empty check (unlike the `Email` check three lines above). `NICNumber` is required on create but *not* on update (`backend/internal/models/guardian.go:39`), so an admin can blank a guardian's NIC via `PUT /guardians/:id` and then provision a login with an empty password sent to ThunderID.
- **M-3 — `backend/internal/handlers/notifications/notification.go:160-172`, route at `backend/internal/routes/notifications/notification.go:36`** — `GET /notifications/:id/stats` has no ownership check, unlike `UpdateDraft`/`SendDraft`/`DeleteDraft` in the same file, which all check `existing.CreatedBy != callerUserID && callerRole != "admin"`. Any authenticated teacher can pull the read/unread delivery counts for any notification ID, including admin whole-school announcements.
- **M-4 — `backend/internal/services/term_mark.go:54-95`** — `BulkUpsertMarks` authorizes the class+subject combination once, up front, then writes a mark for each `entry.StudentID` in the request body without checking that student is actually enrolled in that class. A teacher legitimately assigned to one class/subject can submit marks for an arbitrary student UUID from a different class.
- **M-5 — `backend/internal/services/student.go:174-198`, `backend/internal/services/teacher.go:169-194`** — `DeleteStudent`/`DeleteTeacher` delete the profile row, then the `users` row, then the IDP user, in that order. The code's own comments anticipate the *last* step failing (documented orphan case), but not the *middle* one: if `DeleteUser` fails after the profile is already gone, the local `users` row and the IDP account both remain live and able to authenticate, with no profile anywhere — the opposite, undocumented orphan case.
- **M-6 — `backend/internal/thunderid/client.go:139,184,212,255`, surfaced via e.g. `services/student.go:141`, `services/teacher.go:138`** — Raw ThunderID error response bodies are wrapped into Go errors and several handlers return `err.Error()` straight to the HTTP client. `setup.go`'s admin-registration handler deliberately avoids leaking upstream error text to an unauthenticated caller; most other IDP-touching handlers (student/teacher/guardian update) don't apply the same discipline.
- **M-7 — `backend/internal/services/curriculum_preset.go:286-456`** — The curriculum preset seeder runs dozens of sequential creates with no transaction. A failure partway through (e.g. item 40 of ~90) leaves a partially-seeded curriculum visible to admins until someone notices and re-runs it (it is documented as idempotent/re-runnable, which limits but doesn't eliminate the impact).
- **M-8 — `backend/internal/handlers/student_portfolio.go`** (all `Update*`/`Delete*` handlers, e.g. lines 115-131, 216-232) — routes take both `:id` (student) and `:record_id`, but only `record_id` is used to look up/mutate the row — `studentID` is parsed and discarded. Not exploitable today (the route group already has unrestricted cross-student access), but `PUT /students/{any-id}/progress-reports/{record_id}` will silently update a report belonging to a different student than the URL implies, which will bite the first time this pattern is copied into a more restrictive route group.

### Frontend

- **M-9 — `frontend/src/pages/admin/dashboard/Dashboard.tsx:31,126`, `frontend/src/pages/admin/attendance/Attendance.tsx:31,44,58,83`** — `const TODAY_YMD = toYmd(new Date())` is computed once at **module load time**, not per-render. An admin who leaves either page open in a tab across local midnight keeps seeing the previous day's "today" data — `useDailySessions(TODAY_YMD)` never refetches for the new date, and Attendance's "Jump to today" button also jumps to the stale frozen date. `TeacherDashboard.tsx`'s `todayISODate()` call at render time is the correct pattern already used elsewhere in the codebase.
- **M-10 — `frontend/src/hooks/usePagination.ts:7-13`**, consumed by `Students.tsx:69`, `Subjects.tsx:52` — clamps the displayed page to the new max but never resets `page` when the underlying `items` array shrinks and grows again. A user on page 3 who searches (narrowing to 1 page, correctly clamped) and then clears the search snaps back to page 3 of the newly-restored full list instead of page 1.
- **M-11 — `frontend/src/pages/admin/timetable/GradeSections.tsx:38-55`** — In `PeriodsEditor`, `const active = rows ?? periods ?? []`. Editing periods locally (populating `rows`) and then clicking "Regenerate from Timetable Settings" without saving first refetches `periods`, but the modal keeps rendering stale local `rows`. Clicking "Save changes" afterward writes the stale pre-regenerate edits back, silently clobbering the just-regenerated grid. `rows` needs to be cleared in the regenerate mutation's `onSuccess`.
- **M-12 — `frontend/src/pages/admin/dashboard/AnalyticsSection.tsx:104-107`** — `g.label[0].toUpperCase() + g.label.slice(1)` has no guard for an empty `label`. If the backend ever returns an unlabeled gender bucket, `g.label[0]` is `undefined` and `.toUpperCase()` throws — and since there is no `ErrorBoundary` anywhere in the app (see frontend architectural note below), this blanks the entire Admin Dashboard. Every other capitalization site in the codebase (`Students.tsx:359`, `TeacherClasses.tsx:116`, `StudentDetail.tsx:299`, `TeacherProfile.tsx:81`) guards this; this is the one unguarded instance.
- **M-13 — `frontend/src/pages/admin/settings/Settings.tsx:244-260`** — The Timezone, Default Language, Academic Calendar, and Grading System `Select` controls have no `onChange` handler and aren't included in `handleSave`'s payload. An admin who changes them sees the selection visually stick (Carbon's uncontrolled `defaultValue`), but nothing persists — it silently reverts on next load with no indication it was never saved.
- **M-14 — `frontend/src/App.tsx:139-146`** — `/school-setup` is reachable via `ProtectedRoute` alone, with nothing redirecting an admin *away* from it once setup is already complete (only `RootLayout` redirects *into* it). An admin who revisits the URL after onboarding gets `submitAll`'s `createSchool.mutateAsync` failing forever (school already exists), with "Retry" repeating the same failing call with no way out.

---

## Low

Grouped by theme; each is a real, verifiable issue, but none are urgent in
isolation — treat this section as a cleanup backlog.

### Backend — resource/error handling discipline

- **`backend/internal/services/report_export.go:218-220`** — `_ = pdf.Output(&buf)` discards the render error; a PDF generation failure still returns `200 OK` with `application/pdf` and whatever partial/empty bytes ended up in the buffer.
- **`backend/internal/services/convert.go:57-61`** — `pgNumeric`'s `_ = n.Scan(...)` discards the scan error, silently turning a malformed decimal into a `NULL` mark instead of a visible failure.
- **`backend/internal/config/env.go:6`** — `_ = godotenv.Load()` discards the error; a missing/malformed `.env` fails completely silently, with every downstream `os.Getenv` call just seeing empty strings and no log line pointing at the real cause.
- **`backend/internal/services/student.go:141`, `backend/internal/services/teacher.go:138`** — IDP update failures are logged via `fmt.Printf("warning: ...")` instead of `log.Printf`, inconsistent with the rest of the codebase (including three lines away in the same files' create paths) and bypassing whatever the app's actual log destination/format is.
- **`backend/internal/services/notifications/notification.go`, `backend/internal/services/timetable/timetable.go`** — recipient-list resolution uses `_, _ := ...`-style calls in several places; a failed lookup silently drops a guardian/teacher from a notification with no log line, making "why didn't I get notified" un-investigatable. (Already tracked in `docs/plan.md` §0 — repeated here since it's still open.)

### Backend — duplicated / redundant logic

- **`backend/internal/thunderid/client.go:53-259`** — every `Client` method (`CreateUser`/`UpdateUser`/`DeleteUser`/`AssignRole`) fetches a fresh OAuth token from ThunderID on every call; no caching/reuse of the client-credentials token across its TTL. Under real load (bulk imports, a school day's worth of writes) this at least doubles outbound requests to the IDP and adds a network round-trip to every identity-touching write.
- **`backend/internal/services/position.go:156-176`** — `SummaryForTeacher` re-fetches the same `teacher_positions` row via `GetForTeacher` that `RankForTeacher` (called two lines above) already fetched internally — a redundant round-trip that could be avoided by having `RankForTeacher` return the position alongside the rank.
- **`backend/internal/handlers/parent.go`, `handlers/timetable/timetable.go`, `handlers/notifications/notification.go`, `handlers/student_self.go`, `handlers/teacher_self.go`** — at least five near-identical "parse `userID` from gin context, 401 on failure" helpers exist independently (some duplication is structurally forced by package boundaries, but the logic itself is copy-pasted rather than factored into one shared, importable helper).
- **`backend/internal/services/attendance.go:122-151`** — `resolveActingUser` re-implements the "ensure a local `users` row exists for this caller" responsibility that `MeService.EnsureProvisioned` (`services/me.go:39`) already owns, via a second independent code path. If the two ever drift (e.g. one starts setting `MustChangePassword`, the other doesn't), the resulting row differs depending on which endpoint ran first.
- **`backend/internal/services/curriculum_preset.go`, `setup.go`, `guardian.go`, `student.go`, `teacher.go`** — role strings (`"admin"`/`"teacher"`/`"student"`/`"parent"`) and status strings (`"active"`/`"resigned"`/`"present"`/`"draft"`/etc.) are repeated as raw literals across dozens of files rather than shared constants — no mismatches found today, but a future typo (`"techer"`) wouldn't be caught by the compiler.

### Backend — misc

- **`backend/internal/services/timetable/grade_section.go:251-312`** (`generatePeriodsFromSettings`) — if a grade section's configured interval start time falls after the last auto-generated period, the interval is appended after the loop with the next `sortOrder` rather than at its chronologically correct position, so the generated grid can display the interval out of time order. Only triggers on inconsistent admin input (interval time outside the generated school day), which isn't validated up front.
- **`backend/internal/handlers/setup.go:78-89`** (`friendlyBindError`) — converts validator errors to user-facing text via substring-matching on Go field names (`strings.Contains(msg, "Email")`); any validation failure whose message doesn't contain one of four hardcoded substrings falls back to a generic message, and this would break silently across a validator-library version bump.

### Frontend — duplicated date/"today" logic (root cause of M-9)

- **`frontend/src/lib/date.ts:1-5`** (`todayISODate`) vs. ad hoc `toYmd` reimplementations in `Attendance.tsx`, `Dashboard.tsx`, `AcademicYears.tsx`, `ClassDetail.tsx`, `Reports.tsx`, `StudentLeadershipAwards.tsx`, `StudentDisciplinary.tsx`, `NonAcademicStaff.tsx`, `StaffAttendance.tsx` — nearly a dozen files each hand-roll the same 3-line "format a Date as YYYY-MM-DD" logic instead of using the one shared helper. This is the underlying reason M-9 was easy to introduce — a fix to the shared helper won't reach the other ~9 copies. (Already tracked in `docs/plan.md` §0 for the `TeacherDashboard.tsx`/`TeacherAttendance.tsx` pair specifically; the duplication is wider than that.)

### Frontend — duplicated components

- **`frontend/src/pages/student/StudentDashboard.tsx`** and **`frontend/src/pages/parent/ChildDetail.tsx`** — the attendance table, marks table, and timetable-grid tab components are near-byte-identical (~150 lines), differing only in which query hook is called (`useMy*` vs `useChild*`). A future fix to one (e.g. a status-tag fallback) is likely to be applied to only one copy.
- **`frontend/src/pages/admin/attendance/AttendanceMark.tsx:37-79`** and **`frontend/src/pages/admin/staff/StaffAttendance.tsx:21-54`** — `StatusButton` is defined twice with the same styling/interaction logic, once per attendance status enum (student's `excused` vs. staff's `leave` differ, so full unification needs a small config table, but the visual logic is copy-pasted).
- **`frontend/src/components/common/PageHeader.tsx`** — fully implemented, but not imported anywhere in the codebase. Dead code.
- **`frontend/src/components/school/index.ts`** — contains only `export {};`; never imported (both components it would re-export are imported directly elsewhere). Vestigial barrel file.

### Frontend — misc

- **`frontend/src/pages/admin/promotion/Promotion.tsx:71-76` vs. `:102`** — `groups` buckets rows into "graduating" by testing `row.next_grade_id ?? "graduating"`, while `unassignedCount` filters using the actual `row.graduating` boolean on the same data. Both fields exist; using two different signals for the same concept in one file is fragile if the backend's `next_grade_id === null ⟺ graduating === true` invariant ever loosens.
- **`frontend/src/pages/admin/students/StudentDetail.tsx:50-61`, `frontend/src/pages/admin/teachers/TeacherDetail.tsx:39-49`** — `studentToForm`/`teacherToForm` split `full_name` on whitespace to derive `given_name`/`family_name` for the edit form. Lossy round-trip for any name with irregular spacing or a multi-word given name; duplicated in both files.
- **`frontend/src/pages/admin/timetable/TimetableEditor.tsx:357-359`**, **`frontend/src/pages/notifications/NotificationComposer.tsx:421-425`** — array index used as React `key` for lists that can reorder/be removed from the middle (validation issues list; recipient-rule chips, which *are* removable mid-list via a close button). Low practical impact today, but the composer's case is exactly the kind of mutable-list-with-index-key pattern that causes real bugs.
- **`frontend/src/layouts/TeacherLayout.tsx:10`** — "Review Timetables" nav item is shown to every teacher, not just section heads/reviewers. Not a security issue (the queue is legitimately empty for non-reviewers), just dead-weight navigation for most teachers.
- **`frontend/src/layouts/RootLayout.tsx:109`, `frontend/src/pages/admin/settings/Settings.tsx:57`** — near-identical inline `AxiosError` status-checking logic duplicated between the two files; a shared `isNotFoundError(error)` helper in `lib/errorMessage.ts` would remove it.
- **`frontend/src/components/AppHeaderChrome.tsx:26-29`** — the dev-only "Copy Token" action swallows a `getAccessToken()` rejection with no `.catch`/error surface (harmless — gated behind `import.meta.env.DEV`).
- **`frontend/src/App.tsx:79`** — `stillLoading` only factors in `meLoading` once `role !== null`; if `useProvisionUser` is slow and `role` resolves to `null` first, the app can flash `AccessRestricted` for a user who does have a valid role. Low practical impact (the two calls typically resolve close together) but an implicit coupling that's easy to break on a future edit.
- **`frontend/src/App.tsx:97-103`** — the loading placeholder route renders a bare `<div>` with a hardcoded `#f4f4f4` background outside any stylesheet/theme token.

---

## Improper / misleading comments

- **`docs/SETUP.md`** (fixed as part of this audit pass) — the role/portal
  table described the teacher dashboard as "currently placeholder data —
  not wired to real records yet." This was stale — that mock data was
  removed per commit `48043d8` ("remove Mock data on TeacherDashboard").
  Corrected in this pass.
- **`docs/SETUP.md`**'s "Starting over" `TRUNCATE TABLE` list (fixed as
  part of this audit pass) — was missing ~20 tables added by migrations
  `000023`–`000032` (audit log, non-academic staff, staff attendance,
  positions, student portfolio tables, password reset tokens, class
  medium, etc.). Corrected in this pass.
- **`backend/internal/repositories/promotion.go`** — the comment
  justifying the non-transactional bulk write ("not wrapped in a
  transaction ... safe to re-run since it's idempotent") is accurate about
  retry-safety but doesn't mention the mid-write interruption window it
  doesn't cover — see H-4. Not wrong, but incomplete in a way that could
  mislead a future reader into thinking the pattern is fully safe.

No other stale, misleading, or restates-the-code-badly comments were found
in either stack during this pass — comment quality overall is good, and
several non-obvious workarounds (`SchoolSetup.tsx`'s idempotent-retry
logic, `lib/carbonA11y.ts`'s CSS-collision fix, `promotion.go`'s `UNNEST ... WITH ORDINALITY`
note) are genuinely well-documented and worth preserving as a model for
future comments.

---

## Architectural observations

### Backend

**Working well:** SQL access is exclusively through parameterized `sqlc`
queries — no string-concatenated SQL was found anywhere, so injection risk
is effectively nil. Generated code consistently closes result sets. The
class/subject teacher-assignment authorization pattern
(`authorizeTeacherForClass`, `authorizeTeacherForClassSubject`,
`authorizeTeacherForStudent`) is well-factored and reused consistently,
with the two gaps noted above (H-2, M-4) reading as isolated oversights
against an otherwise-solid pattern. The notification module's
`authorizeSender` is a genuine single choke-point every send/update/delete
path routes through, and parent/guardian self-service handlers
consistently re-derive the caller's identity and verify
`IsGuardianOfStudent` before returning child data — no IDOR found there.

**Systemic risk worth flagging as one item:** identity-provider role
assignment is handled *differently* at every one of its four call sites —
`setup.go` returns an error with no rollback (H-1), `student.go`/`teacher.go`
only log and continue (H-3), and `guardian.go` does the "correct" thing
(returns a hard error). This should be unified into one shared helper with
one agreed failure policy, both to fix the three broken paths and to stop
a fifth future call site from picking a fourth different behavior.

### Frontend

**Working well:** one CRUD-page template is used almost universally
(list + search/filter + modal create/edit + `ConfirmDeleteModal` +
standard loading/empty/error states), making the ~40 admin pages easy to
audit and extend. The query layer is unusually disciplined — every query
key is a named, typed builder, and no stale-cache or cross-entity
collision was found anywhere across 20+ query files. Token handling is
fully delegated to the ThunderID SDK with zero manual storage, and there
is no `dangerouslySetInnerHTML`, `eval`, or `as any` anywhere in the
frontend.

**Systemic risks worth flagging as line items of their own:**
1. No `ErrorBoundary` exists anywhere in the app, so any single unguarded
   render-time exception (M-12 being the one confirmed live instance)
   blanks the entire page with no recovery UI — worth adding at least a
   top-level boundary given how careful the rest of the codebase otherwise
   is about guarding `?.`/`??`.
2. The `TODAY_YMD`/`toYmd` duplication (Low, "duplicated date logic"
   section above) is the direct root cause of a real Medium bug (M-9) —
   consolidating onto the one shared `lib/date.ts` helper would prevent
   recurrence, not just fix the two known instances.

---

## Dependency & static-analysis findings (tooling-detected)

Added when CI was extended with `staticcheck`/`govulncheck`/`deadcode`
(backend) and `pnpm audit` (frontend) — see the workflow files for why
these currently run informationally rather than as blocking gates.

- **Low — backend — dead code** — `go run golang.org/x/tools/cmd/deadcode@latest ./...`
  reports 19 unreachable exported functions as of this update, e.g.
  `GuardianRepository.Create`, `GuardianRepository.Update`,
  `AttendanceService.GetSummary`, `TimetableService.GetStudentCurrentClass`,
  `PositionService.IsPrincipal` (full list in CI output). None are called
  from anywhere reachable from `main`. Low risk, but worth a cleanup pass —
  each one is either truly dead (safe to delete) or a sign a caller that
  should exist doesn't yet.
- **Low — backend — `staticcheck`/`go vet`** — both clean, zero findings,
  as of this update.
- **Medium — frontend — unpatched dependency advisories** — `pnpm audit --prod`
  reports 2 unresolved advisories: `react-router` (high, versions
  `>=8.0.0 <8.3.0`, a direct dependency — upgrade to `>=8.3.0`) and
  `dompurify` (moderate + low, pulled in transitively via
  `@thunderid/react` — not directly upgradable from this repo; needs a
  `@thunderid/react` bump or a `pnpm.overrides` pin). Of the 5 packages
  `docs/plan.md` §0 originally flagged (`brace-expansion`, `immutable`,
  `react-router`, `postcss`, `dompurify`), 3 have since been resolved by
  routine dependency updates; these 2 remain open.
- **Informational — backend — Go stdlib/toolchain CVEs** — `govulncheck`
  currently reports ~20 findings, almost all resolved by bumping the Go
  toolchain version (e.g. `net/url`, `crypto/x509`, `os` fixes in
  `go1.26.1`) rather than by an app-code change. Re-run after any Go
  version bump to confirm these clear; not itemized individually here
  since they track the toolchain, not this codebase.

---

## Suggested prioritization

1. **C-1** — decide deliberately whether the current password-reset design
   is acceptable, or move token delivery out-of-band (email).
2. **H-1, H-2, H-3** — each is a small, low-risk, high-value fix (add a
   missing rollback call, add a missing authorization check, change a log
   call to a returned error).
3. **H-4** — wrap `CommitAssignments`' delete+insert in a transaction.
4. Everything in **Medium** is worth a pass before the next release; none
   are individually urgent.
5. **Low** items are a fine backlog to work through opportunistically,
   ideally "next time you're already touching that file" rather than as a
   dedicated sweep.
