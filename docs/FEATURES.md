# OpenSchool — Feature Guide

This is the current, as-built feature list — what exists in the codebase today,
organized by module. For the history of how it got here (phased roadmap,
decisions, and rationale), see [`plan.md`](./plan.md). For how to stand up an
instance and walk through these features hands-on, see [`SETUP.md`](./SETUP.md).

Every feature below is scoped by **academic year**: almost all academic data
(classes, enrollments, attendance, marks, timetables, section heads, prefects)
carries an `academic_year_id` and is filtered by the single `academic_years`
row with `is_current = true`. There is no separate "draft year" concept —
promotion and class-shuffle write into a not-yet-current year, which stays
fully editable until an admin flips it current.

---

## Roles & positions

Authentication and the four base roles come from **ThunderID**, the external
identity provider (see [`THUNDERID.md`](./THUNDERID.md)). Every user has
exactly one base role, carried in the `roles` claim of their JWT:

| Role | Identity source |
| --- | --- |
| `admin` | Registered once via the `/setup` wizard on a fresh instance |
| `teacher` | Created from the admin's **Teachers** page |
| `student` | Created from the admin's **Students** page |
| `parent` | Provisioned from a student's **Guardians** tab ("Set Up Login") |

On top of the base `teacher` role, an **in-app position layer** (not backed
by ThunderID — see the rationale in `plan.md` §"Role-hierarchy decision")
adds a hierarchy used for notification reach and dashboard framing:

`Principal → Vice Principal → Section Head → Class Teacher → Subject Teacher → Teacher`

- **Principal / Vice Principal** — permanent appointments (`teacher_positions`
  table), not renewed per academic year. At most one Principal exists at a
  time. A Vice Principal is scoped to specific grades (`vice_principal_grade_scopes`)
  or, if granted, the whole school.
- **Section Head** — a year-scoped teacher-in-charge (TIC) of a grade or
  grade+stream (`section_heads`), reviews and approves/rejects timetables for
  their grade(s).
- **Class Teacher** — the form teacher of a specific class (`classes.form_teacher_id`),
  year-scoped.
- **Subject Teacher** — a teacher assigned to teach a subject in a class
  (`class_subject_teachers`), year-scoped.

Rank determines two things in the UI: how much of the school a teacher can
target when sending a notification (§ Notifications), and what their own
dashboard shows them (a `RoleBadge` and, for Section Head and above, a
"Leadership" panel).

---

## Identity, accounts & password lifecycle

- **Account provisioning** — teacher, student, and parent accounts are all
  created from inside OpenSchool (Teachers page, Students page, a student's
  Guardians tab), which provisions the matching ThunderID account
  automatically. There is no self-registration for any role.
- **NIC/index-number default passwords** — new accounts don't get a
  manually-typed password. A teacher's or guardian's initial password is
  their NIC number (`nic_number`, required and unique per person); a
  student's is their `index_number`. Admins are the one exception — they set
  their own password during the one-time `/setup` flow.
- **Forced first-login password change** — any account created with a
  default password is flagged `must_change_password`. On next sign-in the
  user is routed to a full-page interstitial before they can reach anything
  else, with the choice to keep the default password or set a new one.
- **Self-service password reset** — "Forgot password?" on the sign-in page
  identifies the user by login email plus their on-file secret (NIC for
  teacher/parent, index number for student — admins are excluded, since they
  have no secondary secret on file) and issues a short-lived, single-use
  reset token (15 minutes, stored only as a hash). A signed-in user can also
  change their password at any time from the header menu.
- **Orphaned-identity handling** — if provisioning a ThunderID account
  succeeds but the local Postgres write fails (or vice versa), a
  compensating rollback attempts to delete the partially-created side. This
  is best-effort today (see `audit.md` for the known gap and a proposed
  reconciliation job).

## School setup & academic structure

