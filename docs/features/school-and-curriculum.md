# School structure and curriculum

Part of the [feature guide](../FEATURES.md).

## School setup & academic structure

- **First-run School Setup wizard** (`/school-setup`) - a guided,
  resumable, idempotent flow: School details → Houses → Grades → Classes →
  Mediums → Done. Blocks access to the rest of the app until the school
  record and grade range exist. See the [school setup guide](../setup/school.md#2-set-up-the-school-one-time-only) for the full walkthrough.
- **School profile** - name, address, phone, email, an inline-stored logo,
  the grade range the school runs (1–13), and a school type (boys / girls /
  mixed), editable afterward from Settings. A single-sex school type is
  enforced against `student_profiles.gender` at student create/update time -
  gender stays optional under `mixed`, but must be set and match under
  `boys`/`girls`.
- **Academic years** - create/list years, and flip exactly one to "current"
  (`SetCurrentAcademicYear`), which is what almost every other module reads
  as its implicit scope. The database allows only one current year and one
  current term; creating a year as current switches the old one off.
- **Houses** - named groups (with an editable color) that students and staff
  are auto-assigned into using a least-populated-house-with-random-tiebreak
  balancing query, so houses self-balance without admin-maintained
  configuration. Manual reassignment is available and audit-logged.
- **Grades, classes, streams** - grades are the 1–13 school-year structure;
  regular grades get lettered class sections (10-A, 10-B, …); Grade 12/13
  (Advanced Level) instead offer **streams** (Physical Science, Bio Science,
  Commerce, Arts, Technology) with editable short codes and their own
  section counts (12-M1, 12-M2, 13-C1, …). Streams that need finer grouping
  (e.g. splitting Science into Physical/Bio) use **stream groups**.
- **Mediums** - Sinhala/Tamil/English (or custom) languages of instruction.
  A class can optionally be pinned to a medium (`classes.medium_id`); a
  medium-pinned class is excluded from the promotion module's "distribute by
  marks / randomly" auto-fill pools so it's never partially refilled with
  students who don't belong to that medium, and its students carry straight
  over to the same-medium class in the next grade.

## Curriculum

- **Subjects** - the subject catalogue (name, code).
- **Curriculum levels & selection groups** - per-grade curriculum
  definitions; **subject buckets** group optional/elective subjects a
  student picks from (e.g. "choose 3 of these 6"), enforced at enrollment
  time via `student_subject_selections`.
- **Subject enrollment** - per-student, per-subject enrollment records
  (`student_subject_enrollments`), used to scope who's eligible for a given
  subject's marks, timetable periods, and subject-teacher notifications.
