-- name: CreateSubject :one
INSERT INTO subjects (name, code)
VALUES ($1, $2)
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

-- name: AssignSubjectToGrade :exec
INSERT INTO grade_subjects (grade_id, subject_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveSubjectFromGrade :exec
DELETE FROM grade_subjects
WHERE grade_id = $1 AND subject_id = $2;

-- name: ListSubjectsByGrade :many
SELECT
    s.*
FROM subjects s
INNER JOIN grade_subjects gs ON gs.subject_id = s.id
WHERE gs.grade_id = $1
ORDER BY s.name ASC;

-- name: CreateSubjectBucket :one
INSERT INTO subject_buckets (grade_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: ListSubjectBucketsByGrade :many
SELECT * FROM subject_buckets
WHERE grade_id = $1
ORDER BY name ASC;

-- name: AddSubjectToBucket :exec
INSERT INTO subject_bucket_options (bucket_id, subject_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: ListSubjectBucketOptions :many
SELECT
    s.*
FROM subjects s
INNER JOIN subject_bucket_options sbo ON sbo.subject_id = s.id
WHERE sbo.bucket_id = $1
ORDER BY s.name ASC;

-- name: CreateStudentSubjectSelection :one
INSERT INTO student_subject_selections (student_id, bucket_id, subject_id)
VALUES ($1, $2, $3)
ON CONFLICT (student_id, bucket_id) DO UPDATE
SET subject_id = EXCLUDED.subject_id
RETURNING *;

-- name: ListStudentSubjectSelections :many
SELECT
    sb.name       AS bucket_name,
    s.id          AS subject_id,
    s.name        AS subject_name,
    s.code        AS subject_code
FROM student_subject_selections sss
INNER JOIN subject_buckets sb ON sb.id  = sss.bucket_id
INNER JOIN subjects        s  ON s.id   = sss.subject_id
WHERE sss.student_id = $1
ORDER BY sb.name ASC;

-- name: UpdateSubject :one
UPDATE subjects
SET
    name = $2,
    code = $3
WHERE id = $1
RETURNING *;

-- name: DeleteSubject :execrows
DELETE FROM subjects AS s
WHERE s.id = $1
AND s.id NOT IN (
    SELECT DISTINCT subject_id FROM grade_subjects
    UNION
    SELECT DISTINCT subject_id FROM class_subject_teachers
    UNION
    SELECT DISTINCT subject_id FROM student_subject_selections
);