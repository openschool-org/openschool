-- Phase 9.3 — the deepened role-differentiated dashboard's "School/Grades
-- Overview" panel for Principal/Vice Principal/Section Head. Both queries
-- filter by grade at the SQL WHERE clause level (never fetched-then-
-- filtered in application code) so a grade-scoped caller can never receive
-- counts for a grade outside their scope — the same class of bug §0.1
-- flagged for the cross-school attendance dashboard.

-- name: LeadershipOverviewCounts :one
-- grade_ids narrows to specific grades; NULL means whole school.
WITH scoped_classes AS (
    SELECT c.id
    FROM classes c
    WHERE c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
      AND (sqlc.narg(grade_ids)::uuid[] IS NULL OR c.grade_id = ANY(sqlc.narg(grade_ids)::uuid[]))
)
SELECT
    (SELECT COUNT(*) FROM scoped_classes) AS class_count,
    (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id IN (SELECT id FROM scoped_classes)) AS student_count,
    (SELECT COUNT(DISTINCT ats.class_id) FROM attendance_sessions ats
        WHERE ats.class_id IN (SELECT id FROM scoped_classes) AND ats.date = CURRENT_DATE) AS sessions_marked_today;

-- name: LeadershipOverviewGradeNames :many
-- Human-readable grade names for a grade-scoped caller's panel heading.
SELECT DISTINCT g.name
FROM grades g
WHERE g.id = ANY($1::uuid[])
ORDER BY g.name ASC;
