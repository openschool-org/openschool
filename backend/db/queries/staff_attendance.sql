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

-- name: ListStaffAttendanceRoster :many
-- One page of active teachers or non-academic staff (kind = 'teacher' | 'staff') with
-- their record for the date. The window totals cover the whole filtered set, not just
-- the page, so the UI can show "12 unmarked" correctly. Search is escaped by the caller.
WITH people AS (
    SELECT tp.id, tp.full_name, tp.employee_number, 'teacher'::text AS kind
    FROM teacher_profiles tp
    WHERE tp.employment_status = 'active' AND sqlc.arg(kind)::text = 'teacher'
    UNION ALL
    SELECT nas.id, nas.full_name, nas.employee_number, 'staff'::text AS kind
    FROM non_academic_staff nas
    WHERE nas.employment_status = 'active' AND sqlc.arg(kind)::text = 'staff'
)
SELECT
    p.id              AS staff_id,
    p.full_name       AS full_name,
    p.employee_number AS employee_number,
    sar.id            AS record_id,
    sar.status        AS status,
    sar.note          AS note,
    COUNT(*) OVER () AS total,
    COUNT(sar.id) FILTER (WHERE sar.status = 'present') OVER () AS present_total,
    COUNT(sar.id) FILTER (WHERE sar.status = 'late')    OVER () AS late_total,
    COUNT(sar.id) FILTER (WHERE sar.status = 'absent')  OVER () AS absent_total,
    COUNT(sar.id) FILTER (WHERE sar.status = 'leave')   OVER () AS leave_total
FROM people p
LEFT JOIN staff_attendance_records sar
    ON sar.date = sqlc.arg(date)::date
   AND ((p.kind = 'teacher' AND sar.teacher_id = p.id) OR (p.kind = 'staff' AND sar.non_academic_staff_id = p.id))
WHERE (sqlc.narg(search)::text IS NULL OR p.full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR p.employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
ORDER BY p.full_name ASC, p.id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListStaffAttendanceMonthly :many
-- One page of per-person status counts for the date range, same kind/search contract as above.
WITH people AS (
    SELECT tp.id, tp.full_name, tp.employee_number, 'teacher'::text AS kind
    FROM teacher_profiles tp
    WHERE tp.employment_status = 'active' AND sqlc.arg(kind)::text = 'teacher'
    UNION ALL
    SELECT nas.id, nas.full_name, nas.employee_number, 'staff'::text AS kind
    FROM non_academic_staff nas
    WHERE nas.employment_status = 'active' AND sqlc.arg(kind)::text = 'staff'
)
SELECT
    p.id              AS staff_id,
    p.full_name       AS full_name,
    p.employee_number AS employee_number,
    COUNT(sar.id) FILTER (WHERE sar.status = 'present') AS present_count,
    COUNT(sar.id) FILTER (WHERE sar.status = 'late')    AS late_count,
    COUNT(sar.id) FILTER (WHERE sar.status = 'absent')  AS absent_count,
    COUNT(sar.id) FILTER (WHERE sar.status = 'leave')   AS leave_count,
    COUNT(*) OVER () AS total
FROM people p
LEFT JOIN staff_attendance_records sar
    ON sar.date BETWEEN sqlc.arg(from_date)::date AND sqlc.arg(to_date)::date
   AND ((p.kind = 'teacher' AND sar.teacher_id = p.id) OR (p.kind = 'staff' AND sar.non_academic_staff_id = p.id))
WHERE (sqlc.narg(search)::text IS NULL OR p.full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR p.employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
GROUP BY p.id, p.full_name, p.employee_number
ORDER BY p.full_name ASC, p.id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: MarkUnmarkedTeachersPresent :execrows
-- Present for every active teacher with no record that day; existing marks are left alone.
INSERT INTO staff_attendance_records (teacher_id, date, status, marked_by)
SELECT tp.id, sqlc.arg(date)::date, 'present', sqlc.arg(marked_by)::uuid
FROM teacher_profiles tp
WHERE tp.employment_status = 'active'
ON CONFLICT (teacher_id, date) WHERE teacher_id IS NOT NULL DO NOTHING;

-- name: MarkUnmarkedNonAcademicStaffPresent :execrows
INSERT INTO staff_attendance_records (non_academic_staff_id, date, status, marked_by)
SELECT nas.id, sqlc.arg(date)::date, 'present', sqlc.arg(marked_by)::uuid
FROM non_academic_staff nas
WHERE nas.employment_status = 'active'
ON CONFLICT (non_academic_staff_id, date) WHERE non_academic_staff_id IS NOT NULL DO NOTHING;
