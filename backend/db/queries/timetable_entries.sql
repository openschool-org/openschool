-- name: UpsertTimetableEntry :one
INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id, classroom_id)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (timetable_id, day_of_week, period_number) DO UPDATE
SET subject_id = EXCLUDED.subject_id,
    teacher_id = EXCLUDED.teacher_id,
    classroom_id = EXCLUDED.classroom_id,
    updated_at = NOW()
RETURNING *;

-- name: DeleteTimetableEntry :exec
DELETE FROM timetable_entries
WHERE timetable_id = $1 AND day_of_week = $2 AND period_number = $3;

-- name: ListTimetableEntriesByTimetable :many
SELECT
    te.*,
    s.name       AS subject_name,
    tp.full_name AS teacher_name,
    cr.name      AS classroom_name
FROM timetable_entries te
LEFT JOIN subjects         s  ON s.id  = te.subject_id
LEFT JOIN teacher_profiles tp ON tp.id = te.teacher_id
LEFT JOIN classrooms       cr ON cr.id = te.classroom_id
WHERE te.timetable_id = $1
ORDER BY te.day_of_week ASC, te.period_number ASC;

-- name: CopyTimetableEntries :exec
INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id, classroom_id)
SELECT $2, src.day_of_week, src.period_number, src.subject_id, src.teacher_id, src.classroom_id
FROM timetable_entries src
WHERE src.timetable_id = $1;

-- name: ListEntriesForYearExcludingTimetable :many
-- every booked (teacher or classroom) cell across other timetables in the
-- same academic year, used for cross-timetable clash detection
SELECT te.day_of_week, te.period_number, te.teacher_id, te.classroom_id, t.id AS timetable_id, t.class_id, c.name AS class_name
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
WHERE t.academic_year_id = $1
  AND t.id != $2
  AND t.status IN ('draft', 'under_review', 'approved', 'published')
  AND (te.teacher_id IS NOT NULL OR te.classroom_id IS NOT NULL);

-- name: ListAllTimetableEntriesForYear :many
-- every booked (teacher or classroom) cell across every timetable in the
-- academic year — the auto-generator's whole-year busy-set preload, before
-- any of this run's placements exist yet
SELECT te.day_of_week, te.period_number, te.teacher_id, te.classroom_id, t.id AS timetable_id, t.class_id, c.name AS class_name
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
WHERE t.academic_year_id = $1
  AND t.status IN ('draft', 'under_review', 'approved', 'published')
  AND (te.teacher_id IS NOT NULL OR te.classroom_id IS NOT NULL);

-- name: CountEntriesBySubjectForTimetable :many
SELECT subject_id, COUNT(*)::int AS entry_count
FROM timetable_entries
WHERE timetable_id = $1 AND subject_id IS NOT NULL
GROUP BY subject_id;

-- name: ListTeacherScheduleForYear :many
-- a teacher's full weekly schedule across every published timetable, for
-- the teacher's own "My Timetable" view
SELECT
    te.day_of_week, te.period_number,
    te.subject_id, s.name AS subject_name,
    te.classroom_id, cr.name AS classroom_name,
    t.class_id, c.name AS class_name, g.name AS grade_name
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
INNER JOIN grades g     ON g.id = c.grade_id
LEFT JOIN subjects s    ON s.id = te.subject_id
LEFT JOIN classrooms cr ON cr.id = te.classroom_id
WHERE te.teacher_id = $1 AND t.academic_year_id = $2 AND t.status = 'published'
ORDER BY te.day_of_week ASC, te.period_number ASC;

-- name: IsTeacherAssignedToSubject :one
SELECT EXISTS (
    SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2
) AS assigned;
