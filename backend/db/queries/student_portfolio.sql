-- Progress reports --------------------------------------------------------

-- name: CreateProgressReport :one
INSERT INTO student_progress_reports (student_id, term_id, narrative, written_by)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListProgressReportsByStudent :many
SELECT spr.*, t.name AS term_name
FROM student_progress_reports spr
INNER JOIN terms t ON t.id = spr.term_id
WHERE spr.student_id = $1
ORDER BY t.sort_order DESC;

-- name: UpdateProgressReport :one
UPDATE student_progress_reports
SET narrative = $2, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteProgressReport :execrows
DELETE FROM student_progress_reports WHERE id = $1;

-- Activities ---------------------------------------------------------------

-- name: CreateStudentActivity :one
INSERT INTO student_activities (student_id, academic_year_id, category, name, role, achievement)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListStudentActivitiesByStudent :many
SELECT * FROM student_activities
WHERE student_id = $1
ORDER BY created_at DESC;

-- name: UpdateStudentActivity :one
UPDATE student_activities
SET category = $2, name = $3, role = $4, achievement = $5
WHERE id = $1
RETURNING *;

-- name: DeleteStudentActivity :execrows
DELETE FROM student_activities WHERE id = $1;

-- Leadership roles -----------------------------------------------------------

-- name: CreateStudentLeadershipRole :one
INSERT INTO student_leadership_roles (student_id, academic_year_id, title, scope)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListStudentLeadershipRolesByStudent :many
SELECT * FROM student_leadership_roles
WHERE student_id = $1
ORDER BY created_at DESC;

-- name: DeleteStudentLeadershipRole :execrows
DELETE FROM student_leadership_roles WHERE id = $1;

-- Awards ---------------------------------------------------------------------

-- name: CreateStudentAward :one
INSERT INTO student_awards (student_id, academic_year_id, title, category, awarded_date, description)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListStudentAwardsByStudent :many
SELECT * FROM student_awards
WHERE student_id = $1
ORDER BY awarded_date DESC;

-- name: DeleteStudentAward :execrows
DELETE FROM student_awards WHERE id = $1;

-- Disciplinary records --------------------------------------------------------

-- name: CreateDisciplinaryRecord :one
INSERT INTO student_disciplinary_records (student_id, academic_year_id, incident_date, description, action_taken, severity, recorded_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListDisciplinaryRecordsByStudent :many
SELECT * FROM student_disciplinary_records
WHERE student_id = $1
ORDER BY incident_date DESC;

-- name: DeleteDisciplinaryRecord :execrows
DELETE FROM student_disciplinary_records WHERE id = $1;
