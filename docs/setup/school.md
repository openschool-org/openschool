# School setup

Setting up a school in a running OpenSchool: the first admin, the school
wizard, then the day-to-day modules. To install and run the app first, see
the [server setup guide](./server.md).

## 1. Register the first admin (one time only)

On a brand-new instance there's no admin account yet, so the app sends you
straight to `/setup` instead of the normal sign-in page. Fill in:

- First name, last name
- Email
- Username (this is the login credential - separate from email)
- Phone (optional)
- Password (min. 10 characters)

This can only be done **once**. The endpoint behind it (`POST
/api/v1/setup/admin`) checks whether an admin already exists and refuses
outright if so - so once someone has registered, this page redirects
everyone else straight to sign-in instead. If you land on `/setup` and
already have credentials, use the "Sign in instead" link rather than
registering a second time.

After registering, sign in with the username/password you just set.

## 2. Set up the school (one time only)

Signing in as the first admin with no school yet configured drops you into
the **School Setup wizard** (`/school-setup`) automatically - you can't
reach the rest of the app until it's done. It walks through, in order:

1. **School details** - name (required), address/phone/email (optional), a
   logo (optional - uploaded as an image, stored inline, no external file
   storage needed), and the lowest/highest grade the school runs (1–13).
2. **Houses** - optional. Add house names; remainders (used to
   auto-assign students by index number) are assigned automatically in the
   order you add them.
3. **Grades** - every grade in the lowest–highest range from step 1 is
   pre-ticked. Uncheck any that don't apply.
4. **Classes** - creates the current academic year, then:
   - Regular grades get lettered sections (`10-A`, `10-B`, …) - set how many
     sections per grade.
   - Grade 12/13 (A/L) get **streams** instead: Physical Science, Bio
     Science, Commerce, Arts, Technology - each with an editable short code
     and section count, producing names like `12-M1`, `12-M2`, `13-C1`. This
     also creates the underlying `Science` stream and its `Physical
     Science`/`Bio Science` stream-groups if needed.
5. **Mediums** - optional. Sinhala/Tamil/English are pre-suggested; add
   custom ones freely.
6. **Done** - a summary of what got created, with direct links into
   Curriculum, Subjects, Students & Teachers, and Attendance as the natural
   next steps.

Every step but School, Grades and Classes can be skipped and configured
later from **Settings**, **Grades**, or the dedicated pages under the
sidebar's **Academics** group.

## 3. After setup: the natural next steps

Once the wizard is done you land on the Dashboard. From here, in roughly
the order a real school would need them:

1. **Streams & Section Heads** (`/streams`) - assign a teacher-in-charge
   (TIC) per grade, or per grade+stream for Grade 12/13. Also where you
   manage streams/stream-groups directly if you skipped or need to adjust
   what the wizard created.
2. **Teachers** (`/teachers`) - add teacher accounts. Each gets their own
   ThunderID sign-in automatically: the username is their email and the
   first password is their NIC number, changed on first sign-in.
3. **Subjects** (`/subjects`) and **Curriculum** (`/curriculum`) - build the
   subject catalogue, then define curriculum levels and selection groups
   that control which subjects students can choose.
4. **Students** (`/students`) - add students (their username and first
   password are the index number), then enrol them in classes from each
   class's page. After adding a student, their page lists the next steps.
5. **Leave limits** (Settings > Leave) - casual and medical days a year,
   short leaves a month and maternity days. Defaults follow the public
   service scheme (21, 20, 2, 84).
6. **Attendance** (`/attendance`) - once a class has students, a class
   teacher can create a session and start marking attendance from the
   class's own page.

## 4. Setting up the Timetable module

Once grades, classes, subjects and teachers exist, the Timetable module
(sidebar → **Scheduling**) follows a config → build → review → publish
pipeline, one class + academic year at a time:

1. **Timetable Settings** (`/timetable-settings`) - the school's default
   daily operating time for the current academic year: start/end time,
   number of periods, period duration, default interval duration. This is
   only a template used to auto-generate a starting period grid - it's
   never read directly when scheduling.
