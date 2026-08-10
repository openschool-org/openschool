# Setting Up OpenSchool

This is the end-to-end guide for standing up a fresh OpenSchool instance:
starting the stack, registering the first admin, and setting up the school
itself. For identity-provider-specific configuration (ThunderID apps, roles,
user types, CORS), see [`THUNDERID.md`](./THUNDERID.md) — this guide assumes
that part is already done and picks up from "the app runs, but is empty."

## 1. Start the stack

You need four things running: Postgres, ThunderID, the backend, and the
frontend.

```bash
# Postgres
cd backend
docker compose up -d

# ThunderID (see THUNDERID.md for full first-time setup)
# ... already covered there

# Backend — runs migrations automatically on startup
cd backend
cp .env.example .env   # fill in DB + identity provider values
go run ./cmd/api/main.go

# Frontend
cd frontend
pnpm install
cp .env.example .env   # fill in VITE_THUNDERID_* values
pnpm dev
```

Open `http://localhost:5173`.

## 2. Register the first admin (one time only)

On a brand-new instance there's no admin account yet, so the app sends you
straight to `/setup` instead of the normal sign-in page. Fill in:

- First name, last name
- Email
- Username (this is the login credential — separate from email)
- Phone (optional)
- Password (min. 8 characters)

This can only be done **once**. The endpoint behind it (`POST
/api/v1/setup/admin`) checks whether an admin already exists and refuses
outright if so — so once someone has registered, this page redirects
everyone else straight to sign-in instead. If you land on `/setup` and
already have credentials, use the "Sign in instead" link rather than
registering a second time.

After registering, sign in with the username/password you just set.

## 3. Set up the school (one time only)

Signing in as the first admin with no school yet configured drops you into
the **School Setup wizard** (`/school-setup`) automatically — you can't
reach the rest of the app until it's done. It walks through, in order:

1. **School details** — name (required), address/phone/email (optional), a
   logo (optional — uploaded as an image, stored inline, no external file
   storage needed), and the lowest/highest grade the school runs (1–13).
2. **Houses** — optional. Add house names; remainders (used to
   auto-assign students by index number) are assigned automatically in the
   order you add them.
3. **Grades** — every grade in the lowest–highest range from step 1 is
   pre-ticked. Uncheck any that don't apply.
4. **Classes** — creates the current academic year, then:
   - Regular grades get lettered sections (`10-A`, `10-B`, …) — set how many
     sections per grade.
   - Grade 12/13 (A/L) get **streams** instead: Physical Science, Bio
     Science, Commerce, Arts, Technology — each with an editable short code
     and section count, producing names like `12-M1`, `12-M2`, `13-C1`. This
     also creates the underlying `Science` stream and its `Physical
     Science`/`Bio Science` stream-groups if needed.
5. **Mediums** — optional. Sinhala/Tamil/English are pre-suggested; add
   custom ones freely.
6. **Done** — a summary of what got created, with direct links into
   Curriculum, Subjects, Students & Teachers, and Attendance as the natural
   next steps.

Every step but School, Grades and Classes can be skipped and configured
later from **Settings**, **Grades**, or the dedicated pages under the
sidebar's **Academics** group.

## 4. After setup: the natural next steps

Once the wizard is done you land on the Dashboard. From here, in roughly
the order a real school would need them:

1. **Streams & Section Heads** (`/streams`) — assign a teacher-in-charge
   (TIC) per grade, or per grade+stream for Grade 12/13. Also where you
   manage streams/stream-groups directly if you skipped or need to adjust
   what the wizard created.
2. **Teachers** (`/teachers`) — add teacher accounts. Each gets their own
   ThunderID sign-in and profile automatically; you get a one-time
   temporary password to hand them.
3. **Subjects** (`/subjects`) and **Curriculum** (`/curriculum`) — build the
   subject catalogue, then define curriculum levels and selection groups
   that control which subjects students can choose.
4. **Students** (`/students`) — enrol students into classes, same
   auto-provisioned account pattern as teachers.
5. **Attendance** (`/attendance`) — once a class has students, a class
   teacher can create a session and start marking attendance from the
   class's own page.

## 5. Setting up the Timetable module

Once grades, classes, subjects and teachers exist, the Timetable module
(sidebar → **Scheduling**) follows a config → build → review → publish
pipeline, one class + academic year at a time:

1. **Timetable Settings** (`/timetable-settings`) — the school's default
   daily operating time for the current academic year: start/end time,
   number of periods, period duration, default interval duration. This is
   only a template used to auto-generate a starting period grid — it's
   never read directly when scheduling.
2. **Grade Sections** (`/grade-sections`) — group grades into sections that
   share an interval time (e.g. Primary, Junior Secondary, Senior
   Secondary, Advanced Level). Each section gets its own period grid
   (auto-generated from Timetable Settings, then hand-editable via the
   section's **Periods** button) and its own **Section Head** — a teacher
   authorized to review timetables for every grade in that section. A
   grade's per-grade teacher-in-charge (set on `/streams`, see step 1
   above) can *also* review timetables for that one grade — either is
   accepted, whichever was assigned.
