-- Ad-hoc, read-mostly queries backing the background agents in
-- internal/modules/automation (five consolidated algorithms, each running
-- several checks concurrently in its own clearly named file). Grouped in
-- one file since each is a one-off used by exactly one check, not a full
-- entity's CRUD.

-- name: ListAdminUserIDs :many
-- used by the Automation module to resolve who gets notified, and to attribute
-- system-triggered notifications' created_by (NOT NULL FK to users).
SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC;

-- ── Current-academic-year invariant checker ─────────────────────────────────

-- name: ListCurrentAcademicYears :many
-- should always return exactly 1 row
-- (docs/adr/0003-single-current-academic-year.md); 0 or 2+ means the
-- app-level invariant has been violated. Listed (not just counted) so the
-- finding can name which years are wrongly marked current.
SELECT * FROM academic_years WHERE is_current = TRUE ORDER BY start_date;

-- ── Student gender / school-type watcher ────────────────────────────────────

-- name: ListGenderSchoolTypeMismatches :many
-- a single-sex school's own student roster drifting out of sync with
-- school.school_type (Phase 11 item 1) — e.g. the type was flipped after
-- students of the other gender were already enrolled.
SELECT sp.id, sp.full_name, sp.index_number
FROM student_profiles sp, school s
WHERE sp.enrollment_status = 'active'
AND (
    (s.school_type = 'boys'  AND sp.gender IS DISTINCT FROM 'male')
    OR (s.school_type = 'girls' AND sp.gender IS DISTINCT FROM 'female')
)
ORDER BY sp.full_name;

-- ── Unclassed student watcher ────────────────────────────────────────────────

-- name: ListActiveStudentsWithoutCurrentClass :many
-- an active student with no class_students row in the current academic
-- year's classes — the kind of gap promotion or manual enrollment edits
-- can silently leave behind.
SELECT sp.id, sp.full_name, sp.index_number
FROM student_profiles sp
INNER JOIN academic_years ay ON ay.is_current = TRUE
WHERE sp.enrollment_status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM class_students cs
    INNER JOIN classes c ON c.id = cs.class_id
    WHERE cs.student_id = sp.id AND c.academic_year_id = ay.id
)
ORDER BY sp.full_name;

-- ── Empty grade / stream watchers ────────────────────────────────────────────

-- name: ListGradesWithNoCurrentClasses :many
-- a grade defined in the curriculum with zero classes in the current
-- academic year — either never set up, or every class under it was deleted
-- without anyone noticing the grade itself was left dangling.
SELECT g.id, g.name
FROM grades g
WHERE NOT EXISTS (
    SELECT 1 FROM classes c
    INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
    WHERE c.grade_id = g.id
)
ORDER BY g.sort_order, g.name;

-- name: ListStreamsWithNoCurrentClasses :many
-- same gap, for A/L streams — defined but no Grade 12/13 class uses it this year.
SELECT s.id, s.name
FROM streams s
WHERE NOT EXISTS (
    SELECT 1 FROM classes c
    INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
    WHERE c.stream_id = s.id
)
ORDER BY s.name;

-- ── Zero-guardian student watcher ───────────────────────────────────────────

-- name: ListActiveStudentsWithoutGuardian :many
SELECT sp.id, sp.full_name, sp.index_number
FROM student_profiles sp
WHERE sp.enrollment_status = 'active'
AND NOT EXISTS (SELECT 1 FROM student_guardians sg WHERE sg.student_id = sp.id)
ORDER BY sp.full_name;

-- ── Employment-status consistency checker ───────────────────────────────────

-- name: ListInactiveTeachersStillAssigned :many
-- a resigned/transferred teacher still wired in as a form teacher or
-- subject teacher on a current-year class — attendance/marks/notifications
-- would still route to them.
SELECT DISTINCT tp.id, tp.full_name, tp.employment_status
FROM teacher_profiles tp
INNER JOIN academic_years ay ON ay.is_current = TRUE
WHERE tp.employment_status != 'active'
AND (
    EXISTS (SELECT 1 FROM classes c WHERE c.form_teacher_id = tp.id AND c.academic_year_id = ay.id)
    OR EXISTS (
        SELECT 1 FROM class_subject_teachers cst
        INNER JOIN classes c ON c.id = cst.class_id
        WHERE cst.teacher_id = tp.id AND c.academic_year_id = ay.id
    )
)
ORDER BY tp.full_name;

-- ── Missing attendance session watcher ───────────────────────────────────────

-- name: ListCurrentYearClassesMissingTodaySession :many
SELECT c.id, c.name, g.name AS grade_name
FROM classes c
INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
INNER JOIN grades g ON g.id = c.grade_id
WHERE NOT EXISTS (
    SELECT 1 FROM attendance_sessions s WHERE s.class_id = c.id AND s.date = CURRENT_DATE
)
ORDER BY g.name, c.name;