2. **Grade Sections** (`/grade-sections`) - group grades into sections that
   share an interval time (e.g. Primary, Junior Secondary, Senior
   Secondary, Advanced Level). Each section gets its own period grid
   (auto-generated from Timetable Settings, then hand-editable via the
   section's **Periods** button) and its own **Section Head** - a teacher
   authorized to review timetables for every grade in that section. A
   grade's per-grade teacher-in-charge (set on `/streams`, see step 1
   above) can *also* review timetables for that one grade - either is
   accepted, whichever was assigned.
3. **Classrooms** (`/classrooms`) - the rooms/labs available to book into a
   period, used to prevent double-booking a room across classes.
4. **Subject Period Requirements** (`/subject-requirements`) - pick a
   grade, then set how many periods/week each subject needs. The validator
   checks a class's timetable against these before it can be submitted.
5. **Timetables** (`/timetables`) - pick a class and click **New Draft**
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
   or **Reject**s it with a comment - a rejection sends it back to draft
   for the admin to fix and resubmit.
9. Once **Approved**, the admin **Publish**es it. This archives any
   previously published version for that class, makes the new one active,
   and notifies every teacher with a period in it, every student in the
   class, and their guardians.
10. To revise a published timetable, open it and use **Revise** - this
    clones it into a new draft version (chained back to the one it
    replaces) so you can edit and re-run the whole review cycle without
    losing the published version's history.

Every status change (submit / approve / reject / publish) fires an in-app
notification - visible via the bell icon in the header for whichever
teacher, student, or guardian it's aimed at. There's no email/SMS
delivery.

## 5. Sending notifications

Notifications are **in-app only** - there's no SMS, email, or WhatsApp
channel. Every notification is composed once and can target any
combination of audiences; the Notification Center then shows each
recipient their own copy.

1. Admins compose from **Notifications** in the sidebar (`/notifications`);
   teachers get the same composer in their own portal nav
   (`/t/notifications`) - one shared page, with what you're allowed to
   send scoped server-side by role (see below).
2. Fill in a **Title**, **Message**, a **Category** (General, Academic,
   Examination, Attendance, Timetable, Events, Sports, Meetings, Fee
   Reminder, Emergency, Discipline, Holidays), and a **Priority** (Normal /
   Important / Urgent).
3. Under **Send To**, add one or more recipient rules - they combine, so
   you can mix and match:
   - **Everyone** - every user in the system (admin only).
   - **By Grade** - every student, guardian, and teacher connected to that
     grade, for the current academic year.
   - **By Class** - students in that class, their guardians, and its
     assigned teacher(s).
   - **By Grade Section** - expands to every grade in that section (the
     same Grade Sections configured for the Timetable module above),
     resolved the same way as "By Grade".
   - **By Subject** - either the teachers who teach it, or the students
     taking it.
   - **Specific Student / Guardian / Teacher** - search and pick one
     individual; only they receive it.
4. **Send Now** delivers immediately. **Save as Draft** keeps it editable
   - drafts show up in the sidebar with **Send** and **Delete** actions,
   so you can prepare a notification and send it later by hand (there's
   no automatic "Schedule for Later" yet - see below).
5. Once sent, click an entry under **Recently Sent** to see its
   recipient / read / unread counts.

**Role scope:** a teacher can only target audiences they're actually
responsible for - their own classes (as form teacher or subject teacher),
any grade or grade section they're the TIC/section head of (the same
assignment used for timetable review approval), subjects they teach, and
the students/guardians that fall under those. "Everyone" and any
grade/class outside their own assignments are rejected server-side, not
just hidden in the composer UI. Admins can target anything.

**Notification Center:** every signed-in user (any role) has one,
reachable via the bell icon in the header or its "View all" link
(`/notification-center`) - Unread / Read / Archived tabs, a text search,
and a category filter.

Not supported yet: scheduled sending (only Send Now / Save as Draft) and
file attachments - both need their own infrastructure and were
deliberately left for a follow-up.

## 6. Registering parents, and accessing each portal