3. **Classrooms** (`/classrooms`) — the rooms/labs available to book into a
   period, used to prevent double-booking a room across classes.
4. **Subject Period Requirements** (`/subject-requirements`) — pick a
   grade, then set how many periods/week each subject needs. The validator
   checks a class's timetable against these before it can be submitted.
5. **Timetables** (`/timetables`) — pick a class and click **New Draft**
   (or copy an existing timetable, e.g. last year's, as a starting
   template), then open it to reach the grid editor.
6. In the editor, click a period cell to assign a subject, teacher, and
   optionally a classroom. **Validate** checks for teacher/classroom
   clashes, teacher unavailability, mismatched subject-teacher
   assignments, and unmet weekly period requirements before you submit.
7. **Submit for Review** moves the draft to `under_review` and notifies
   the class's grade's Section Head (or TIC).
8. The Section Head reviews it from their own **Review Timetables** page
   in the teacher portal (`/t/timetable/review`) and either **Approve**s
   or **Reject**s it with a comment — a rejection sends it back to draft
   for the admin to fix and resubmit.
9. Once **Approved**, the admin **Publish**es it. This archives any
   previously published version for that class, makes the new one active,
   and notifies every teacher with a period in it, every student in the
   class, and their guardians.
10. To revise a published timetable, open it and use **Revise** — this
    clones it into a new draft version (chained back to the one it
    replaces) so you can edit and re-run the whole review cycle without
    losing the published version's history.

Every status change (submit / approve / reject / publish) fires an in-app
notification — visible via the bell icon in the header for whichever
teacher, student, or guardian it's aimed at. There's no email/SMS
delivery.

## 6. Sending notifications

Notifications are **in-app only** — there's no SMS, email, or WhatsApp
channel. Every notification is composed once and can target any
combination of audiences; the Notification Center then shows each
recipient their own copy.

1. Admins compose from **Notifications** in the sidebar (`/notifications`);
   teachers get the same composer in their own portal nav
   (`/t/notifications`) — one shared page, with what you're allowed to
   send scoped server-side by role (see below).
2. Fill in a **Title**, **Message**, a **Category** (General, Academic,
   Examination, Attendance, Timetable, Events, Sports, Meetings, Fee
   Reminder, Emergency, Discipline, Holidays), and a **Priority** (Normal /
   Important / Urgent).
3. Under **Send To**, add one or more recipient rules — they combine, so
   you can mix and match:
   - **Everyone** — every user in the system (admin only).
   - **By Grade** — every student, guardian, and teacher connected to that
     grade, for the current academic year.
   - **By Class** — students in that class, their guardians, and its
     assigned teacher(s).
   - **By Grade Section** — expands to every grade in that section (the
     same Grade Sections configured for the Timetable module above),
     resolved the same way as "By Grade".
   - **By Subject** — either the teachers who teach it, or the students
     taking it.
   - **Specific Student / Guardian / Teacher** — search and pick one
     individual; only they receive it.
4. **Send Now** delivers immediately. **Save as Draft** keeps it editable
   — drafts show up in the sidebar with **Send** and **Delete** actions,
   so you can prepare a notification and send it later by hand (there's
   no automatic "Schedule for Later" yet — see below).
5. Once sent, click an entry under **Recently Sent** to see its
   recipient / read / unread counts.

**Role scope:** a teacher can only target audiences they're actually
responsible for — their own classes (as form teacher or subject teacher),
any grade or grade section they're the TIC/section head of (the same
assignment used for timetable review approval), subjects they teach, and
the students/guardians that fall under those. "Everyone" and any
grade/class outside their own assignments are rejected server-side, not
just hidden in the composer UI. Admins can target anything.

**Notification Center:** every signed-in user (any role) has one,
reachable via the bell icon in the header or its "View all" link
(`/notification-center`) — Unread / Read / Archived tabs, a text search,
and a category filter.

Not supported yet: scheduled sending (only Send Now / Save as Draft) and
file attachments — both need their own infrastructure and were
deliberately left for a follow-up.

## 7. Registering parents, and accessing each portal

