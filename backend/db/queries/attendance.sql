-- name: CreateAttendanceSession :one
INSERT INTO attendance_sessions (class_id, taken_by, date)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetAttendanceSessionByID :one
SELECT * FROM attendance_sessions
WHERE id = $1;

-- name: GetAttendanceSessionByClassAndDate :one
SELECT * FROM attendance_sessions
WHERE class_id = $1 AND date = $2;

-- name: ListAttendanceSessionsByClass :many
SELECT * FROM attendance_sessions
WHERE class_id = $1
ORDER BY date DESC;

-- name: MarkAttendance :one
INSERT INTO attendance_records (session_id, student_id, status, note)
VALUES ($1, $2, $3, $4)
ON CONFLICT (session_id, student_id) DO UPDATE
SET
    status = EXCLUDED.status,
    note   = EXCLUDED.note
RETURNING *;

-- name: GetAttendanceRecord :one
SELECT * FROM attendance_records
WHERE session_id = $1 AND student_id = $2;

-- name: ListAttendanceBySession :many
SELECT
    ar.*,
    sp.full_name     AS student_name,
    sp.index_number  AS student_index
FROM attendance_records ar
INNER JOIN student_profiles sp ON sp.id = ar.student_id
WHERE ar.session_id = $1
ORDER BY sp.full_name ASC;

-- name: ListAttendanceByStudent :many
SELECT
    ar.*,
    ats.date        AS session_date,
    c.name          AS class_name
FROM attendance_records ar
INNER JOIN attendance_sessions ats ON ats.id = ar.session_id
INNER JOIN classes             c   ON c.id   = ats.class_id
WHERE ar.student_id = $1
ORDER BY ats.date DESC;

-- name: GetAttendanceSummaryByStudent :one
SELECT
    COUNT(*)                                            AS total_days,
    COUNT(*) FILTER (WHERE ar.status = 'present')      AS present,
    COUNT(*) FILTER (WHERE ar.status = 'absent')       AS absent,
    COUNT(*) FILTER (WHERE ar.status = 'late')         AS late,
    COUNT(*) FILTER (WHERE ar.status = 'excused')      AS excused
FROM attendance_records ar
INNER JOIN attendance_sessions ats ON ats.id = ar.session_id
WHERE ar.student_id = $1
  AND ats.class_id  = $2;