Admins, teachers, and students all get their ThunderID login automatically
at the moment their record is created (Setup wizard for the first admin,
**Teachers**/**Students** pages for everyone else). Parents work a little
differently, since a parent isn't a standalone record - they're a guardian
attached to one or more students.

**Self-activation (recommended for many students and parents):** instead of
creating logins one by one, turn on activation for students and/or parents
in **Settings > Account activation**, generate codes (per class or for
everyone without a login), and hand out the printed slips. Each person opens
`/activate`, enters their code, index or NIC number and email, confirms the
email and chooses a password. Parent activation needs a `parent` user type
and role in ThunderID (see [`THUNDERID.md`](../THUNDERID.md)). See
[ADR 0008](../adr/0008-self-service-account-activation.md).

**Registering a parent by hand:**

1. Sign in as admin → **Students** → open a student → **Guardians** tab.
2. **Add Guardian** - name, relationship, phone, and an email. The email is
   required later, so don't skip it even though the form allows it.
3. Once added, click **Set Up Login** on that guardian → choose a username
   and temporary password → **Create Login**. This is what actually
   provisions their ThunderID account (type `parent`, role `parent`) and
   links it back to the guardian record.
4. Hand the username/password to the parent directly, or use
   self-activation above instead.

A guardian can be added to more than one student (siblings share a
guardian) - add them from each sibling's **Guardians** tab rather than
recreating the guardian record; **Add Guardian** always creates a new
record, so use the same guardian's existing login for every child they're
attached to. A student can have up to 2 guardians on file.

**Signing in and accessing a portal:**

There's no separate URL per role - everyone signs in at the same page, and
which portal they land on is decided automatically from the `roles` claim
on their token:

| Role | How the account is created | What they see |
| --- | --- | --- |
| Admin | Setup wizard (first one only) | Full admin dashboard - everything in this guide, including sending notifications to anyone |
| Teacher | **Teachers** page | Their own dashboard (today's attendance, recent sessions, quick actions - role-badged by position, see [Roles & positions](../features/roles-and-accounts.md#roles--positions) in the feature guide), classes, attendance marking, plus **My Timetable**, **Review Timetables** if they're a section head or above, and **Notifications** scoped to their own classes/grades/subjects |
| Student | **Students** page, or self-activation with a code | Their own profile, attendance history, term marks, (once published) a **Timetable** tab on their dashboard, and their **Notification Center** |
| Parent | A student's **Guardians** tab, or self-activation with a code | An overview of their children with attendance and recent notices; click into one for that child's attendance, term marks, and (once published) a **Timetable** tab; plus their own **Notification Center** |

Every role also gets the header bell / Notification Center - see
[Sending notifications](#5-sending-notifications) above.

A parent or student can only ever see their own (or their own child's)
data - this is enforced server-side, not just hidden in the UI.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `/setup` says an admin already exists, but you don't remember creating one | Someone (possibly a built-in identity-provider console account) has already signed into the app and been auto-provisioned - every authenticated visit provisions a Postgres row via `GET /me`, not just explicit registration. Use "Sign in instead" rather than trying to re-register. |
| Stuck being redirected to `/school-setup` no matter what you do | No `school` row exists yet - this is correct behavior, not a bug. Finish the wizard's first step (it only needs a name) to clear the redirect. |
| Wizard's Classes step doesn't offer A/L streams | Grade 12 and/or 13 weren't ticked in the Grades step - streams only appear for whichever of those two were selected. |
| Timetable won't "Validate" clean / "Submit for Review" fails with "No section head assigned for this grade" | The class's grade has neither a per-grade TIC (`/streams`) nor a Grade Section group head (`/grade-sections`) assigned for the current academic year - assign one of the two, then retry. |
| Timetable editor shows "No grade section configured" / "No periods configured" | The class's grade hasn't been added to a Grade Section yet, or that section's period grid hasn't been generated - go to `/grade-sections`, add the grade, and click **Periods → Regenerate from Timetable Settings** (configure `/timetable-settings` first if that's also empty). |
| A teacher can't send a notification to a grade/class/subject they clearly teach | Their assignment isn't recorded where the notification permission check looks: form teacher / `class_subject_teachers` for a class, `teacher_subjects` for a subject, or TIC (`/streams`) / Grade Section head (`/grade-sections`) for a grade. Fix the underlying assignment rather than the notification itself - sending permission is always derived from it, never granted directly. |
| "Everyone" option is missing from a teacher's recipient picker | Expected - only admins can send school-wide notifications. |
| A sent notification's read/unread count looks frozen | Counts reflect `notification_recipients` at send time; a user added to a class/grade *after* a notification was sent does not retroactively become a recipient of it - only future notifications will include them. |