Admins, teachers, and students all get their ThunderID login automatically
at the moment their record is created (Setup wizard for the first admin,
**Teachers**/**Students** pages for everyone else). Parents work a little
differently, since a parent isn't a standalone record — they're a guardian
attached to one or more students.

**Registering a parent:**

1. Sign in as admin → **Students** → open a student → **Guardians** tab.
2. **Add Guardian** — name, relationship, phone, and an email. The email is
   required later, so don't skip it even though the form allows it.
3. Once added, click **Set Up Login** on that guardian → choose a username
   and temporary password → **Create Login**. This is what actually
   provisions their ThunderID account (type `parent`, role `parent`) and
   links it back to the guardian record.
4. Hand the username/password to the parent directly — there's no
   self-registration or invite email.

A guardian can be added to more than one student (siblings share a
guardian) — add them from each sibling's **Guardians** tab rather than
recreating the guardian record; **Add Guardian** always creates a new
record, so use the same guardian's existing login for every child they're
attached to. A student can have up to 2 guardians on file.

**Signing in and accessing a portal:**

There's no separate URL per role — everyone signs in at the same page, and
which portal they land on is decided automatically from the `roles` claim
on their token:

| Role | How the account is created | What they see |
| --- | --- | --- |
| Admin | Setup wizard (first one only) | Full admin dashboard — everything in this guide, including sending notifications to anyone |
| Teacher | **Teachers** page | Their own dashboard (today's classes, recent sessions, quick actions — role-badged by position, see [Roles & positions](./FEATURES.md#roles--positions) in the feature guide), classes, attendance marking, plus **My Timetable**, **Review Timetables** if they're a section head or above, and **Notifications** scoped to their own classes/grades/subjects |
| Student | **Students** page | Their own profile, attendance history, term marks, (once published) a **Timetable** tab on their dashboard, and their **Notification Center** |
| Parent | A student's **Guardians** tab, per above | A list of their linked children; click into one for that child's attendance, term marks, and (once published) a **Timetable** tab; plus their own **Notification Center** |

Every role also gets the header bell / Notification Center — see
[Sending notifications](#6-sending-notifications) above.

A parent or student can only ever see their own (or their own child's)
data — this is enforced server-side, not just hidden in the UI.

## Starting over

Everything above is idempotent in the sense that you can wipe app data and
redo it, but the two pieces live in different systems:

- **App data** (school, grades, classes, students, teachers, attendance,
  …) lives in Postgres. To reset it:
  ```sql
  TRUNCATE TABLE
    academic_years, attendance_records, attendance_sessions, audit_logs,
    class_students, class_subject_teachers, classes, classrooms,
    grade_section_grades, grade_sections, grades, grade_subjects,
    group_subjects, guardians, houses, levels, mediums, non_academic_staff,
    notification_recipients, notifications, password_reset_tokens, prefects,
    school, section_heads, selection_groups, staff_attendance_records,
    stream_groups, streams, student_activities, student_awards,
    student_disciplinary_records, student_enrollment_locks,
    student_guardians, student_leadership_roles, student_profiles,
    student_progress_reports, student_siblings, student_subject_enrollments,
    student_subject_selections, subject_bucket_options, subject_buckets,
    subject_period_requirements, subjects, teacher_availability,
    teacher_positions, teacher_profiles, teacher_subjects, term_marks,
    terms, timetable_entries, timetable_notifications, timetable_periods,
    timetable_settings, timetable_status_history, timetables, users,
    vice_principal_grade_scopes
  RESTART IDENTITY CASCADE;
  ```
  This does **not** delete the corresponding identities (student/teacher/
  admin accounts) on ThunderID — those are a separate system and need to be
  removed there too if you want a truly clean slate.
- **Identities and roles** (ThunderID users, apps, roles, user types) are
  untouched by the above — see `THUNDERID.md` for managing those directly.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `/setup` says an admin already exists, but you don't remember creating one | Someone (possibly a built-in identity-provider console account) has already signed into the app and been auto-provisioned — every authenticated visit provisions a Postgres row via `GET /me`, not just explicit registration. Use "Sign in instead" rather than trying to re-register. |
| Stuck being redirected to `/school-setup` no matter what you do | No `school` row exists yet — this is correct behavior, not a bug. Finish the wizard's first step (it only needs a name) to clear the redirect. |
| `schema_validation_failed` (`USR-1019`) creating a student/teacher | An identity-provider-side user-type schema field doesn't match what the backend sends — see the equivalent entry in `THUNDERID.md`'s troubleshooting table. |
| Wizard's Classes step doesn't offer A/L streams | Grade 12 and/or 13 weren't ticked in the Grades step — streams only appear for whichever of those two were selected. |
| Timetable won't "Validate" clean / "Submit for Review" fails with "No section head assigned for this grade" | The class's grade has neither a per-grade TIC (`/streams`) nor a Grade Section group head (`/grade-sections`) assigned for the current academic year — assign one of the two, then retry. |
| Timetable editor shows "No grade section configured" / "No periods configured" | The class's grade hasn't been added to a Grade Section yet, or that section's period grid hasn't been generated — go to `/grade-sections`, add the grade, and click **Periods → Regenerate from Timetable Settings** (configure `/timetable-settings` first if that's also empty). |
| A teacher can't send a notification to a grade/class/subject they clearly teach | Their assignment isn't recorded where the notification permission check looks: form teacher / `class_subject_teachers` for a class, `teacher_subjects` for a subject, or TIC (`/streams`) / Grade Section head (`/grade-sections`) for a grade. Fix the underlying assignment rather than the notification itself — sending permission is always derived from it, never granted directly. |
| "Everyone" option is missing from a teacher's recipient picker | Expected — only admins can send school-wide notifications. |
| A sent notification's read/unread count looks frozen | Counts reflect `notification_recipients` at send time; a user added to a class/grade *after* a notification was sent does not retroactively become a recipient of it — only future notifications will include them. |
