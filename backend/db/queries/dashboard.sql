-- Phase 7 analytics dashboard — net-new aggregate queries against existing
-- (and Phase 6) tables. All scoped implicitly to the current academic year
-- / current term via the existing is_current single-row pattern, so the
-- handler layer doesn't need to accept year/term parameters.

-- name: DashboardStudentCountByGrade :many
SELECT g.name AS grade_name, COUNT(sp.id) AS student_count
FROM grades g
LEFT JOIN classes c ON c.grade_id = g.id
    AND c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
LEFT JOIN class_students cs ON cs.class_id = c.id
LEFT JOIN student_profiles sp ON sp.id = cs.student_id AND sp.enrollment_status = 'active'
GROUP BY g.id, g.name, g.sort_order
ORDER BY g.sort_order ASC;

-- name: DashboardStudentCountByClass :many
SELECT c.name AS class_name, g.name AS grade_name, COUNT(cs.student_id) AS student_count
FROM classes c
INNER JOIN grades g ON g.id = c.grade_id
LEFT JOIN class_students cs ON cs.class_id = c.id
WHERE c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
GROUP BY c.id, c.name, g.name, g.sort_order
ORDER BY g.sort_order ASC, c.name ASC;

-- name: DashboardStudentGenderDistribution :many
SELECT COALESCE(gender, 'unspecified') AS gender, COUNT(*) AS student_count
FROM student_profiles
WHERE enrollment_status = 'active'
GROUP BY gender;

-- name: DashboardStudentHouseDistribution :many
SELECT h.name AS house_name, h.color AS house_color, COUNT(sp.id) AS student_count
FROM houses h
LEFT JOIN student_profiles sp ON sp.house_id = h.id AND sp.enrollment_status = 'active'
GROUP BY h.id, h.name, h.color
ORDER BY h.name ASC;

-- name: DashboardStudentAttendanceTrend :many
-- % present per day over the last 14 days that have a session.
SELECT
    s.date,
    COUNT(*) FILTER (WHERE r.status = 'present') AS present_count,
    COUNT(*) AS total_count
FROM attendance_sessions s
INNER JOIN attendance_records r ON r.session_id = s.id
WHERE s.date >= (CURRENT_DATE - INTERVAL '14 days')
GROUP BY s.date
ORDER BY s.date ASC;

-- name: DashboardStaffCounts :one
SELECT
    (SELECT COUNT(*) FROM teacher_profiles WHERE employment_status = 'active') AS academic_staff_count,
    (SELECT COUNT(*) FROM non_academic_staff WHERE employment_status = 'active') AS non_academic_staff_count;

-- name: DashboardStaffAttendanceThisMonth :one
-- present/late/absent/leave totals across all staff (teachers + non-academic)
-- for the current calendar month.
SELECT
    COUNT(*) FILTER (WHERE status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE status = 'late')    AS late_count,
    COUNT(*) FILTER (WHERE status = 'absent')  AS absent_count,
    COUNT(*) FILTER (WHERE status = 'leave')   AS leave_count
FROM staff_attendance_records
WHERE date >= date_trunc('month', CURRENT_DATE)
  AND date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';

-- name: DashboardSubjectPerformance :many
-- average mark % per subject for the current term.
SELECT
    s.name AS subject_name,
    ROUND(AVG(tm.marks / tm.max_marks * 100), 1) AS average_percentage,
    COUNT(*) AS entries
FROM term_marks tm
INNER JOIN subjects s ON s.id = tm.subject_id
INNER JOIN terms t ON t.id = tm.term_id AND t.is_current = TRUE
GROUP BY s.id, s.name
ORDER BY s.name ASC;

-- name: DashboardExaminationSummary :one
SELECT
    ROUND(AVG(tm.marks / tm.max_marks * 100), 1) AS average_percentage,
    COUNT(*) AS entries,
    COUNT(DISTINCT tm.student_id) AS students_with_marks
FROM term_marks tm
INNER JOIN terms t ON t.id = tm.term_id AND t.is_current = TRUE;

-- name: DashboardGradeWisePerformance :many
SELECT
    g.name AS grade_name,
    ROUND(AVG(tm.marks / tm.max_marks * 100), 1) AS average_percentage
FROM term_marks tm
INNER JOIN terms t ON t.id = tm.term_id AND t.is_current = TRUE
INNER JOIN student_profiles sp ON sp.id = tm.student_id
INNER JOIN class_students cs ON cs.student_id = sp.id
INNER JOIN classes c ON c.id = cs.class_id
    AND c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
INNER JOIN grades g ON g.id = c.grade_id
GROUP BY g.id, g.name, g.sort_order
ORDER BY g.sort_order ASC;

-- name: DashboardClassWisePerformance :many
SELECT
    c.name AS class_name,
    g.name AS grade_name,
    ROUND(AVG(tm.marks / tm.max_marks * 100), 1) AS average_percentage
FROM term_marks tm
INNER JOIN terms t ON t.id = tm.term_id AND t.is_current = TRUE
INNER JOIN student_profiles sp ON sp.id = tm.student_id
INNER JOIN class_students cs ON cs.student_id = sp.id
INNER JOIN classes c ON c.id = cs.class_id
    AND c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
INNER JOIN grades g ON g.id = c.grade_id
GROUP BY c.id, c.name, g.name, g.sort_order
ORDER BY g.sort_order ASC, c.name ASC;

-- name: DashboardAttendancePercentage :one
SELECT
    COUNT(*) FILTER (WHERE r.status = 'present') AS present_count,
    COUNT(*) AS total_count
FROM attendance_sessions s
INNER JOIN attendance_records r ON r.session_id = s.id
WHERE s.date >= (SELECT start_date FROM academic_years WHERE is_current = TRUE LIMIT 1);

-- name: DashboardStudentGrowth :many
-- distinct actively-enrolled students per academic year, most recent last.
SELECT ay.label AS academic_year_label, ay.start_date, COUNT(DISTINCT cs.student_id) AS student_count
FROM academic_years ay
LEFT JOIN classes c ON c.academic_year_id = ay.id
LEFT JOIN class_students cs ON cs.class_id = c.id
GROUP BY ay.id, ay.label, ay.start_date
ORDER BY ay.start_date ASC;

-- name: DashboardStaffGrowth :many
-- teacher headcount bucketed by the calendar year they joined.
SELECT EXTRACT(YEAR FROM joined_date)::int AS year, COUNT(*) AS teacher_count
FROM teacher_profiles
GROUP BY EXTRACT(YEAR FROM joined_date)
ORDER BY year ASC;

-- name: DashboardNotificationsSentCount :one
SELECT COUNT(*) AS sent_count
FROM notifications
WHERE status = 'sent';

-- name: DashboardTimetableCompletion :one
SELECT
    COUNT(DISTINCT c.id) AS total_classes,
    COUNT(DISTINCT t.class_id) AS published_classes
FROM classes c
LEFT JOIN timetables t ON t.class_id = c.id AND t.status = 'published'
    AND t.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
WHERE c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1);
