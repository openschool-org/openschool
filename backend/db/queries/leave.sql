-- name: CreateLeaveRequest :one
INSERT INTO teacher_leave_requests (
    teacher_id, leave_type, start_date, end_date, day_part, start_time, end_time, days, reason, acting_teacher_id
) VALUES (
    @teacher_id, @leave_type, @start_date, @end_date, @day_part,
    sqlc.narg(start_time)::time, sqlc.narg(end_time)::time, @days::float8, @reason, sqlc.narg(acting_teacher_id)::uuid
)
RETURNING id;

-- name: InsertLeaveRelief :exec
INSERT INTO teacher_leave_relief (leave_request_id, date, period_number, class_id, subject_id, relief_teacher_id)
VALUES (@leave_request_id, @date, @period_number, @class_id, sqlc.narg(subject_id)::uuid, sqlc.narg(relief_teacher_id)::uuid);

-- name: GetLeaveRequest :one
SELECT
    lr.id, lr.teacher_id, display_name(tp.full_name, tp.name_with_initials)::text AS teacher_name,
    tp.employee_number, tp.user_id AS teacher_user_id,
    lr.leave_type, lr.start_date, lr.end_date, lr.day_part,
    COALESCE(to_char(lr.start_time, 'HH24:MI'), '')::text AS start_time,
    COALESCE(to_char(lr.end_time, 'HH24:MI'), '')::text AS end_time,
    lr.days::float8 AS days, lr.reason,
    lr.acting_teacher_id, COALESCE(display_name(at.full_name, at.name_with_initials), '')::text AS acting_teacher_name,
    lr.status, lr.decided_at, COALESCE(du.full_name, '')::text AS decided_by_name,
    COALESCE(lr.decision_note, '')::text AS decision_note, lr.created_at
FROM teacher_leave_requests lr
INNER JOIN teacher_profiles tp ON tp.id = lr.teacher_id
LEFT JOIN teacher_profiles at ON at.id = lr.acting_teacher_id
LEFT JOIN users du ON du.id = lr.decided_by
WHERE lr.id = $1;

-- name: ListLeaveRequestsPage :many
-- The leave register. The caller-supplied search term is escaped by
-- httpx.ParsePage before it reaches here.
SELECT
    lr.id, lr.teacher_id, display_name(tp.full_name, tp.name_with_initials)::text AS teacher_name,
    tp.employee_number, tp.user_id AS teacher_user_id,
    lr.leave_type, lr.start_date, lr.end_date, lr.day_part,
    COALESCE(to_char(lr.start_time, 'HH24:MI'), '')::text AS start_time,
    COALESCE(to_char(lr.end_time, 'HH24:MI'), '')::text AS end_time,
    lr.days::float8 AS days, lr.reason,
    lr.acting_teacher_id, COALESCE(display_name(at.full_name, at.name_with_initials), '')::text AS acting_teacher_name,
    lr.status, lr.decided_at, COALESCE(du.full_name, '')::text AS decided_by_name,
    COALESCE(lr.decision_note, '')::text AS decision_note, lr.created_at,
    COUNT(*) OVER () AS total