- **First-run School Setup wizard** (`/school-setup`) — a guided,
  resumable, idempotent flow: School details → Houses → Grades → Classes →
  Mediums → Done. Blocks access to the rest of the app until the school
  record and grade range exist. See `SETUP.md` §3 for the full walkthrough.
- **School profile** — name, address, phone, email, an inline-stored logo,
  the grade range the school runs (1–13), and a school type (boys / girls /
  mixed), editable afterward from Settings. A single-sex school type is
  enforced against `student_profiles.gender` at student create/update time —
  gender stays optional under `mixed`, but must be set and match under
  `boys`/`girls`.
- **Academic years** — create/list years, and flip exactly one to "current"
  (`SetCurrentAcademicYear`), which is what almost every other module reads
  as its implicit scope.
- **Houses** — named groups (with an editable color) that students and staff
  are auto-assigned into using a least-populated-house-with-random-tiebreak
  balancing query, so houses self-balance without admin-maintained
  configuration. Manual reassignment is available and audit-logged.
- **Grades, classes, streams** — grades are the 1–13 school-year structure;
  regular grades get lettered class sections (10-A, 10-B, …); Grade 12/13
  (Advanced Level) instead offer **streams** (Physical Science, Bio Science,
  Commerce, Arts, Technology) with editable short codes and their own
  section counts (12-M1, 12-M2, 13-C1, …). Streams that need finer grouping
  (e.g. splitting Science into Physical/Bio) use **stream groups**.
- **Mediums** — Sinhala/Tamil/English (or custom) languages of instruction.
  A class can optionally be pinned to a medium (`classes.medium_id`); a
  medium-pinned class is excluded from the promotion module's "distribute by
  marks / randomly" auto-fill pools so it's never partially refilled with
  students who don't belong to that medium, and its students carry straight
  over to the same-medium class in the next grade.

## Curriculum

- **Subjects** — the subject catalogue (name, code).
- **Curriculum levels & selection groups** — per-grade curriculum
  definitions; **subject buckets** group optional/elective subjects a
  student picks from (e.g. "choose 3 of these 6"), enforced at enrollment
  time via `student_subject_selections`.
- **Subject enrollment** — per-student, per-subject enrollment records
  (`student_subject_enrollments`), used to scope who's eligible for a given
  subject's marks, timetable periods, and subject-teacher notifications.

## People

- **Students** — profile, enrollment status (active/left), house, guardians
  (up to 2 per student, shared guardians supported for siblings), and an
  8-tab detail view: Profile, Guardians, Subject Enrollment, Progress
  Reports, Activities, Leadership & Awards, Disciplinary, and a read-only
  Records rollup (attendance history, exam results, prefect appointments).
- **Teachers** — profile (title, gender, NIC, employee number — auto-assigned
  from a shared sequence with non-academic staff), employment status
  (active/resigned/transferred), house, and position (§ Roles & positions).
- **Guardians directory** — a searchable, dedicated directory (not just
  inline on a student page) with notification history and portal-login
  status per guardian; delete is blocked while a guardian is still linked to
  any student, since unlinking silently from every child would be
  surprising.
- **Non-academic staff** — Lab Assistant, Librarian, Office Staff,
  Development Officer, IT Officer, Security, Minor Employee — profiles with
  no login/IDP account (no `user_id`), sharing the employee-number sequence
  with teachers.
- **Prefect board** — rank-based appointments (Head Prefect down to House
  Captain / Vice House Captain) per academic year, with a year selector that
  switches past years into a read-only archive view.
- **Societies** — clubs/societies (Science Society, Interact/Leo Club,
  Scouts, etc.), each with an admin-assigned Teacher-in-Charge and a
  five-role student roster (Leader, Deputy Leader, Secretary, Treasurer,
  Member) per academic year, with the same year-selector archive view as the
  prefect board. The Teacher-in-Charge manages their own society's roster
  from a "My Society" page in the teacher portal; admins can manage any
  society. Distinct from the free-text `student_activities` "society"
  category — memberships here are FK-linked to a real society record and
  surface in the student's Activities tab alongside it.
