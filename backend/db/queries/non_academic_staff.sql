-- name: NextNonAcademicEmployeeNumber :one
-- shares the numbering pool with teacher_profiles (migration 000026).
SELECT lpad(nextval('employee_number_seq')::text, 5, '0')::text AS employee_number;

-- name: CreateNonAcademicStaff :one
INSERT INTO non_academic_staff (
    full_name,
    employee_number,
    designation,
    phone,
    joined_date,
    gender,
    house_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetNonAcademicStaffByID :one
SELECT * FROM non_academic_staff
WHERE id = $1;

-- name: ListNonAcademicStaff :many
SELECT * FROM non_academic_staff
WHERE (sqlc.narg(search)::text IS NULL OR full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(designation)::text IS NULL OR designation = sqlc.narg(designation)::text)
ORDER BY full_name ASC;

-- name: UpdateNonAcademicStaff :one
UPDATE non_academic_staff
SET
    full_name   = $2,
    designation = $3,
    phone       = $4,
    gender      = $5,
    updated_at  = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateNonAcademicStaffEmploymentStatus :one
UPDATE non_academic_staff
SET
    employment_status = $2,
    updated_at         = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateNonAcademicStaffHouse :one
UPDATE non_academic_staff
SET
    house_id   = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteNonAcademicStaff :execrows
DELETE FROM non_academic_staff
WHERE id = $1;