-- ── Term-marks deadline watcher ──────────────────────────────────────────────

-- name: ListTermsNearDeadlineWithNoMarks :many
-- terms ending within the given number of days (and not already past) with
-- zero term_marks rows entered anywhere — nobody has started marks entry
-- for a term that's about to lock.
SELECT t.id, t.name, t.end_date, ay.label AS academic_year_label
FROM terms t
INNER JOIN academic_years ay ON ay.id = t.academic_year_id
WHERE t.end_date >= CURRENT_DATE
AND t.end_date <= CURRENT_DATE + make_interval(days => sqlc.arg(within_days)::int)
AND NOT EXISTS (SELECT 1 FROM term_marks tm WHERE tm.term_id = t.id)
ORDER BY t.end_date;

-- name: ListOpenTermMarksProgress :many
-- Every term of the current academic year that hasn't ended yet, with how
-- many actively-enrolled students have at least one mark recorded for it
-- against how many are enrolled in total, plus the term's date span. The
-- caller (AcademicDeliveryAgent) turns this into a linear time-vs-coverage
-- pace comparison — "you're 40% through the term but only 10% of students
-- have any mark recorded" — catching a term that's quietly falling behind
-- long before ListTermsNearDeadlineWithNoMarks's all-or-nothing zero-marks
-- check would fire. Coverage is deliberately "at least one mark", not
-- "every subject marked" — an exact per-subject expectation would need a
-- students × subjects-taught cross join this system has no single source
-- for (subject selection is per-student for A/L buckets) — so this is a
-- breadth proxy, not a claim of exact completion percentage.
SELECT
    t.id,
    t.name,
    t.start_date,
    t.end_date,
    ay.label AS academic_year_label,
    (
        SELECT COUNT(DISTINCT cs.student_id)
        FROM class_students cs
        INNER JOIN classes c ON c.id = cs.class_id
        WHERE c.academic_year_id = t.academic_year_id
    ) AS enrolled_students,
    (
        SELECT COUNT(DISTINCT tm.student_id)
        FROM term_marks tm
        WHERE tm.term_id = t.id
    ) AS students_with_marks
FROM terms t
INNER JOIN academic_years ay ON ay.id = t.academic_year_id AND ay.is_current = TRUE
WHERE t.end_date >= CURRENT_DATE
ORDER BY t.end_date;

-- ── Stale/incomplete attendance session watcher ─────────────────────────────

-- name: ListStaleIncompleteSessions :many
-- a session created more than the given interval ago with fewer attendance
-- records than the class's roster size — a teacher started it and never
-- finished marking, indistinguishable from "not started" without this.
SELECT
    s.id,
    s.class_id,
    c.name AS class_name,
    s.date,
    s.created_at,
    (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id) AS record_count,
    (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = s.class_id) AS roster_size
FROM attendance_sessions s
INNER JOIN classes c ON c.id = s.class_id
WHERE s.created_at < NOW() - make_interval(hours => sqlc.arg(older_than_hours)::int)
AND (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id)
    < (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = s.class_id)
ORDER BY s.created_at;

-- name: ListClassAttendanceComplianceRecent :many
-- For each current-year class: how many distinct days had an attendance
-- session created in the trailing window versus how many weekdays fell in
-- that window (the system has no holiday calendar, so weekday count is
-- the best available "school days" proxy). AcademicDeliveryAgent turns
-- this into a compliance rate and flags classes whose attendance-taking
-- has been chronically inconsistent lately — a class that's usually fine
-- but simply missed today (already covered by
-- ListCurrentYearClassesMissingTodaySession) is not what this is for.
SELECT
    c.id,
    c.name,
    g.name AS grade_name,
    COUNT(DISTINCT s.date) AS sessions_taken,
    (
        SELECT COUNT(*)
        FROM generate_series(
            CURRENT_DATE - make_interval(days => sqlc.arg(window_days)::int),
            CURRENT_DATE - 1,
            INTERVAL '1 day'
        ) AS d
        WHERE EXTRACT(ISODOW FROM d) < 6
    ) AS school_days_in_window
FROM classes c
INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
INNER JOIN grades g ON g.id = c.grade_id
LEFT JOIN attendance_sessions s
    ON s.class_id = c.id
    AND s.date >= CURRENT_DATE - make_interval(days => sqlc.arg(window_days)::int)
    AND s.date < CURRENT_DATE
GROUP BY c.id, c.name, g.name
ORDER BY g.name, c.name;

-- ── Onboarding watchers (role-scoped) ────────────────────────────────────────

