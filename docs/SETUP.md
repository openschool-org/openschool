# Setting Up OpenSchool

This is the end-to-end guide for standing up a fresh OpenSchool instance:
starting the stack, registering the first admin, and setting up the school
itself. For identity-provider-specific configuration (ThunderID apps, roles,
user types, CORS), see [`THUNDERID.md`](./THUNDERID.md) — this guide assumes
that part is already done and picks up from "the app runs, but is empty."

## 1. Start the stack

You need four things running: Postgres, the identity provider (ThunderID or
Asgardeo), the backend, and the frontend.

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

## 5. Registering parents, and accessing each portal

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
| Admin | Setup wizard (first one only) | Full admin dashboard — everything in this guide |
| Teacher | **Teachers** page | Their own dashboard, classes, attendance marking *(currently placeholder data — not wired to real records yet)* |
| Student | **Students** page | Their own profile, attendance history, and term marks |
| Parent | A student's **Guardians** tab, per above | A list of their linked children; click into one for that child's attendance and term marks |

A parent or student can only ever see their own (or their own child's)
data — this is enforced server-side, not just hidden in the UI.

## Starting over

Everything above is idempotent in the sense that you can wipe app data and
redo it, but the two pieces live in different systems:

- **App data** (school, grades, classes, students, teachers, attendance,
  …) lives in Postgres. To reset it:
  ```sql
  TRUNCATE TABLE
    academic_years, attendance_records, attendance_sessions, class_students,
    class_subject_teachers, classes, grades, group_subjects, guardians, houses,
    levels, mediums, prefects, school, section_heads, selection_groups,
    stream_groups, streams, student_guardians, student_profiles,
    student_siblings, student_subject_enrollments, subjects,
    teacher_profiles, teacher_subjects, term_marks, terms, users
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