- **Positions** — the Principal/Vice Principal admin screen (§ Roles &
  positions).

## Attendance

- **Student attendance** — per-class daily sessions with per-student
  present/absent/late/excused records. Sessions lock 24 hours after
  creation; admins can override a lock, and any post-lock edit/delete is
  recorded in the audit log. A newly-marked `absent` record triggers an
  in-app notification to that student's guardians.
- **Staff attendance** — one record per staff member per day
  (present/late/absent/leave — a separate status set from student
  attendance), covering both teachers and non-academic staff, with a
  monthly summary view.

## Academic records

- **Terms** — the school's term/semester structure per academic year.
- **Term marks** — per-subject marks per student per term, with an aggregate
  ranking query used by promotion (§ below).
- **Student portfolio** — progress reports (term-scoped narrative),
  activities (clubs/sports/societies/competitions in one consolidated
  table), leadership roles, awards, and disciplinary records — each a
  simple CRUD tab on the student detail page.

## Promotion & class reassignment

A preview-then-commit flow, run once per source→target academic year pair:

1. **Preview** computes each actively-enrolled student's next grade (by
   grade sort order) and a non-binding same-name class-carryover suggestion
   (or same-*medium* suggestion for medium-pinned classes). Students at the
   top grade are flagged `graduating`, not silently dropped.
2. The admin reviews a per-grade table of proposed assignments, freely
   overriding any individual student's target class, or using one of two
   bulk-assist buttons per grade group: **Distribute by marks** (sorts by
   total term marks, deals students round-robin across target classes for
   an even high-to-low spread) or **Assign randomly** (same round-robin
   dealing over a shuffled order). Both keep every class within one student
   of equal size and leave every assignment individually overridable.
   Medium-pinned students are excluded from both auto-fill pools.
3. **Commit** bulk-writes the final per-student class assignments for the
   target year in one batched operation. Nothing is visible to the rest of
   the app until an admin separately flips the target year to "current."

## Timetable

A config → build → review → publish pipeline, one class at a time:

1. **Timetable Settings** — the school's default daily schedule template
   (start/end time, period count, period/interval duration) for the current
   academic year — used only to auto-generate a starting period grid.
2. **Grade Sections** — groups of grades that share a period grid and a
   Section Head reviewer (e.g. Primary, Junior Secondary, Senior Secondary,
   A/L). Each section's period grid can be regenerated from Timetable
   Settings and hand-edited afterward.
3. **Classrooms** — the bookable rooms/labs, used to prevent double-booking.
4. **Subject Period Requirements** — per-grade, how many periods/week each
   subject needs; validated against before a timetable can be submitted.
5. **Teacher availability** — per-teacher constraints the validator checks
   against.
