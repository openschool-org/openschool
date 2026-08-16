-- name: CreateSociety :one
INSERT INTO societies (name, teacher_in_charge_id, academic_year_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: UpdateSociety :one
UPDATE societies
SET name = $2, teacher_in_charge_id = $3
WHERE id = $1
RETURNING *;

-- name: DeleteSociety :execrows
DELETE FROM societies WHERE id = $1;

-- name: GetSocietyByID :one
SELECT * FROM societies WHERE id = $1;

-- name: GetSocietyForTeacher :one
-- resolves the "My Society" page: the society a teacher is TIC of, for a
-- given academic year.
SELECT * FROM societies
WHERE teacher_in_charge_id = $1 AND academic_year_id = $2;

-- name: ListSocietiesByYear :many
SELECT
    s.id,
    s.name,
    s.teacher_in_charge_id,
    s.academic_year_id,
    s.created_at,
    tp.full_name AS teacher_name,
    (SELECT COUNT(*) FROM society_members sm WHERE sm.society_id = s.id) AS member_count
FROM societies s
INNER JOIN teacher_profiles tp ON tp.id = s.teacher_in_charge_id
WHERE s.academic_year_id = $1
ORDER BY s.name ASC;

-- name: UpsertSocietyMember :one
INSERT INTO society_members (society_id, student_id, role, academic_year_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (society_id, student_id, academic_year_id)
DO UPDATE SET role = EXCLUDED.role
RETURNING *;

-- name: ListSocietyMembersBySociety :many
SELECT
    sm.id,
    sm.society_id,
    sm.student_id,
    sm.role,
    sm.academic_year_id,
    sm.created_at,
    sp.full_name    AS student_name,
    sp.index_number AS student_index,
    g.name          AS grade_name
FROM society_members sm
INNER JOIN student_profiles sp ON sp.id = sm.student_id
-- class_students carries one row per (student, academic_year) — filtering
-- to the membership's own year here (not just at the classes join below)
-- keeps this to at most one row per student; without it, a student with
-- class history in other years produced one duplicate output row per
-- extra year, each with grade_name NULL except the matching one.
LEFT JOIN  class_students cs   ON cs.student_id = sp.id AND cs.academic_year_id = sm.academic_year_id
LEFT JOIN  classes c           ON c.id = cs.class_id
LEFT JOIN  grades g            ON g.id = c.grade_id
WHERE sm.society_id = $1
ORDER BY
    CASE sm.role
        WHEN 'leader' THEN 1
        WHEN 'deputy_leader' THEN 2
        WHEN 'secretary' THEN 3
        WHEN 'treasurer' THEN 4
        WHEN 'member' THEN 5
    END,
    sp.full_name ASC;

-- name: RemoveSocietyMember :execrows
-- scoped by society_id as well as id: the caller is only authorized for one
-- society (SocietyService.authorizeTeacherInCharge), so the delete itself
-- must not be able to reach a membership row belonging to a different one.
DELETE FROM society_members WHERE id = $1 AND society_id = $2;

-- name: ListSocietyYears :many
-- every academic year that has at least one society — powers the
-- year-selector's archive view, same pattern as ListPrefectYears.
SELECT DISTINCT ay.id, ay.label, ay.start_date
FROM societies s
INNER JOIN academic_years ay ON ay.id = s.academic_year_id
ORDER BY ay.start_date DESC;

-- name: ListSocietyMembershipsByStudent :many
-- every society membership a student holds, across all years — for the
-- student portfolio view.
SELECT
    sm.id,
    sm.society_id,
    sm.role,
    sm.academic_year_id,
    sm.created_at,
    s.name   AS society_name,
    ay.label AS academic_year_label
FROM society_members sm
INNER JOIN societies s       ON s.id = sm.society_id
INNER JOIN academic_years ay ON ay.id = sm.academic_year_id
WHERE sm.student_id = $1
ORDER BY ay.start_date DESC;
