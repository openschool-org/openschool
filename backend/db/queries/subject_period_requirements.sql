-- name: UpsertSubjectPeriodRequirement :one
INSERT INTO subject_period_requirements (academic_year_id, grade_id, subject_id, periods_per_week)
VALUES ($1, $2, $3, $4)
ON CONFLICT (academic_year_id, grade_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week
RETURNING *;

-- name: ListSubjectPeriodRequirementsByGrade :many
SELECT
    spr.*,
    s.name AS subject_name,
    s.code AS subject_code
FROM subject_period_requirements spr
INNER JOIN subjects s ON s.id = spr.subject_id
WHERE spr.academic_year_id = $1 AND spr.grade_id = $2
ORDER BY s.name ASC;

-- name: DeleteSubjectPeriodRequirement :exec
DELETE FROM subject_period_requirements
WHERE id = $1;
