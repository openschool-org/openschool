-- name: UpsertPrincipal :one
-- Swaps who the Principal is (at most one row can ever exist — permanent
-- until resignation/promotion, not renewed per year).
INSERT INTO teacher_positions (teacher_id, position)
VALUES ($1, 'principal')
ON CONFLICT (position) WHERE position = 'principal'
DO UPDATE SET teacher_id = EXCLUDED.teacher_id
RETURNING *;

-- name: UpsertVicePrincipal :one
INSERT INTO teacher_positions (teacher_id, position, notify_whole_school, scope_note)
VALUES ($1, 'vice_principal', $2, $3)
ON CONFLICT (teacher_id, position)
DO UPDATE SET notify_whole_school = EXCLUDED.notify_whole_school, scope_note = EXCLUDED.scope_note
RETURNING *;

-- name: ListTeacherPositions :many
SELECT
    tp.id,
    tp.teacher_id,
    tp.position,
    tp.notify_whole_school,
    tp.scope_note,
    tp.created_at,
    t.full_name AS teacher_name
FROM teacher_positions tp
INNER JOIN teacher_profiles t ON t.id = tp.teacher_id
ORDER BY
    CASE tp.position
        WHEN 'principal' THEN 1
        WHEN 'vice_principal' THEN 2
    END,
    t.full_name ASC;

-- name: GetTeacherPosition :one
-- the position row a teacher holds, if any — a teacher can hold at most one
-- of principal/vice_principal (enforced by idx_teacher_positions_teacher_position_unique
-- covering both position values, since RankForTeacher only needs to know
-- whichever one exists).
SELECT * FROM teacher_positions WHERE teacher_id = $1 LIMIT 1;

-- name: ListVicePrincipalScopeGrades :many
SELECT g.id, g.name
FROM vice_principal_grade_scopes s
INNER JOIN grades g ON g.id = s.grade_id
WHERE s.position_id = $1
ORDER BY g.sort_order ASC;

-- name: DeleteVicePrincipalScopes :exec
DELETE FROM vice_principal_grade_scopes WHERE position_id = $1;

-- name: InsertVicePrincipalScope :exec
INSERT INTO vice_principal_grade_scopes (position_id, grade_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DeleteTeacherPosition :execrows
DELETE FROM teacher_positions WHERE id = $1;

-- name: DeleteTeacherPositionByTeacherAndType :exec
-- used when promoting a Vice Principal to Principal, to clear the old row.
DELETE FROM teacher_positions WHERE teacher_id = $1 AND position = $2;

-- name: IsPrincipal :one
SELECT EXISTS (
    SELECT 1 FROM teacher_positions WHERE teacher_id = $1 AND position = 'principal'
) AS is_principal;

-- name: IsVicePrincipalAuthorizedForGrade :one
-- true if the teacher is a Vice Principal with either notify_whole_school =
-- TRUE or the given grade in their scope.
SELECT EXISTS (
    SELECT 1 FROM teacher_positions tp
    WHERE tp.teacher_id = $1 AND tp.position = 'vice_principal'
      AND (
          tp.notify_whole_school = TRUE
          OR EXISTS (
              SELECT 1 FROM vice_principal_grade_scopes s
              WHERE s.position_id = tp.id AND s.grade_id = $2
          )
      )
) AS authorized;

-- name: IsFormTeacherOfAnyClass :one
-- used by PositionService.RankForTeacher to detect "Class Teacher" rank,
-- since that's classes.form_teacher_id rather than a teacher_positions row.
-- Section Head/Class Teacher/Subject Teacher stay year-scoped (they're
-- per-class/per-grade assignments that legitimately change each year),
-- unlike Principal/Vice Principal above.
SELECT EXISTS (
    SELECT 1 FROM classes WHERE form_teacher_id = $1 AND academic_year_id = $2
) AS is_form_teacher;

-- name: IsSubjectTeacherOfAnyClass :one
-- used by PositionService.RankForTeacher to detect "Subject Teacher" rank.
SELECT EXISTS (
    SELECT 1 FROM class_subject_teachers cst
    INNER JOIN classes c ON c.id = cst.class_id
    WHERE cst.teacher_id = $1 AND c.academic_year_id = $2
) AS is_subject_teacher;
