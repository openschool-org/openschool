-- Ad-hoc, read-mostly queries backing the § Proposed — maintenance/ops
-- agents in docs/plan.md (internal/jobs/*.go). Grouped in one file since
-- each is a one-off used by exactly one job, not a full entity's CRUD.

-- name: ListAdminUserIDs :many
-- used by internal/jobs to resolve who gets notified, and to attribute
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

-- ── Onboarding watchers (role-scoped) ────────────────────────────────────────

-- name: ListStaleMustChangePasswordUsersByRole :many
-- provisioned but never completed first login, past the given age, scoped
-- to one role — so the finding can be shown correctly on a role-specific
-- page (Teachers vs Students) instead of a mixed list.
SELECT id, full_name, email, role, created_at
FROM users
WHERE must_change_password = TRUE
AND role = sqlc.arg(role)
AND created_at < NOW() - make_interval(days => sqlc.arg(older_than_days)::int)
ORDER BY created_at;

-- ── Password reset token sweep ───────────────────────────────────────────────

-- name: DeleteExpiredPasswordResetTokens :execrows
DELETE FROM password_reset_tokens
WHERE used_at IS NULL AND expires_at < NOW();

-- ── Audit-log anomaly watcher ────────────────────────────────────────────────

-- name: ListBurstAuditActors :many
-- actors with an unusually high volume of audit-logged changes in the last
-- hour — the simplest defensible anomaly heuristic (a fixed threshold)
-- rather than a statistical model, per docs/plan.md's own note that this
-- one needs real heuristics to design.
SELECT al.actor_id, u.full_name, COUNT(*) AS change_count
FROM audit_logs al
INNER JOIN users u ON u.id = al.actor_id
WHERE al.created_at > NOW() - INTERVAL '1 hour'
AND al.actor_id IS NOT NULL
GROUP BY al.actor_id, u.full_name
HAVING COUNT(*) > sqlc.arg(threshold)::int
ORDER BY change_count DESC;
