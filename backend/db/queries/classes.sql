-- name: CreateGrade :one
INSERT INTO grades (name, sort_order)
VALUES ($1, $2)
RETURNING *;

-- name: GetGradeByID :one
SELECT * FROM grades
WHERE id = $1;

-- name: ListGrades :many
SELECT * FROM grades
ORDER BY sort_order ASC, name ASC;

-- name: CreateStream :one
INSERT INTO streams (name)
VALUES ($1)
RETURNING *;

-- name: ListStreams :many
SELECT * FROM streams
ORDER BY name ASC;

-- name: CreateStreamGroup :one
INSERT INTO stream_groups (stream_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: ListStreamGroupsByStream :many
SELECT * FROM stream_groups
WHERE stream_id = $1
ORDER BY name ASC;

-- name: CreateClass :one
INSERT INTO classes (
    grade_id,
    academic_year_id,
    form_teacher_id,
    stream_id,
    stream_group_id,
    name
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetClassByID :one
SELECT * FROM classes
WHERE id = $1;

-- name: ListClassesByAcademicYear :many
SELECT
    c.*,
    g.name  AS grade_name,
    ay.label AS academic_year_label
FROM classes c
INNER JOIN grades g          ON g.id = c.grade_id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id
WHERE c.academic_year_id = $1
ORDER BY g.sort_order ASC, c.name ASC;

-- name: ListCurrentClasses :many
SELECT
    c.*,
    g.name   AS grade_name,
    ay.label AS academic_year_label
FROM classes c
INNER JOIN grades g          ON g.id = c.grade_id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id
WHERE ay.is_current = TRUE
ORDER BY g.sort_order ASC, c.name ASC;

-- name: AssignFormTeacher :one
UPDATE classes
SET form_teacher_id = $2
WHERE id = $1
RETURNING *;

-- name: EnrollStudentInClass :exec
INSERT INTO class_students (class_id, student_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnenrollStudentFromClass :exec
DELETE FROM class_students
WHERE class_id = $1 AND student_id = $2;

-- name: GetStudentCurrentClass :one
SELECT
    c.id,
    c.grade_id,
    c.academic_year_id,
    c.form_teacher_id,
    c.stream_id,
    c.stream_group_id,
    c.name,
    c.created_at
FROM classes c
INNER JOIN class_students cs ON cs.class_id = c.id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id
WHERE cs.student_id = $1
  AND ay.is_current = TRUE
LIMIT 1;

-- name: AssignSubjectTeacherToClass :exec
INSERT INTO class_subject_teachers (class_id, subject_id, teacher_id)
VALUES ($1, $2, $3)
ON CONFLICT (class_id, subject_id) DO UPDATE
SET teacher_id = EXCLUDED.teacher_id;

-- name: ListSubjectTeachersByClass :many
SELECT
    s.id         AS subject_id,
    s.name       AS subject_name,
    s.code       AS subject_code,
    tp.id        AS teacher_id,
    tp.full_name AS teacher_name
FROM class_subject_teachers cst
INNER JOIN subjects         s  ON s.id  = cst.subject_id
INNER JOIN teacher_profiles tp ON tp.id = cst.teacher_id
WHERE cst.class_id = $1
ORDER BY s.name ASC;

-- name: UpdateGrade :one
UPDATE grades
SET
    name       = $2,
    sort_order = $3
WHERE id = $1
RETURNING *;

-- name: DeleteGrade :execrows
DELETE FROM grades AS g
WHERE g.id = $1
AND g.id NOT IN (
    SELECT DISTINCT grade_id FROM classes
    UNION
    SELECT DISTINCT grade_id FROM levels WHERE grade_id IS NOT NULL
);

-- name: GetStreamByID :one
SELECT * FROM streams
WHERE id = $1;

-- name: UpdateStream :one
UPDATE streams
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteStream :execrows
DELETE FROM streams AS s
WHERE s.id = $1
AND s.id NOT IN (
    SELECT DISTINCT stream_id FROM classes WHERE stream_id IS NOT NULL
);

-- name: GetStreamGroupByID :one
SELECT * FROM stream_groups
WHERE id = $1;

-- name: UpdateStreamGroup :one
UPDATE stream_groups
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteStreamGroup :execrows
DELETE FROM stream_groups AS sg
WHERE sg.id = $1
AND sg.id NOT IN (
    SELECT DISTINCT stream_group_id FROM classes WHERE stream_group_id IS NOT NULL
);

-- name: UpdateClass :one
UPDATE classes
SET
    name            = $2,
    form_teacher_id = $3
WHERE id = $1
RETURNING *;

-- name: DeleteClass :exec
DELETE FROM classes AS c
WHERE c.id = $1
AND c.id NOT IN (
    SELECT DISTINCT class_id FROM class_students
);

-- name: GetClassStudentCount :one
SELECT COUNT(*) FROM class_students
WHERE class_id = $1;