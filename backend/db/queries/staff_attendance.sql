-- name: UpsertTeacherAttendance :one
INSERT INTO staff_attendance_records (teacher_id, date, status, marked_by, note)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (teacher_id, date) WHERE teacher_id IS NOT NULL
DO UPDATE SET status = $3, marked_by = $4, note = $5, updated_at = NOW()
RETURNING *;

-- name: UpsertNonAcademicStaffAttendance :one
INSERT INTO staff_attendance_records (non_academic_staff_id, date, status, marked_by, note)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (non_academic_staff_id, date) WHERE non_academic_staff_id IS NOT NULL
DO UPDATE SET status = $3, marked_by = $4, note = $5, updated_at = NOW()
RETURNING *;

-- name: ListTeacherAttendanceByDate :many
SELECT
    tp.id          AS teacher_id,
    tp.full_name   AS full_name,
    tp.employee_number AS employee_number,
    sar.id         AS record_id,
    sar.status     AS status,
    sar.note       AS note
FROM teacher_profiles tp
LEFT JOIN staff_attendance_records sar
    ON sar.teacher_id = tp.id AND sar.date = $1
WHERE tp.employment_status = 'active'
ORDER BY tp.full_name ASC;

-- name: ListNonAcademicStaffAttendanceByDate :many
SELECT
    nas.id            AS staff_id,
    nas.full_name     AS full_name,
    nas.employee_number AS employee_number,
    sar.id            AS record_id,
    sar.status        AS status,
    sar.note          AS note
FROM non_academic_staff nas
LEFT JOIN staff_attendance_records sar
    ON sar.non_academic_staff_id = nas.id AND sar.date = $1
WHERE nas.employment_status = 'active'
ORDER BY nas.full_name ASC;

-- name: ListTeacherAttendanceHistory :many
SELECT * FROM staff_attendance_records
WHERE teacher_id = $1 AND date BETWEEN $2 AND $3
ORDER BY date DESC;

-- name: ListNonAcademicStaffAttendanceHistory :many
SELECT * FROM staff_attendance_records
WHERE non_academic_staff_id = $1 AND date BETWEEN $2 AND $3
ORDER BY date DESC;

-- name: MonthlyTeacherAttendanceSummary :many
-- one row per teacher with a count for each status in the given date range
-- (the caller passes the first/last day of the month).
SELECT
    tp.id        AS teacher_id,
    tp.full_name AS full_name,
    COUNT(*) FILTER (WHERE sar.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE sar.status = 'late')    AS late_count,
    COUNT(*) FILTER (WHERE sar.status = 'absent')  AS absent_count,
    COUNT(*) FILTER (WHERE sar.status = 'leave')   AS leave_count
FROM teacher_profiles tp
LEFT JOIN staff_attendance_records sar
    ON sar.teacher_id = tp.id AND sar.date BETWEEN $1 AND $2
WHERE tp.employment_status = 'active'
GROUP BY tp.id, tp.full_name
ORDER BY tp.full_name ASC;

-- name: MonthlyNonAcademicStaffAttendanceSummary :many
SELECT
    nas.id        AS staff_id,
    nas.full_name AS full_name,
    COUNT(*) FILTER (WHERE sar.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE sar.status = 'late')    AS late_count,
    COUNT(*) FILTER (WHERE sar.status = 'absent')  AS absent_count,
    COUNT(*) FILTER (WHERE sar.status = 'leave')   AS leave_count
FROM non_academic_staff nas
LEFT JOIN staff_attendance_records sar
    ON sar.non_academic_staff_id = nas.id AND sar.date BETWEEN $1 AND $2
WHERE nas.employment_status = 'active'
GROUP BY nas.id, nas.full_name
ORDER BY nas.full_name ASC;
