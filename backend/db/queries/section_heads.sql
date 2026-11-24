-- name: UpsertGradeSectionHead :one
-- Teacher-in-charge for a whole grade (grades without A/L streams).
INSERT INTO section_heads (academic_year_id, grade_id, stream_id, teacher_id)
VALUES ($1, $2, NULL, $3)
ON CONFLICT (academic_year_id, grade_id) WHERE stream_id IS NULL
DO UPDATE SET teacher_id = EXCLUDED.teacher_id
RETURNING *;

-- name: UpsertStreamSectionHead :one
-- Teacher-in-charge for one A/L stream within a grade.
INSERT INTO section_heads (academic_year_id, grade_id, stream_id, teacher_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (academic_year_id, grade_id, stream_id) WHERE stream_id IS NOT NULL
DO UPDATE SET teacher_id = EXCLUDED.teacher_id
RETURNING *;

-- name: ListSectionHeadsByYear :many
SELECT
    sh.id,
    sh.academic_year_id,
    sh.grade_id,
    sh.stream_id,
    sh.teacher_id,
    sh.created_at,
    g.name        AS grade_name,
    s.name        AS stream_name,
    COALESCE(NULLIF(tp.name_with_initials, ''), tp.full_name)  AS teacher_name
FROM section_heads sh
INNER JOIN grades           g  ON g.id = sh.grade_id
LEFT JOIN  streams          s  ON s.id = sh.stream_id
INNER JOIN teacher_profiles tp ON tp.id = sh.teacher_id
WHERE sh.academic_year_id = $1
ORDER BY g.sort_order ASC, s.name ASC NULLS FIRST;

-- name: DeleteSectionHead :execrows
DELETE FROM section_heads WHERE id = $1;

-- name: GetGradeTICForGrade :one
-- the whole-grade TIC (stream_id IS NULL), if any, used for timetable review authorization
SELECT teacher_id FROM section_heads
WHERE academic_year_id = $1 AND grade_id = $2 AND stream_id IS NULL;

-- name: ListLeadersOfClass :many
-- Who leads a class: the whole-grade head, the head of the class's stream in
-- that grade, and the head of the grade section the grade belongs to. They
-- review its timetable and may message it.
SELECT sh.teacher_id FROM classes c
INNER JOIN section_heads sh
    ON sh.academic_year_id = c.academic_year_id AND sh.grade_id = c.grade_id
   AND (sh.stream_id IS NULL OR sh.stream_id = c.stream_id)
WHERE c.id = $1
UNION
SELECT gs.section_head_teacher_id::uuid FROM classes c
INNER JOIN grade_section_grades gsg ON gsg.grade_id = c.grade_id AND gsg.academic_year_id = c.academic_year_id
INNER JOIN grade_sections gs        ON gs.id = gsg.grade_section_id
WHERE c.id = $1 AND gs.section_head_teacher_id IS NOT NULL;

-- name: ListGradeIDsLedByTeacher :many
-- Grades a teacher leads in a year: as a whole-grade or stream head, or as the
-- head of a grade section. Any row makes them a Section Head.
SELECT sh.grade_id FROM section_heads sh
WHERE sh.teacher_id = sqlc.arg(teacher_id) AND sh.academic_year_id = sqlc.arg(academic_year_id)
UNION
SELECT gsg.grade_id FROM grade_sections gs
INNER JOIN grade_section_grades gsg ON gsg.grade_section_id = gs.id
WHERE gs.section_head_teacher_id = sqlc.arg(teacher_id)::uuid AND gs.academic_year_id = sqlc.arg(academic_year_id);

-- name: ListClassIDsLedByTeacher :many
-- The classes a section head leads in a year (same rule as ListLeadersOfClass).
SELECT c.id FROM classes c
WHERE c.academic_year_id = sqlc.arg(academic_year_id)
  AND (
      EXISTS (
          SELECT 1 FROM section_heads sh
          WHERE sh.teacher_id = sqlc.arg(teacher_id) AND sh.academic_year_id = c.academic_year_id
            AND sh.grade_id = c.grade_id AND (sh.stream_id IS NULL OR sh.stream_id = c.stream_id)
      )
      OR EXISTS (
          SELECT 1 FROM grade_section_grades gsg
          INNER JOIN grade_sections gs ON gs.id = gsg.grade_section_id
          WHERE gsg.grade_id = c.grade_id AND gsg.academic_year_id = c.academic_year_id
            AND gs.section_head_teacher_id = sqlc.arg(teacher_id)::uuid
      )
  );

-- name: ListClassIDsInGrades :many
-- Every class of the given grades in a year, for a grade-scoped vice principal.
SELECT id FROM classes
WHERE academic_year_id = sqlc.arg(academic_year_id) AND grade_id = ANY(sqlc.arg(grade_ids)::uuid[]);

-- name: ListClassSummariesForYear :many
-- Class name and grade for the given classes in a year; NULL ids means every class.
SELECT c.id, c.name, g.name AS grade_name
FROM classes c
INNER JOIN grades g ON g.id = c.grade_id
WHERE c.academic_year_id = sqlc.arg(academic_year_id)
  AND (sqlc.narg(class_ids)::uuid[] IS NULL OR c.id = ANY(sqlc.narg(class_ids)::uuid[]))
ORDER BY g.sort_order ASC, c.name ASC;
