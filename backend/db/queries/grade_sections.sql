-- name: CreateGradeSection :one
INSERT INTO grade_sections (
    academic_year_id, name, interval_start_time, interval_end_time, section_head_teacher_id, sort_order
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetGradeSectionByID :one
SELECT * FROM grade_sections
WHERE id = $1;

-- name: ListGradeSectionsByYear :many
SELECT
    gs.*,
    tp.full_name AS section_head_name
FROM grade_sections gs
LEFT JOIN teacher_profiles tp ON tp.id = gs.section_head_teacher_id
WHERE gs.academic_year_id = $1
ORDER BY gs.sort_order ASC, gs.name ASC;

-- name: UpdateGradeSection :one
UPDATE grade_sections
SET
    name                    = $2,
    interval_start_time     = $3,
    interval_end_time       = $4,
    section_head_teacher_id = $5,
    sort_order               = $6
WHERE id = $1
RETURNING *;

-- name: DeleteGradeSection :execrows
DELETE FROM grade_sections AS gs
WHERE gs.id = $1
AND gs.id NOT IN (
    SELECT DISTINCT grade_section_id FROM grade_section_grades
);

-- name: AssignGradeToSection :exec
INSERT INTO grade_section_grades (grade_section_id, grade_id, academic_year_id)
VALUES ($1, $2, $3)
ON CONFLICT (academic_year_id, grade_id) DO UPDATE
SET grade_section_id = EXCLUDED.grade_section_id;

-- name: RemoveGradeFromSection :exec
DELETE FROM grade_section_grades
WHERE grade_section_id = $1 AND grade_id = $2;

-- name: ListGradesBySection :many
SELECT g.*
FROM grades g
INNER JOIN grade_section_grades gsg ON gsg.grade_id = g.id
WHERE gsg.grade_section_id = $1
ORDER BY g.sort_order ASC;

-- name: ListGradeIDsForSectionHeadTeacher :many
-- grades in sections this teacher is the group-level head of, for a given year
SELECT gsg.grade_id
FROM grade_sections gs
INNER JOIN grade_section_grades gsg ON gsg.grade_section_id = gs.id
WHERE gs.section_head_teacher_id = $1 AND gs.academic_year_id = $2;

-- name: GetGradeSectionForGrade :one
-- resolves which grade_section a grade belongs to for a given academic year,
-- used to find the section-level head and the period grid to use
SELECT gs.*
FROM grade_sections gs
INNER JOIN grade_section_grades gsg ON gsg.grade_section_id = gs.id
WHERE gsg.academic_year_id = $1 AND gsg.grade_id = $2;
