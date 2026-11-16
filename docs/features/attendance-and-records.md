# Attendance and academic records

Part of the [feature guide](../FEATURES.md).

## Attendance

- **Student attendance** - per-class daily sessions with per-student
  present/absent/late/excused records. Sessions lock 24 hours after
  creation; admins can override a lock, and any post-lock edit/delete is
  recorded in the audit log. A newly-marked `absent` record triggers an
  in-app notification to that student's guardians. Absent, late and excused
  marks take an optional note. Clicking a selected status again, or Clear,
  removes the mark when saved. Session lists show present, absent and late
  counts.
- **Staff attendance** - one record per staff member per day
  (present/late/absent/leave - a separate status set from student
  attendance), covering both teachers and non-academic staff, with a
  monthly summary view. Marked by an admin only; a teacher sees their own
  record read-only from a dedicated **"My Attendance"** page in the teacher
  portal (`/me/teacher/attendance`, scoped to the caller's own profile -
  distinct from "Class Attendance", which is where a teacher marks *their
  students'* attendance).
- **Teacher leave** - a teacher applies from **"My Leave"** in the teacher
  portal for casual, medical, short, duty, maternity or no-pay leave,
  including a morning or afternoon half day or a short leave (up to 90
  minutes by default) for the day they are already at school. The form lists the
  timetabled periods they will miss and they name a relief teacher for
  each from the colleagues free in that period. The Principal or a Vice
  Principal approves or rejects it from **"Teacher Leave"** (admins from
  the same page in the admin portal), which also shows each teacher's
  balance for the year and the day's relief sheet. Approval marks the
  leave days on staff attendance and notifies the teacher and their
  relief teachers. Admins set the limits (casual and medical days a year,
  short leaves a month and their length, maternity days) under
  **Settings > Leave**. Rules and default limits are in
  [ADR 0010](../adr/0010-teacher-leave-rules.md).

## Academic records

- **Terms** - the school's term/semester structure per academic year, with
  one `is_current` term at a time (same single-current pattern as academic
  years).
- **Term marks** - per-subject marks per student per term, with an aggregate
  ranking query used by promotion (§ below). A student can be marked
  **absent ("AB")** for a subject/term instead of a numeric score
  (`is_absent`); absent entries are excluded from dashboard averages and
  the promotion ranking total so an absence never counts as a zero.
- **Teacher marks entry** (`/t/marks`) - a "My Subjects & Classes" overview
  grouped by subject, with each class shown as a card carrying a live
  marks-entered count (e.g. "18/30 entered") for the selected term.
  Clicking a card opens the entry grid with the current term pre-selected
  (`terms.is_current`, no manual pick needed for the common case). A term
  selector at the top doubles as the way to review or enter marks for a
  past term - the same overview and grid work for any term, not just the
  current one.
- **Student portfolio** - progress reports (term-scoped narrative),
  activities (clubs/sports/societies/competitions in one consolidated
  table), leadership roles, awards, and disciplinary records - each a
  simple CRUD tab on the student detail page.
