-- name: CreateSubject :one
INSERT INTO subjects (name, code, type)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetSubjectByID :one
SELECT * FROM subjects
WHERE id = $1;

-- name: GetSubjectByCode :one
SELECT * FROM subjects
WHERE code = $1;

-- name: ListSubjects :many
SELECT * FROM subjects
ORDER BY name ASC;

-- name: UpdateSubject :one
UPDATE subjects
SET
    name = $2,
    code = $3,
    type = $4
WHERE id = $1
RETURNING *;

-- name: DeleteSubject :execrows
DELETE FROM subjects AS s
WHERE s.id = $1
AND s.id NOT IN (
    SELECT DISTINCT subject_id FROM group_subjects
    UNION
    SELECT DISTINCT subject_id FROM class_subject_teachers
    UNION
    SELECT DISTINCT subject_id FROM student_subject_enrollments
);