6. **Timetables** — per class per academic year: create a draft (or copy an
   existing one as a starting template), edit it in a grid (assign
   subject/teacher/optionally a classroom per period cell), **Validate**
   (checks teacher/classroom clashes, teacher unavailability, mismatched
   subject-teacher assignments, unmet weekly requirements), **Submit for
   Review** (notifies the grade's Section Head/TIC), **Approve/Reject** (by
   the reviewer, with a comment on rejection), **Publish** (archives the
   previous published version, notifies every affected teacher/student/
   guardian), and **Revise** (clones a published timetable into a new
   chained draft without losing the published version's history).

Every status transition is recorded in `timetable_status_history` and fires
an in-app notification.

## Notifications

- **In-app only** — no email/SMS/WhatsApp channel.
- **Composer** — shared by admins (`/notifications`) and teachers
  (`/t/notifications`); what a sender is allowed to target is enforced
  server-side by role/position, not just hidden in the UI. Title, message,
  a category (General/Academic/Examination/Attendance/Timetable/Events/
  Sports/Meetings/Fee Reminder/Emergency/Discipline/Holidays), and a
  priority (Normal/Important/Urgent).
- **Recipient rules** (combinable) — Everyone (admin only), By Grade, By
  Class, By Grade Section, By Subject (teachers of it, or students taking
  it), or a specific Student/Guardian/Teacher.
- **Send now or save as draft** — drafts are editable and can be sent later
  by hand; there is no scheduled-send yet.
- **Notification Center** — every signed-in user (any role) has one, with
  Unread/Read/Archived tabs, text search, and a category filter.

## Reports & analytics

- **PDF report export** (admin-only) — two fixed templates, Attendance (by
  class + date range) and Marks (by class + term + subject), each with an
  optional column subset, rendered server-side and streamed as a PDF
  download.
- **Analytics dashboard** — one aggregate endpoint composing student counts
  (by grade/class/gender/house), a 14-day attendance trend, staff counts and
  this-month attendance, subject/examination/grade-wise performance,
  student/staff growth by year, notifications-sent count, and timetable
  completion percentage — rendered as stat tiles and lightweight bar/
  sparkline charts (no charting library dependency).

## Audit log

Every house reassignment, attendance-lock override, and other sensitive
change is recorded with actor, before/after state, and an optional reason,
readable admin-only at `/settings` → Audit Log.

## Automation

Scheduled, read-mostly background jobs (`internal/jobs/`) that support the
system's operation without any user-facing feature depending on them —
14 of the 15 can be toggled off independently from `/automation`
(admin-only, System nav) with no other effect; the one exception is
Backup + migration-drift (see below). None of them ever sit on a user
request's critical path: they run on their own cron schedule or via an
explicit admin-triggered "Run now", never as part of handling a page load
or API call. An in-process `github.com/robfig/cron/v3` scheduler, started
alongside the Gin server, runs each job on its own schedule with panic
recovery (`cron.Recover`) and a per-job overlap guard (a `sync.Mutex`,
`TryLock`ed in `Scheduler.execute` — the single chokepoint both the cron
tick and an admin's "Run now" funnel through) so a job can never run
concurrently with itself; a `job_settings` row (default enabled) gates
each one, and `job_runs` keeps the last 50 executions per job so the
Automation panel can show a real last-status/summary/finding-count instead
of a bare toggle.

**Disabling a job stops it from running; it does not clear what it already
found.** Its most recent `job_runs` row — and therefore both the
Automation panel's status and any page-specific `AgentFindingsBanner`
reading it — keeps showing that last finding, unchanged, until the job is
re-enabled and runs again (on its next schedule or via "Run now"). A
disabled job's banner is effectively frozen, not "no known issues" — there
is no separate "stale" indicator today.

15 jobs ship today. Nearly all are deliberately single-purpose — three of
the original eight were later split (see below) once it became clear a job
that bundles several unrelated checks into one summary can't be shown
correctly on a specific page, only in the general Automation panel. The one
exception is Backup + migration-drift, which still does two distinct
things (a `pg_dump` and a migration-version check) in one job — left
unsplit because it has no page binding to make single-purpose-ness matter
for (see below), and a backup failing shouldn't be distinguishable from a
drift-check failing when there's only ever one place either shows up.

- **Backup + migration-drift** — nightly `pg_dump` (credentials passed via
  a temp-file `PGPASSFILE`, never as a process argument, so they don't leak
  through `ps`/`/proc`) plus a check that the DB's applied `golang-migrate`
  version matches this binary's. No page binding (Automation panel only).
  The one job that **cannot be disabled** — enforced both server-side
  (`JobsHandler.SetEnabled` rejects it) and in the UI (its Automation-panel
  row shows "Always on" instead of a toggle) — since disabling it would
  silently stop the school's only backup with no symptom until an
  incident.
- **Current-academic-year invariant** — flags a current-academic-year count
  other than 1. Surfaced on Academic Years.
- **Student gender / school-type watcher** — active students whose gender
  doesn't match a single-sex school's type. Surfaced on Students.
- **Unclassed student watcher** — active students with no class in the
  current year. Surfaced on Students and Classes.
- **Empty grade watcher** — a grade with zero classes this year. Surfaced
  on Grades.
- **Empty stream watcher** — an A/L stream with zero classes this year.
  Surfaced on Streams.
- **Zero-guardian student watcher** — active students with no guardian on
  file (the absence-notification path silently no-ops for these). Surfaced
  on Students.
- **Employment-status consistency checker** — resigned/transferred teachers
  still assigned as a form teacher or subject teacher on a current-year
  class. Surfaced on Teachers and Classes.
- **Missing attendance session watcher** — classes with no attendance
  session taken today. Surfaced on Attendance.
- **Term-marks deadline watcher** — terms nearing their lock date with zero
  marks entered anywhere. Surfaced on Class Marks.
- **Stale/incomplete attendance session watcher** — sessions older than 24h
  with fewer records than the class roster. Surfaced on Attendance.
- **Teacher onboarding watcher** / **Student onboarding watcher** —
  role-scoped: accounts of that role stuck on first-login setup past 14
  days. Surfaced on Teachers / Students respectively — split by role so
  neither page's banner ever shows the other role's accounts.
- **Password reset token sweep** — deletes expired, unused
  password-reset tokens. Pure cleanup, no finding to show, no page binding.
- **Audit-log anomaly watcher** — any account with more than 50
  audit-logged changes in the last hour. Surfaced on Settings → Audit Log.

Every job that finds something notifies every admin account through the
normal notification pipeline (`NotificationService.SendDirect`), attributed
to the earliest-created admin account. Where a job's finding is relevant to
a specific admin page, a small dismissible `AgentFindingsBanner` component
(`frontend/src/components/common/AgentFindingsBanner.tsx`) shows it right
there — reading the same `/jobs` endpoint the Automation panel uses, so
this is presentation only, not a second backend surface. See
[`plan.md`](./plan.md#maintenanceops-agents) for the two items from the
original proposal that were deliberately not built this way (a promotion
pre-commit check that doesn't fit the scheduled-job shape, and a
vulnerability-scan triage job that would need toolchains not guaranteed to
exist on a deployed API host).

## Portals at a glance

There is one sign-in page; which portal a user lands on is decided entirely
by the `roles` claim on their token (never a separate URL per role):

| Role | Landing experience |
| --- | --- |
| **Admin** | Full dashboard: everything above |
| **Teacher** | Own dashboard (today's classes, recent sessions, quick actions, rank badge), classes, attendance marking, My Timetable, Review Timetables (if Section Head+), Notifications scoped to their own classes/grades/subjects |
| **Student** | Own profile, attendance history, term marks, timetable (once published), Notification Center |
| **Parent** | List of linked children; per child, attendance/marks/timetable; own Notification Center |

A parent or student can only ever see their own (or their own child's) data
— enforced server-side.

---

## Cross-cutting / non-functional

- **RBAC** — Gin route groups gated by `RequireRole`, checked against the
  JWT's `roles` claim; teacher-side actions are further scoped by the
  position/assignment checks described above rather than by role alone.
- **Rate limiting** — a per-client-IP token-bucket limiter applies API-wide
  (default 30 rps, burst 60, tunable via env), on top of a stricter limiter
  on the one-time admin-registration endpoint. Idle limiter entries are
  swept after 30 minutes so memory tracks active clients, not every IP ever
  seen.
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  and `Referrer-Policy: same-origin` are set on every response; no CSP,
  since this is a JSON-only API that never serves HTML.
- **CORS** — explicit allow-list via `CORS_ORIGINS`, credentials enabled.
- **Swagger/OpenAPI** — the full API surface is documented via `swaggo`
  annotations and served at `/swagger/index.html`, but only when
  `APP_ENV=development` — it's not exposed in a production deployment.
- **Migrations** — versioned, numbered SQL migrations (`golang-migrate`),
  applied automatically on backend startup; schema is the single source of
  truth for the generated `sqlc` query layer.
