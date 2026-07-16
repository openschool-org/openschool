-- name: CreateStudentProfile :one
INSERT INTO student_profiles (
    user_id,
    full_name,
    index_number,
    address,
    phone,
    whatsapp,
    special_remarks,
    gender
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetStudentByID :one
SELECT * FROM student_profiles
WHERE id = $1;

-- name: GetStudentByIndexNumber :one
SELECT * FROM student_profiles
WHERE index_number = $1;

-- name: GetStudentByUserID :one
SELECT * FROM student_profiles
WHERE user_id = $1;

-- name: ListStudents :many
SELECT * FROM student_profiles
ORDER BY full_name ASC;

-- name: UpdateStudentProfile :one
UPDATE student_profiles
SET
    full_name       = $2,
    address         = $3,
    phone           = $4,
    whatsapp        = $5,
    special_remarks = $6,
    gender          = $7,
    updated_at      = NOW()
WHERE id = $1
RETURNING *;

-- name: GetStudentWithClass :one
SELECT
    sp.*,
    c.name        AS class_name,
    g.name        AS grade_name,
    ay.label      AS academic_year
FROM student_profiles sp
LEFT JOIN class_students cs ON cs.student_id = sp.id
LEFT JOIN classes c         ON c.id = cs.class_id
LEFT JOIN grades g          ON g.id = c.grade_id
LEFT JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
WHERE sp.id = $1;

-- name: ListStudentsByClass :many
SELECT
    sp.*
FROM student_profiles sp
INNER JOIN class_students cs ON cs.student_id = sp.id
WHERE cs.class_id = $1
ORDER BY sp.full_name ASC;


-- name: DeleteStudentProfile :exec
DELETE FROM student_profiles
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;