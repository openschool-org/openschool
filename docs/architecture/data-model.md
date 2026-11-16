# Data model

Part of the [architecture overview](../ARCHITECTURE.md).

Schema is defined across 56 versioned migrations
(`backend/db/migrations/`). Grouped by area:

| Area | Tables |
| --- | --- |
| Identity & accounts | `users`, `password_reset_tokens`, `activation_settings`, `activation_codes`, `activation_email_tokens` |
| School & academic structure | `school`, `academic_years`, `houses`, `grades`, `classes`, `streams`, `stream_groups`, `mediums` |
| Curriculum | `subjects`, `mediums`, `levels`, `selection_groups`, `group_subjects` |
| People | `student_profiles`, `student_siblings`, `student_guardians`, `guardians`, `teacher_profiles`, `teacher_subjects`, `non_academic_staff`, `prefects`, `section_heads`, `teacher_positions`, `vice_principal_grade_scopes` |
| Enrollment | `class_students`, `class_subject_teachers`, `student_subject_enrollments`, `student_subject_selections`, `student_enrollment_locks` |
| Attendance | `attendance_sessions`, `attendance_records`, `staff_attendance_records` |
| Leave | `teacher_leave_requests`, `teacher_leave_relief`, `leave_settings` |
| Academic records | `terms`, `term_marks`, `student_progress_reports`, `student_activities`, `student_leadership_roles`, `student_awards`, `student_disciplinary_records` |
| Extracurricular | `societies`, `society_members` |
| Timetable | `timetable_settings`, `grade_sections`, `grade_section_grades`, `classrooms`, `subject_period_requirements`, `teacher_availability`, `timetables`, `timetable_periods`, `timetable_entries`, `timetable_status_history`, `timetable_notifications` |
| Notifications | `notifications`, `notification_recipients` |
| Automation | `job_settings`, `job_runs`, `pending_identity_erasures` |
| Audit | `audit_logs` |

## Key relationships

- **`users`** anchors every login-capable account, 1:1 with
  `teacher_profiles` / `student_profiles` / a login-enabled `guardians`
  row.
- **`academic_years`** is the temporal scope almost everything else reads
  through its `is_current` flag - see
  [`adr/0003-single-current-academic-year.md`](../adr/0003-single-current-academic-year.md).
- **`classes`** belongs to a `grade` + `academic_year`, optionally a
  `stream`/`stream_group` (Advanced Level) and a `medium`; `class_students`
  is the per-year many-to-many enrollment junction;
  `class_subject_teachers` is the per-class, per-subject teacher
  assignment - the authoritative source timetable auto-generation and
  marks-entry authorization both read; assigning a row requires the
  teacher already hold that subject in `teacher_subjects` (the global
  qualification list, managed from the Teacher Subjects admin page).
- **`student_guardians`** is the many-to-many junction supporting shared
  guardians across siblings.
- **`teacher_positions`** + `vice_principal_grade_scopes` implement the
  Principal/Vice Principal layer; see
  [`adr/0002-in-app-position-layer.md`](../adr/0002-in-app-position-layer.md).
- **`timetables`** owns `timetable_entries` (per-period assignments) and
  `timetable_status_history` (the transition audit trail);
  `timetable_periods` belongs to a `grade_section`, not an individual
  timetable, since a period grid is shared by every class in that section.
- **`audit_logs`** is a generic, entity-agnostic append-only log
  (`entity_type` + `entity_id` + `action` + before/after JSON), not a
  per-table audit trail.

For exact columns, types, and constraints,
`backend/db/sqlc/models.go` (generated from the migrations) is the
authoritative reference - this table is a navigational summary, not a
schema dump.
