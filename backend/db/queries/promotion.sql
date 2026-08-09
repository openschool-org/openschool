-- name: GetNextGrade :one
-- the grade with the smallest sort_order greater than the given grade's;
-- pgx.ErrNoRows means the given grade is the top grade (no promotion target
-- — the student is graduating, not being promoted to a new class).
SELECT g2.*
FROM grades g1
INNER JOIN grades g2 ON g2.sort_order > g1.sort_order
WHERE g1.id = $1
ORDER BY g2.sort_order ASC
LIMIT 1;

-- name: ListActiveStudentsForYear :many
-- every actively-enrolled student's current class/grade for an academic
-- year — the source list for a promotion/reassignment preview.
SELECT
    sp.id           AS student_id,
    sp.full_name    AS student_name,
    sp.index_number AS student_index,
    c.id            AS class_id,
    c.name          AS class_name,
    c.medium_id     AS medium_id,
    m.name          AS medium_name,
    g.id            AS grade_id,
    g.name          AS grade_name,
    g.sort_order    AS grade_sort_order
FROM class_students cs
INNER JOIN student_profiles sp ON sp.id = cs.student_id
INNER JOIN classes c           ON c.id = cs.class_id
INNER JOIN grades g            ON g.id = c.grade_id
LEFT JOIN  mediums m           ON m.id = c.medium_id
WHERE cs.academic_year_id = $1
  AND sp.enrollment_status = 'active'
ORDER BY g.sort_order ASC, c.name ASC, sp.full_name ASC;

-- name: FindClassByGradeAndName :one
-- same-name carryover suggestion (e.g. "6A" -> "7A"); ErrNoRows means no
-- suggestion, the frontend leaves the target class blank for a manual pick.
SELECT * FROM classes
WHERE grade_id = $1 AND academic_year_id = $2 AND name = $3;

-- name: FindClassByGradeAndMedium :one
-- same-medium carryover for a medium-locked class: a student in the English
-- section of grade 6 should land in the English section of grade 7 regardless
-- of what the sections are named. Ordered by name so a grade with more than
-- one section in the same medium resolves deterministically to the first.
SELECT * FROM classes
WHERE grade_id = $1 AND academic_year_id = $2 AND medium_id = $3
ORDER BY name ASC
LIMIT 1;

-- name: ListStudentTotalMarksForTerm :many
-- per-student total marks for one term, across every subject they have a
-- mark for — a manual-distribution sort aid, not an auto-ranking algorithm.
-- cast to float8 rather than leaving as numeric — sqlc's static analyzer
-- (no live DB connection) mis-infers a bare SUM(numeric) as int64, which
-- would silently truncate marks with a fractional part.
SELECT
    student_id,
    SUM(marks)::float8     AS total_marks,
    SUM(max_marks)::float8 AS total_max_marks
FROM term_marks
WHERE term_id = $1 AND student_id = ANY(sqlc.arg(student_ids)::uuid[])
GROUP BY student_id;

-- name: CountClassesInYearByIDs :one
-- validates that every target class ID a commit request references
-- actually belongs to the target academic year, before writing anything.
SELECT COUNT(*) FROM classes
WHERE academic_year_id = $1 AND id = ANY(sqlc.arg(class_ids)::uuid[]);

-- name: BulkDeleteClassStudentsForYear :exec
-- clears any existing enrollment (in any class) for these students in this
-- academic year, so BulkInsertClassStudents can freely (re)assign them —
-- safe to re-run, since promotion is a preview-then-commit workflow.
DELETE FROM class_students
WHERE academic_year_id = $1 AND student_id = ANY(sqlc.arg(student_ids)::uuid[]);

-- name: BulkInsertClassStudents :exec
-- the first batched UNNEST-based bulk write in the codebase — one
-- round-trip for the whole assignment set instead of a per-student loop.
-- Paired via WITH ORDINALITY rather than the two-array UNNEST(a, b) form,
-- since sqlc's static analyzer doesn't resolve that overload.
INSERT INTO class_students (class_id, student_id)
SELECT c.class_id, s.student_id
FROM UNNEST(sqlc.arg(class_ids)::uuid[])   WITH ORDINALITY AS c(class_id, ord)
INNER JOIN UNNEST(sqlc.arg(student_ids)::uuid[]) WITH ORDINALITY AS s(student_id, ord) ON c.ord = s.ord;
