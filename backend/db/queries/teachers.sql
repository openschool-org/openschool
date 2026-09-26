-- name: NextEmployeeNumber :one
-- shared numbering pool with non_academic_staff (migration 000026). Called
-- explicitly by the service (rather than relying on the column DEFAULT)
-- because the value is needed up-front to pass to the identity provider
-- before the teacher_profiles row exists.
SELECT lpad(nextval('employee_number_seq')::text, 5, '0')::text AS employee_number;

-- name: CreateTeacherProfile :one
INSERT INTO teacher_profiles (
    user_id,
    full_name,
    employee_number,
    nic_number,
    joined_date,
    phone,
    title,
    gender,
    house_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetTeacherByID :one
SELECT tp.*, u.email AS email
FROM teacher_profiles tp
INNER JOIN users u ON u.id = tp.user_id
WHERE tp.id = $1;

-- name: ListTeachersByIDs :many
-- batched form of GetTeacherByID for resolving several teacher_profile IDs
-- (e.g. to their user_id, for a notification recipient list) in one query
-- instead of one per teacher.
SELECT * FROM teacher_profiles
WHERE id = ANY($1::uuid[]);

-- name: UpdateTeacherEmploymentStatus :one
UPDATE teacher_profiles
SET
    employment_status = $2,
    updated_at        = NOW()
WHERE id = $1
RETURNING *;

-- name: GetTeacherByUserID :one
SELECT * FROM teacher_profiles
WHERE user_id = $1;

-- name: GetTeacherByEmployeeNumber :one
SELECT * FROM teacher_profiles
WHERE employee_number = $1;

-- name: GetTeacherByUserIDAndNIC :one
-- Identity check for the unauthenticated forgot-password flow (Phase 8.4) —
-- confirms the caller knows this teacher's NIC before a reset token is
-- minted for their account.
SELECT * FROM teacher_profiles
WHERE user_id = $1 AND nic_number = $2;

-- name: ListTeachers :many
SELECT * FROM teacher_profiles
ORDER BY full_name ASC;

-- name: ListTeachersPage :many
-- Server-paginated replacement for ListTeachers (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
-- section 4). The caller-supplied search term is escaped by the service
-- layer (httpx.EscapeLikeTerm) before it reaches here.
SELECT *, COUNT(*) OVER () AS total
FROM teacher_profiles
WHERE (sqlc.narg(search)::text IS NULL OR full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(status)::text IS NULL OR employment_status = sqlc.narg(status)::text)
ORDER BY
    -- Whitelisted by httpx.ParseSort; an empty key keeps the default name order.
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND NOT sqlc.arg(sort_desc)::bool THEN full_name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND sqlc.arg(sort_desc)::bool THEN full_name END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'employee' AND NOT sqlc.arg(sort_desc)::bool THEN employee_number END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'employee' AND sqlc.arg(sort_desc)::bool THEN employee_number END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'joined' AND NOT sqlc.arg(sort_desc)::bool THEN joined_date END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'joined' AND sqlc.arg(sort_desc)::bool THEN joined_date END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'status' AND NOT sqlc.arg(sort_desc)::bool THEN employment_status END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'status' AND sqlc.arg(sort_desc)::bool THEN employment_status END DESC,
    full_name ASC, id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: UpdateTeacherProfile :one
-- employee_number is immutable once assigned (Phase 6.1) — not updatable here.
-- nic_number *is* updatable, unlike employee_number — a typo should be
-- correctable, it just has to stay unique (Phase 8.1).
UPDATE teacher_profiles
SET
    full_name  = $2,
    phone      = $3,
    title      = $4,
    gender     = $5,
    nic_number = $6,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListTeachersBySubject :many
SELECT
    tp.*
FROM teacher_profiles tp
INNER JOIN teacher_subjects ts ON ts.teacher_id = tp.id
WHERE ts.subject_id = $1
ORDER BY tp.full_name ASC;

-- name: AssignSubjectToTeacher :exec
INSERT INTO teacher_subjects (teacher_id, subject_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveSubjectFromTeacher :exec
DELETE FROM teacher_subjects
WHERE teacher_id = $1 AND subject_id = $2;

-- name: ListSubjectsByTeacher :many
SELECT
    s.*
FROM subjects s
INNER JOIN teacher_subjects ts ON ts.subject_id = s.id
WHERE ts.teacher_id = $1
ORDER BY s.name ASC;

-- name: CountSubjectsByTeacher :one
SELECT COUNT(*) FROM teacher_subjects WHERE teacher_id = $1;

-- name: SetTeacherActiveStatus :exec
UPDATE teacher_profiles
SET is_active = $2, updated_at = NOW()
WHERE id = $1;

-- name: ListTeacherWorkload :many
-- every class+subject a teacher is assigned to teach, across academic years
SELECT
    s.id           AS subject_id,
    s.name         AS subject_name,
    c.id           AS class_id,
    c.name         AS class_name,
    g.name         AS grade_name,
    ay.id          AS academic_year_id,
    ay.label       AS academic_year_label,
    ay.is_current  AS academic_year_is_current
FROM class_subject_teachers cst
INNER JOIN classes c         ON c.id = cst.class_id
INNER JOIN grades g          ON g.id = c.grade_id
INNER JOIN subjects s        ON s.id = cst.subject_id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id
WHERE cst.teacher_id = $1
ORDER BY ay.is_current DESC, s.name ASC, g.sort_order ASC, c.name ASC;

-- name: GetFormTeacherClass :one
SELECT
    c.*
FROM classes c
WHERE c.form_teacher_id = $1
  AND c.academic_year_id = (
      SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1
  );

-- name: DeleteTeacher :execrows
-- blocked while the teacher is assigned to teach a class subject, or has
-- taken an attendance session (both ON DELETE RESTRICT)
DELETE FROM teacher_profiles AS tp
WHERE tp.id = $1
AND tp.id NOT IN (
    SELECT DISTINCT teacher_id FROM class_subject_teachers
    UNION
    SELECT DISTINCT taken_by FROM attendance_sessions
);