FROM teacher_leave_requests lr
INNER JOIN teacher_profiles tp ON tp.id = lr.teacher_id
LEFT JOIN teacher_profiles at ON at.id = lr.acting_teacher_id
LEFT JOIN users du ON du.id = lr.decided_by
WHERE EXTRACT(YEAR FROM lr.start_date) = @year::int
  AND (sqlc.narg(teacher_id)::uuid IS NULL OR lr.teacher_id = sqlc.narg(teacher_id)::uuid)
  AND (sqlc.narg(status)::text IS NULL OR lr.status = sqlc.narg(status)::text)
  AND (sqlc.narg(leave_type)::text IS NULL OR lr.leave_type = sqlc.narg(leave_type)::text)
  AND (sqlc.narg(search)::text IS NULL OR tp.full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR tp.name_with_initials ILIKE '%' || sqlc.narg(search)::text || '%' OR tp.employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
-- pending first, since that is the approver's queue
ORDER BY (lr.status = 'pending') DESC, lr.start_date DESC, lr.created_at DESC, lr.id
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListLeaveRelief :many
SELECT
    r.id, r.date, r.period_number, r.class_id, (g.name || ' ' || c.name)::text AS class_name,
    r.subject_id, COALESCE(s.name, '')::text AS subject_name,
    r.relief_teacher_id, COALESCE(display_name(rt.full_name, rt.name_with_initials), '')::text AS relief_teacher_name
FROM teacher_leave_relief r
INNER JOIN classes c ON c.id = r.class_id
INNER JOIN grades g ON g.id = c.grade_id
LEFT JOIN subjects s ON s.id = r.subject_id
LEFT JOIN teacher_profiles rt ON rt.id = r.relief_teacher_id
WHERE r.leave_request_id = $1
ORDER BY r.date, r.period_number;

-- name: CountOverlappingLeave :one
SELECT COUNT(*) FROM teacher_leave_requests
WHERE teacher_id = @teacher_id
  AND status IN ('pending', 'approved')
  AND start_date <= @end_date AND end_date >= @start_date;

-- name: SumLeaveDaysByType :many
-- days charged per leave type in a leave (calendar) year, split by whether
-- they are approved or still waiting, so a balance check can count both
SELECT
    leave_type,
    COALESCE(SUM(days) FILTER (WHERE status = 'approved'), 0)::float8 AS approved_days,
    COALESCE(SUM(days) FILTER (WHERE status = 'pending'), 0)::float8 AS pending_days,
    COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
FROM teacher_leave_requests
WHERE teacher_id = @teacher_id
  AND status IN ('pending', 'approved')
  AND EXTRACT(YEAR FROM start_date) = @year::int
GROUP BY leave_type;

-- name: CountShortLeaveInMonth :one
SELECT COUNT(*) FROM teacher_leave_requests
WHERE teacher_id = @teacher_id
  AND leave_type = 'short'
  AND status IN ('pending', 'approved')
  AND start_date >= @month_start AND start_date <= @month_end;

-- name: DecideLeaveRequest :execrows
-- only a pending request can be decided, so two approvers acting at once
-- cannot both win
UPDATE teacher_leave_requests
SET status = @status, decided_by = @decided_by, decided_at = NOW(), decision_note = sqlc.narg(decision_note)::text, updated_at = NOW()
WHERE id = @id AND status = 'pending';

-- name: CancelLeaveRequest :execrows
UPDATE teacher_leave_requests
SET status = 'cancelled', updated_at = NOW()
WHERE id = @id AND teacher_id = @teacher_id AND status = 'pending';

-- name: ListTeacherPeriodsForLeave :many
-- every period the teacher takes in a published timetable this year, with
-- its clock time and whether it falls after the interval (the afternoon)
SELECT
    x.day_of_week, x.period_number, x.class_id, x.class_name, x.subject_id, x.subject_name,
    COALESCE(to_char(p.start_time, 'HH24:MI'), '')::text AS start_time,
    COALESCE(to_char(p.end_time, 'HH24:MI'), '')::text AS end_time,
    COALESCE(p.sort_order > iv.sort_order, FALSE)::bool AS after_interval
FROM (
    SELECT te.day_of_week, te.period_number, t.class_id, (g.name || ' ' || c.name)::text AS class_name,
           c.grade_id, t.academic_year_id, te.subject_id, COALESCE(s.name, '')::text AS subject_name
    FROM timetable_entries te
    INNER JOIN timetables t ON t.id = te.timetable_id
    INNER JOIN classes c ON c.id = t.class_id
    INNER JOIN grades g ON g.id = c.grade_id
    LEFT JOIN subjects s ON s.id = te.subject_id
    WHERE te.teacher_id = @teacher_id AND t.academic_year_id = @academic_year_id AND t.status = 'published'
    UNION ALL
    -- option block periods where this teacher takes the class's students for one of the block's subjects
    SELECT te.day_of_week, te.period_number, t.class_id, (g.name || ' ' || c.name)::text,
           c.grade_id, t.academic_year_id, bs.subject_id, s.name::text
    FROM timetable_entries te
    INNER JOIN timetables t ON t.id = te.timetable_id
    INNER JOIN classes c ON c.id = t.class_id
    INNER JOIN grades g ON g.id = c.grade_id
    INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
    INNER JOIN class_subject_teachers cst ON cst.class_id = t.class_id AND cst.subject_id = bs.subject_id
    INNER JOIN subjects s ON s.id = bs.subject_id
    WHERE cst.teacher_id = @teacher_id AND t.academic_year_id = @academic_year_id AND t.status = 'published'
) x
LEFT JOIN grade_section_grades gsg ON gsg.grade_id = x.grade_id AND gsg.academic_year_id = x.academic_year_id
LEFT JOIN timetable_periods p ON p.grade_section_id = gsg.grade_section_id AND p.period_number = x.period_number
LEFT JOIN timetable_periods iv ON iv.grade_section_id = gsg.grade_section_id AND iv.slot_type = 'interval'
ORDER BY x.day_of_week, x.period_number;

-- name: ListReliefCandidates :many
-- active teachers who are free in that period: not timetabled, not already
-- relieving someone else, and not themselves away for the day. Fewest
-- relief periods that day first, so relief duty is shared out.
SELECT
    tp.id, display_name(tp.full_name, tp.name_with_initials)::text AS full_name, tp.employee_number,
    (SELECT COUNT(*) FROM teacher_leave_relief r
       INNER JOIN teacher_leave_requests lr ON lr.id = r.leave_request_id
      WHERE r.relief_teacher_id = tp.id AND r.date = @date AND lr.status IN ('pending', 'approved')) AS relief_periods
FROM teacher_profiles tp
WHERE tp.employment_status = 'active'
  AND tp.id <> @exclude_teacher_id
  AND NOT EXISTS (
      SELECT 1 FROM timetable_entries te
      INNER JOIN timetables t ON t.id = te.timetable_id
      WHERE te.teacher_id = tp.id AND te.day_of_week = @day_of_week AND te.period_number = @period_number
        AND t.academic_year_id = @academic_year_id AND t.status = 'published')
  AND NOT EXISTS (
      SELECT 1 FROM timetable_entries te
      INNER JOIN timetables t ON t.id = te.timetable_id
      INNER JOIN timetable_option_block_subjects bs ON bs.block_id = te.option_block_id
      INNER JOIN class_subject_teachers cst ON cst.class_id = t.class_id AND cst.subject_id = bs.subject_id
      WHERE cst.teacher_id = tp.id AND te.day_of_week = @day_of_week AND te.period_number = @period_number
        AND t.academic_year_id = @academic_year_id AND t.status = 'published')
  AND NOT EXISTS (
      SELECT 1 FROM teacher_leave_relief r
      INNER JOIN teacher_leave_requests lr ON lr.id = r.leave_request_id
      WHERE r.relief_teacher_id = tp.id AND r.date = @date AND r.period_number = @period_number
        AND lr.status IN ('pending', 'approved'))
  AND NOT EXISTS (
      SELECT 1 FROM teacher_leave_requests lr
      WHERE lr.teacher_id = tp.id AND lr.status IN ('pending', 'approved')
        AND lr.leave_type <> 'short' AND lr.day_part = 'full'
        AND @date BETWEEN lr.start_date AND lr.end_date)
ORDER BY relief_periods, full_name, tp.id;

-- name: ListLeaveBalances :many
-- approved days per type for every active teacher in a leave year
SELECT
    tp.id AS teacher_id, display_name(tp.full_name, tp.name_with_initials)::text AS teacher_name, tp.employee_number,
    COALESCE(SUM(lr.days) FILTER (WHERE lr.leave_type = 'casual'), 0)::float8 AS casual_days,
    COALESCE(SUM(lr.days) FILTER (WHERE lr.leave_type = 'sick'), 0)::float8 AS sick_days,
    COALESCE(SUM(lr.days) FILTER (WHERE lr.leave_type = 'duty'), 0)::float8 AS duty_days,
    COALESCE(SUM(lr.days) FILTER (WHERE lr.leave_type = 'maternity'), 0)::float8 AS maternity_days,
    COALESCE(SUM(lr.days) FILTER (WHERE lr.leave_type = 'no_pay'), 0)::float8 AS no_pay_days,
    COUNT(lr.id) FILTER (WHERE lr.leave_type = 'short') AS short_count,
    COUNT(*) OVER () AS total
FROM teacher_profiles tp
LEFT JOIN teacher_leave_requests lr
    ON lr.teacher_id = tp.id AND lr.status = 'approved' AND EXTRACT(YEAR FROM lr.start_date) = @year::int
WHERE tp.employment_status = 'active'
  AND (sqlc.narg(search)::text IS NULL OR tp.full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR tp.name_with_initials ILIKE '%' || sqlc.narg(search)::text || '%' OR tp.employee_number ILIKE '%' || sqlc.narg(search)::text || '%')
GROUP BY tp.id
ORDER BY tp.full_name, tp.id
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListReliefForDate :many
-- the day's relief sheet: every period someone on leave misses, and who covers it
SELECT
    r.id, r.period_number, lr.id AS leave_request_id, lr.status AS leave_status, lr.leave_type,
    display_name(tp.full_name, tp.name_with_initials)::text AS absent_teacher_name,
    r.class_id, (g.name || ' ' || c.name)::text AS class_name, COALESCE(s.name, '')::text AS subject_name,
    r.relief_teacher_id, COALESCE(display_name(rt.full_name, rt.name_with_initials), '')::text AS relief_teacher_name
FROM teacher_leave_relief r
INNER JOIN teacher_leave_requests lr ON lr.id = r.leave_request_id
INNER JOIN teacher_profiles tp ON tp.id = lr.teacher_id
INNER JOIN classes c ON c.id = r.class_id
INNER JOIN grades g ON g.id = c.grade_id
LEFT JOIN subjects s ON s.id = r.subject_id
LEFT JOIN teacher_profiles rt ON rt.id = r.relief_teacher_id
WHERE r.date = @date AND lr.status IN ('pending', 'approved')
ORDER BY r.period_number, class_name;

-- name: ListMyReliefDuties :many
-- approved relief periods a teacher has been named for, from a date onward
SELECT
    r.id, r.date, r.period_number,
    display_name(tp.full_name, tp.name_with_initials)::text AS absent_teacher_name,
    (g.name || ' ' || c.name)::text AS class_name, COALESCE(s.name, '')::text AS subject_name
FROM teacher_leave_relief r
INNER JOIN teacher_leave_requests lr ON lr.id = r.leave_request_id
INNER JOIN teacher_profiles tp ON tp.id = lr.teacher_id
INNER JOIN classes c ON c.id = r.class_id
INNER JOIN grades g ON g.id = c.grade_id
LEFT JOIN subjects s ON s.id = r.subject_id
WHERE r.relief_teacher_id = @teacher_id AND r.date >= @from_date AND lr.status = 'approved'
ORDER BY r.date, r.period_number
LIMIT 100;

-- name: ListLeaveApproverUserIDs :many
-- the Principal and every Vice Principal, who receive new applications
SELECT DISTINCT tp.user_id
FROM teacher_positions p
INNER JOIN teacher_profiles tp ON tp.id = p.teacher_id
WHERE p.position IN ('principal', 'vice_principal') AND tp.id <> @exclude_teacher_id;

-- name: ListUserIDsForTeachers :many
SELECT user_id FROM teacher_profiles WHERE id = ANY(@teacher_ids::uuid[]);
