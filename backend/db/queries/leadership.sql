-- Phase 9.3 — the deepened role-differentiated dashboard's "School/Grades
-- Overview" panel for Principal/Vice Principal/Section Head. Both queries
-- filter by grade at the SQL WHERE clause level (never fetched-then-
-- filtered in application code) so a grade-scoped caller can never receive
-- counts for a grade outside their scope — the same class of bug §0.1
-- flagged for the cross-school attendance dashboard.

-- name: LeadershipOverviewCounts :one
-- class_ids narrows to the classes the caller leads; NULL means whole school.
WITH scoped_classes AS (
    SELECT c.id
    FROM classes c
    WHERE c.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
      AND (sqlc.narg(class_ids)::uuid[] IS NULL OR c.id = ANY(sqlc.narg(class_ids)::uuid[]))
)
SELECT
    (SELECT COUNT(*) FROM scoped_classes) AS class_count,
    (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id IN (SELECT id FROM scoped_classes)) AS student_count,
    (SELECT COUNT(DISTINCT ats.class_id) FROM attendance_sessions ats
        WHERE ats.class_id IN (SELECT id FROM scoped_classes) AND ats.date = CURRENT_DATE) AS sessions_marked_today;

-- name: LeadershipOverviewGradeNames :many
-- Panel heading for a scoped caller: each led grade, with the stream when they lead only part of it.
SELECT DISTINCT (g.name || COALESCE(' ' || st.name, ''))::text AS name
FROM classes c
INNER JOIN grades g   ON g.id = c.grade_id
LEFT JOIN streams st  ON st.id = c.stream_id
WHERE c.id = ANY($1::uuid[])
ORDER BY 1 ASC;
