-- name: CreateSchool :one
INSERT INTO school (
    name,
    address,
    phone,
    email,
    logo_url
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetSchool :one
SELECT * FROM school
LIMIT 1;

-- name: UpdateSchool :one
UPDATE school
SET
    name     = $2,
    address  = $3,
    phone    = $4,
    email    = $5,
    logo_url = $6
WHERE id = $1
RETURNING *;

-- name: CreateAcademicYear :one
INSERT INTO academic_years (
    label,
    start_date,
    end_date,
    is_current
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetAcademicYearByID :one
SELECT * FROM academic_years
WHERE id = $1;

-- name: GetCurrentAcademicYear :one
SELECT * FROM academic_years
WHERE is_current = TRUE
LIMIT 1;

-- name: ListAcademicYears :many
SELECT * FROM academic_years
ORDER BY start_date DESC;

-- name: SetCurrentAcademicYear :exec
UPDATE academic_years
SET is_current = (id = $1);

-- name: DeleteAcademicYear :exec
DELETE FROM academic_years AS ay
WHERE ay.id = $1
AND ay.id NOT IN (
    SELECT DISTINCT academic_year_id FROM classes
);