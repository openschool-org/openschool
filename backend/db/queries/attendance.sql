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

-- name: DeleteAttendanceSession :exec
-- attendance_records cascade with the session
DELETE FROM attendance_sessions
WHERE id = $1;

-- name: ListAttendanceSessionsByClass :many
SELECT * FROM attendance_sessions
WHERE class_id = $1
ORDER BY date DESC;

-- name: ListAttendanceSessionsByDate :many
-- the cross-class daily dashboard: every session on one date, with the class,
-- grade and teacher resolved, plus enough counts to show marked/pending and
-- how many of the enrolled students have a record so far.
-- grade_ids narrows to the caller's authorized grades (whole-school callers
-- pass NULL); filtered at the SQL WHERE clause level, not in application
-- code, so a scoped caller can never receive rows outside their grades.
SELECT
    ats.id,
    ats.class_id,
    ats.taken_by,
    ats.date,
    ats.created_at,
    c.name                                    AS class_name,
    g.name                                     AS grade_name,
    u.full_name                                AS teacher_name,
    (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id) AS enrolled_count,
    (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ats.id) AS marked_count
FROM attendance_sessions ats
INNER JOIN classes c ON c.id = ats.class_id
INNER JOIN grades  g ON g.id = c.grade_id
INNER JOIN users   u ON u.id = ats.taken_by
WHERE ats.date = $1
  AND (sqlc.narg(grade_ids)::uuid[] IS NULL OR g.id = ANY(sqlc.narg(grade_ids)::uuid[]))
ORDER BY g.sort_order ASC, c.name ASC;

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

-- name: ListAttendanceRecordsBySession :many
-- raw records for a session, no join — batches the "does this student
-- already have a record, and what was it" check MarkAttendance needs for
-- every student in one query instead of one GetAttendanceRecord per student.
SELECT * FROM attendance_records
WHERE session_id = $1;

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

-- name: ListAttendanceRecordsForClassInRange :many
-- every attendance record for a class across a date range — for the
-- Phase 7 attendance report export.
SELECT
    ar.id,
    sp.full_name    AS student_name,
    sp.index_number AS student_index,
    ats.date        AS session_date,
    ar.status       AS status,
    ar.note         AS note
FROM attendance_records ar
INNER JOIN attendance_sessions ats ON ats.id = ar.session_id
INNER JOIN student_profiles    sp  ON sp.id  = ar.student_id
WHERE ats.class_id = $1
  AND ats.date BETWEEN $2 AND $3
ORDER BY ats.date ASC, sp.full_name ASC;

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
