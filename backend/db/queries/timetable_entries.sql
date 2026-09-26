-- name: UpsertTimetableEntry :one
INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id, classroom_id)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (timetable_id, day_of_week, period_number) DO UPDATE
SET subject_id = EXCLUDED.subject_id,
    teacher_id = EXCLUDED.teacher_id,
    classroom_id = EXCLUDED.classroom_id,
    option_block_id = NULL,
    updated_at = NOW()
RETURNING *;

-- name: UpsertOptionBlockEntry :exec
-- a period where the class splits into an option block; replaces whatever was there
INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, option_block_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (timetable_id, day_of_week, period_number) DO UPDATE
SET subject_id = NULL,
    teacher_id = NULL,
    classroom_id = NULL,
    option_block_id = EXCLUDED.option_block_id,
    updated_at = NOW();

-- name: DeleteTimetableEntry :exec
DELETE FROM timetable_entries
WHERE timetable_id = $1 AND day_of_week = $2 AND period_number = $3;

-- name: ListTimetableEntriesByTimetable :many
SELECT
    te.*,
    s.name       AS subject_name,
    tp.full_name AS teacher_name,
    cr.name      AS classroom_name,
    ob.name      AS option_block_name
FROM timetable_entries te
LEFT JOIN subjects                s  ON s.id  = te.subject_id
LEFT JOIN teacher_profiles        tp ON tp.id = te.teacher_id
LEFT JOIN classrooms              cr ON cr.id = te.classroom_id
LEFT JOIN timetable_option_blocks ob ON ob.id = te.option_block_id
WHERE te.timetable_id = $1
ORDER BY te.day_of_week ASC, te.period_number ASC;

-- name: CopyTimetableEntries :exec
INSERT INTO timetable_entries (timetable_id, day_of_week, period_number, subject_id, teacher_id, classroom_id, option_block_id)
SELECT $2, src.day_of_week, src.period_number, src.subject_id, src.teacher_id, src.classroom_id, src.option_block_id
FROM timetable_entries src
WHERE src.timetable_id = $1;

-- name: ListEntriesForYearExcludingTimetable :many
-- every booked (teacher or classroom) cell across other timetables in the
-- same academic year, used for cross-timetable clash detection; an option
-- block period books each of the class's teachers for the block's subjects
SELECT te.day_of_week, te.period_number, te.teacher_id, te.classroom_id, t.id AS timetable_id, t.class_id, c.name AS class_name, te.option_block_id
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
WHERE t.academic_year_id = $1
  AND t.id != $2
  AND t.status IN ('draft', 'under_review', 'approved', 'published')
  AND (te.teacher_id IS NOT NULL OR te.classroom_id IS NOT NULL)
UNION ALL
SELECT te.day_of_week, te.period_number, cst.teacher_id, NULL::uuid, t.id, t.class_id, c.name, te.option_block_id
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
INNER JOIN class_subject_teachers cst ON cst.class_id = t.class_id AND cst.subject_id = bs.subject_id
WHERE t.academic_year_id = $1
  AND t.id != $2
  AND t.status IN ('draft', 'under_review', 'approved', 'published');

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
  AND (te.teacher_id IS NOT NULL OR te.classroom_id IS NOT NULL)
UNION ALL
SELECT te.day_of_week, te.period_number, cst.teacher_id, NULL::uuid, t.id, t.class_id, c.name
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
INNER JOIN class_subject_teachers cst ON cst.class_id = t.class_id AND cst.subject_id = bs.subject_id
WHERE t.academic_year_id = $1
  AND t.status IN ('draft', 'under_review', 'approved', 'published');

-- name: CountEntriesBySubjectForTimetable :many
-- a block period counts once for each of the block's subjects
SELECT x.subject_id, COUNT(*)::int AS entry_count
FROM (
    SELECT te.subject_id FROM timetable_entries te WHERE te.timetable_id = $1 AND te.subject_id IS NOT NULL
    UNION ALL
    SELECT bs.subject_id FROM timetable_entries te
    INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
    WHERE te.timetable_id = $1
) x
GROUP BY x.subject_id;

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
UNION ALL
-- option block periods where this teacher takes the class's students for one of the block's subjects
SELECT te.day_of_week, te.period_number, bs.subject_id, s.name, NULL::uuid, NULL::text, t.class_id, c.name, g.name
FROM timetable_entries te
INNER JOIN timetables t ON t.id = te.timetable_id
INNER JOIN classes c    ON c.id = t.class_id
INNER JOIN grades g     ON g.id = c.grade_id
INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
INNER JOIN class_subject_teachers cst ON cst.class_id = t.class_id AND cst.subject_id = bs.subject_id
INNER JOIN subjects s   ON s.id = bs.subject_id
WHERE cst.teacher_id = $1 AND t.academic_year_id = $2 AND t.status = 'published'
ORDER BY 1, 2;

-- name: IsTeacherAssignedToSubject :one
SELECT EXISTS (
    SELECT 1 FROM teacher_subjects WHERE teacher_id = $1 AND subject_id = $2
) AS assigned;
