-- name: CreateTeacherProfile :one
INSERT INTO teacher_profiles (
    user_id,
    full_name,
    employee_number,
    joined_date,
    phone
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetTeacherByID :one
SELECT * FROM teacher_profiles
WHERE id = $1;

-- name: GetTeacherByUserID :one
SELECT * FROM teacher_profiles
WHERE user_id = $1;

-- name: GetTeacherByEmployeeNumber :one
SELECT * FROM teacher_profiles
WHERE employee_number = $1;

-- name: ListTeachers :many
SELECT * FROM teacher_profiles
ORDER BY full_name ASC;

-- name: UpdateTeacherProfile :one
UPDATE teacher_profiles
SET
    full_name       = $2,
    employee_number = $3,
    phone           = $4,
    updated_at      = NOW()
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

-- name: GetFormTeacherClass :one
SELECT
    c.*
FROM classes c
WHERE c.form_teacher_id = $1
  AND c.academic_year_id = (
      SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1
  );

-- name: DeleteTeacher :exec
DELETE FROM teacher_profiles
WHERE id = $1;