-- name: UpsertGradeSectionHead :one
-- Teacher-in-charge for a whole grade (grades without A/L streams).
INSERT INTO section_heads (academic_year_id, grade_id, stream_id, teacher_id)
VALUES ($1, $2, NULL, $3)
ON CONFLICT (academic_year_id, grade_id) WHERE stream_id IS NULL
DO UPDATE SET teacher_id = EXCLUDED.teacher_id
RETURNING *;

-- name: UpsertStreamSectionHead :one
-- Teacher-in-charge for one A/L stream within a grade.
INSERT INTO section_heads (academic_year_id, grade_id, stream_id, teacher_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (academic_year_id, grade_id, stream_id) WHERE stream_id IS NOT NULL
DO UPDATE SET teacher_id = EXCLUDED.teacher_id
RETURNING *;

-- name: ListSectionHeadsByYear :many
SELECT
    sh.id,
    sh.academic_year_id,
    sh.grade_id,
    sh.stream_id,
    sh.teacher_id,
    sh.created_at,
    g.name        AS grade_name,
    s.name        AS stream_name,
    tp.full_name  AS teacher_name
FROM section_heads sh
INNER JOIN grades           g  ON g.id = sh.grade_id
LEFT JOIN  streams          s  ON s.id = sh.stream_id
INNER JOIN teacher_profiles tp ON tp.id = sh.teacher_id
WHERE sh.academic_year_id = $1
ORDER BY g.sort_order ASC, s.name ASC NULLS FIRST;

-- name: DeleteSectionHead :execrows
DELETE FROM section_heads WHERE id = $1;

-- name: GetGradeTICForGrade :one
-- the whole-grade TIC (stream_id IS NULL), if any, used for timetable review authorization
SELECT teacher_id FROM section_heads
WHERE academic_year_id = $1 AND grade_id = $2 AND stream_id IS NULL;

-- name: ListGradeIDsHeadedByTeacher :many
-- whole-grade TICs only (stream_id IS NULL) — used to resolve which grades'
-- timetables this teacher is authorized to review
SELECT grade_id FROM section_heads
WHERE teacher_id = $1 AND academic_year_id = $2 AND stream_id IS NULL;