-- name: ListStaleMustChangePasswordUsersByRole :many
-- provisioned but never completed first login, past the given age, scoped
-- to one role — so the finding can be shown correctly on a role-specific
-- page (Teachers vs Students) instead of a mixed list. Also catches an
-- account that clicked "keep this password" and is still on the default
-- past its expiry window (S1) — kept_default_password alone doesn't force
-- must_change_password back to TRUE in the database, only in the /me
-- response, so this check has to test both.
SELECT id, full_name, email, role, created_at
FROM users
WHERE (
    must_change_password = TRUE
    OR (kept_default_password = TRUE AND created_at < NOW() - INTERVAL '7 days')
)
AND role = sqlc.arg(role)
AND created_at < NOW() - make_interval(days => sqlc.arg(older_than_days)::int)
ORDER BY created_at;

-- ── Password reset token sweep ───────────────────────────────────────────────

-- name: DeleteExpiredPasswordResetTokens :execrows
DELETE FROM password_reset_tokens
WHERE used_at IS NULL AND expires_at < NOW();

-- ── Audit-log anomaly watcher ────────────────────────────────────────────────
-- Replaces a single fixed threshold with a per-actor statistical baseline:
-- SecurityAuditAgent computes each active actor's mean and standard
-- deviation of per-hour change volume from ListAuditActivityBaseline, then
-- flags the current hour (ListCurrentHourAuditActivity) as an outlier via a
-- z-score against that actor's *own* normal pattern — an admin who
-- routinely bulk-edits won't trip the same threshold as one who never
-- touches more than a few records a day. An actor with too little history
-- for a meaningful baseline falls back to a fixed absolute floor (computed
-- in Go), never to "never flagged".

-- name: ListAuditActivityBaseline :many
-- Per-actor mean/stddev of hourly audit-log volume over the trailing
-- baseline window, counting only hours in which the actor was active at
-- all (an idle hour isn't "zero activity" in this average — it's excluded
-- entirely), plus how many such hours were observed so the caller can
-- decide whether the baseline has enough data to trust.
SELECT
    hourly.actor_id,
    u.full_name,
    AVG(hourly.cnt)::float8 AS mean_per_hour,
    COALESCE(STDDEV_POP(hourly.cnt), 0)::float8 AS stddev_per_hour,
    COUNT(*) AS hours_observed
FROM (
    SELECT actor_id, date_trunc('hour', created_at) AS hour_bucket, COUNT(*) AS cnt
    FROM audit_logs
    WHERE actor_id IS NOT NULL
    AND created_at >= NOW() - make_interval(days => sqlc.arg(baseline_days)::int)
    AND created_at < date_trunc('hour', NOW())
    GROUP BY actor_id, date_trunc('hour', created_at)
) hourly
INNER JOIN users u ON u.id = hourly.actor_id
GROUP BY hourly.actor_id, u.full_name;

-- name: ListCurrentHourAuditActivity :many
-- Every actor's change count so far in the current (partial) hour — the
-- sample SecurityAuditAgent scores against each actor's baseline.
SELECT al.actor_id, u.full_name, COUNT(*) AS change_count
FROM audit_logs al
INNER JOIN users u ON u.id = al.actor_id
WHERE al.actor_id IS NOT NULL
AND al.created_at >= date_trunc('hour', NOW())
GROUP BY al.actor_id, u.full_name;

-- name: ListOffHoursAuditActivity :many
-- Actors with audit-logged changes in the trailing 24 hours between
-- midnight and 5am Sri Lanka time (Asia/Colombo, fixed UTC+5:30, no DST —
-- converted explicitly so this is correct regardless of the database
-- server's own configured timezone) — a low-cost complementary signal to
-- the volume-based check above: a handful of overnight changes is unusual
-- for a school system regardless of whether it clears any volume
-- threshold. Sri-Lanka-specific per this system's single-deployment scope
-- (docs/adr/0003-single-current-academic-year.md).
SELECT al.actor_id, u.full_name, COUNT(*) AS change_count,
       MIN(al.created_at)::timestamptz AS first_seen, MAX(al.created_at)::timestamptz AS last_seen
FROM audit_logs al
INNER JOIN users u ON u.id = al.actor_id
WHERE al.actor_id IS NOT NULL
AND al.created_at >= NOW() - INTERVAL '24 hours'
AND EXTRACT(HOUR FROM (al.created_at AT TIME ZONE 'Asia/Colombo')) BETWEEN 0 AND 4
GROUP BY al.actor_id, u.full_name
HAVING COUNT(*) >= sqlc.arg(min_changes)::int
ORDER BY change_count DESC;

-- name: ListUnreadFindingsByTitle :many
-- Latest unread, unarchived agent notice per title for one admin; drives the page banners.
SELECT DISTINCT ON (n.title) n.id AS notification_id, n.title, n.message, n.sent_at
FROM notification_recipients nr
JOIN notifications n ON n.id = nr.notification_id
WHERE nr.user_id = $1 AND NOT nr.is_read AND NOT nr.is_archived AND n.title = ANY(sqlc.arg(titles)::text[])
ORDER BY n.title, n.sent_at DESC;
