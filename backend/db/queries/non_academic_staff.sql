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
-- Server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4).
-- The caller-supplied search term is escaped by the service layer
-- (httpx.EscapeLikeTerm) before it reaches here.
SELECT *, COUNT(*) OVER () AS total FROM non_academic_staff
WHERE (sqlc.narg(search)::text IS NULL OR full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(designation)::text IS NULL OR designation = sqlc.narg(designation)::text)
ORDER BY
    -- Whitelisted by httpx.ParseSort; an empty key keeps the default name order.
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND NOT sqlc.arg(sort_desc)::bool THEN full_name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND sqlc.arg(sort_desc)::bool THEN full_name END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'employee' AND NOT sqlc.arg(sort_desc)::bool THEN employee_number END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'employee' AND sqlc.arg(sort_desc)::bool THEN employee_number END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'designation' AND NOT sqlc.arg(sort_desc)::bool THEN designation END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'designation' AND sqlc.arg(sort_desc)::bool THEN designation END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'joined' AND NOT sqlc.arg(sort_desc)::bool THEN joined_date END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'joined' AND sqlc.arg(sort_desc)::bool THEN joined_date END DESC,
    full_name ASC, id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

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
