-- name: CreateStudentSubjectEnrollment :one
INSERT INTO student_subject_enrollments (student_id, academic_year_id, group_id, subject_id, medium_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (student_id, academic_year_id, group_id, subject_id) DO UPDATE
SET medium_id = EXCLUDED.medium_id
RETURNING *;

-- name: DeleteStudentSubjectEnrollment :exec
DELETE FROM student_subject_enrollments
WHERE student_id = $1
  AND academic_year_id = $2
  AND group_id = $3
  AND subject_id = $4;

-- name: DeleteStudentEnrollmentsForLevel :exec
-- clears a student's picks for one level/year so a re-submit replaces them
DELETE FROM student_subject_enrollments AS sse
USING selection_groups AS sg
WHERE sse.group_id = sg.id
  AND sse.student_id = $1
  AND sse.academic_year_id = $2
  AND sg.level_id = $3;

-- name: ListStudentEnrollments :many
SELECT
    sse.student_id,
    sse.academic_year_id,
    sse.group_id,
    sg.label   AS group_label,
    sg.level_id,
    l.label    AS level_label,
    sse.subject_id,
    s.name     AS subject_name,
    s.code     AS subject_code,
    s.type     AS subject_type,
    sse.medium_id,
    m.name     AS medium_name,
    sse.enrolled_at
FROM student_subject_enrollments sse
INNER JOIN selection_groups sg ON sg.id = sse.group_id
INNER JOIN levels           l  ON l.id  = sg.level_id
INNER JOIN subjects         s  ON s.id  = sse.subject_id
LEFT  JOIN mediums          m  ON m.id  = sse.medium_id
WHERE sse.student_id = $1
  AND sse.academic_year_id = $2
ORDER BY l.sort_order ASC, sg.sort_order ASC, s.name ASC;

-- name: ListStudentEnrollmentsByLevel :many
SELECT
    sse.student_id,
    sse.academic_year_id,
    sse.group_id,
    sg.label   AS group_label,
    sse.subject_id,
    s.name     AS subject_name,
    s.code     AS subject_code,
    sse.medium_id,
    m.name     AS medium_name,
    sse.enrolled_at
FROM student_subject_enrollments sse
INNER JOIN selection_groups sg ON sg.id = sse.group_id
INNER JOIN subjects         s  ON s.id  = sse.subject_id
LEFT  JOIN mediums          m  ON m.id  = sse.medium_id
WHERE sse.student_id = $1
  AND sse.academic_year_id = $2
  AND sg.level_id = $3
ORDER BY sg.sort_order ASC, s.name ASC;

-- name: ListStudentsBySubject :many
SELECT
    sp.id           AS student_id,
    sp.full_name,
    sp.index_number,
    sse.group_id,
    sg.label        AS group_label,
    sse.medium_id,
    m.name          AS medium_name,
    sse.enrolled_at
FROM student_subject_enrollments sse
INNER JOIN student_profiles sp ON sp.id = sse.student_id
INNER JOIN selection_groups sg ON sg.id = sse.group_id
LEFT  JOIN mediums          m  ON m.id  = sse.medium_id
WHERE sse.subject_id = $1
  AND sse.academic_year_id = $2
ORDER BY sp.full_name ASC;

-- name: ListStudentsByGroup :many
SELECT
    sp.id           AS student_id,
    sp.full_name,
    sp.index_number,
    sse.subject_id,
    s.name          AS subject_name,
    s.code          AS subject_code,
    sse.medium_id,
    m.name          AS medium_name,
    sse.enrolled_at
FROM student_subject_enrollments sse
INNER JOIN student_profiles sp ON sp.id = sse.student_id
INNER JOIN subjects         s  ON s.id  = sse.subject_id
LEFT  JOIN mediums          m  ON m.id  = sse.medium_id
WHERE sse.group_id = $1
  AND sse.academic_year_id = $2
ORDER BY sp.full_name ASC, s.name ASC;
