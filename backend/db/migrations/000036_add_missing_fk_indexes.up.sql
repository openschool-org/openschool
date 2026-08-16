-- Foreign-key columns that predate this repo's later convention of adding
-- an index alongside every FK — found by scanning every migration's
-- REFERENCES columns against its CREATE INDEX statements. None of these
-- cause incorrect behavior (Postgres enforces FKs without an index), but
-- an unindexed FK means every join/delete/cascade through it is a full
-- table scan — increasingly costly as these tables grow past dev-seed
-- scale. Grouped in one migration since none need data backfill, just
-- new indexes.

CREATE INDEX idx_student_siblings_student_id_2 ON student_siblings (student_id_2);

CREATE INDEX idx_classes_stream_group_id  ON classes (stream_group_id);
CREATE INDEX idx_classes_girl_monitor_id  ON classes (girl_monitor_id);
CREATE INDEX idx_classes_boy_monitor_id   ON classes (boy_monitor_id);

-- class_students already has a UNIQUE(student_id, academic_year_id) index,
-- but that's leading-column student_id — a query filtering by
-- academic_year_id alone (e.g. "every class_students row for the current
-- year") can't use it.
CREATE INDEX idx_class_students_academic_year_id ON class_students (academic_year_id);

CREATE INDEX idx_student_subject_enrollments_medium_id ON student_subject_enrollments (medium_id);

CREATE INDEX idx_subject_period_requirements_subject_id ON subject_period_requirements (subject_id);

CREATE INDEX idx_timetable_entries_subject_id ON timetable_entries (subject_id);

CREATE INDEX idx_timetables_parent_timetable_id ON timetables (parent_timetable_id);
CREATE INDEX idx_timetables_created_by          ON timetables (created_by);
CREATE INDEX idx_timetables_submitted_by        ON timetables (submitted_by);
CREATE INDEX idx_timetables_reviewed_by         ON timetables (reviewed_by);
CREATE INDEX idx_timetables_published_by        ON timetables (published_by);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);

CREATE INDEX idx_staff_attendance_records_marked_by ON staff_attendance_records (marked_by);

CREATE INDEX idx_student_progress_reports_written_by ON student_progress_reports (written_by);

CREATE INDEX idx_student_disciplinary_records_recorded_by ON student_disciplinary_records (recorded_by);
