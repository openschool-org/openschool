-- name: UpsertTermMark :one
INSERT INTO term_marks (
    student_id,
    subject_id,
    term_id,
    marks,
    max_marks,
    is_absent,
    entered_by
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
ON CONFLICT (student_id, subject_id, term_id)
DO UPDATE SET
    marks      = EXCLUDED.marks,
    max_marks  = EXCLUDED.max_marks,
    is_absent  = EXCLUDED.is_absent,
    entered_by = EXCLUDED.entered_by,
    updated_at = NOW()
RETURNING *;

-- name: ListClassMarksForTermSubject :many
-- Every student in the class, with their mark for this term+subject if one
-- has been entered yet (NULL columns otherwise) — powers the marks-entry
-- grid, which needs to show blanks for students not yet marked.
SELECT
    sp.id          AS student_id,
    display_name(sp.full_name, sp.name_with_initials)::text AS student_name,
    sp.index_number,
    tm.id          AS term_mark_id,
    tm.marks,
    tm.max_marks,
    tm.is_absent
FROM student_profiles sp
INNER JOIN class_students cs ON cs.student_id = sp.id
LEFT JOIN term_marks tm
    ON tm.student_id = sp.id
   AND tm.term_id = $2
   AND tm.subject_id = $3
WHERE cs.class_id = $1
ORDER BY sp.full_name ASC;

-- name: ListStudentMarksByTerm :many
-- teacher_id/teacher_name are NULL if the student's current-year class has
-- no assigned teacher for that subject (or the student has no current class)
SELECT
    tm.id,
    tm.marks,
    tm.max_marks,
    tm.is_absent,
    s.id         AS subject_id,
    s.name       AS subject_name,
    s.code       AS subject_code,
    tp.id        AS teacher_id,
    COALESCE(display_name(tp.full_name, tp.name_with_initials), '')::text AS teacher_name
FROM term_marks tm
INNER JOIN subjects s ON s.id = tm.subject_id
INNER JOIN terms t ON t.id = tm.term_id
-- The class from the term's own year, so other years' classes add no extra rows.
LEFT JOIN class_students cs
    ON cs.student_id = tm.student_id AND cs.academic_year_id = t.academic_year_id
LEFT JOIN classes c
    ON c.id = cs.class_id
LEFT JOIN class_subject_teachers cst
    ON cst.class_id = c.id AND cst.subject_id = tm.subject_id
LEFT JOIN teacher_profiles tp ON tp.id = cst.teacher_id
WHERE tm.student_id = $1
  AND tm.term_id = $2
ORDER BY s.name ASC;

-- name: GetTermMarkByID :one
SELECT * FROM term_marks
WHERE id = $1;

-- name: DeleteTermMark :exec
DELETE FROM term_marks
WHERE id = $1;

-- name: TermInClassYear :one
-- True when the term belongs to the class's academic year, so marks cannot be
-- written into another year's term (S4).
SELECT EXISTS (
    SELECT 1
    FROM terms t
    INNER JOIN classes c ON c.academic_year_id = t.academic_year_id
    WHERE t.id = sqlc.arg(term_id) AND c.id = sqlc.arg(class_id)
) AS ok;

-- name: ListStudentMarkHistory :many
-- Every term of every year the student had a class, with each mark in it.
-- Mark columns are NULL for a term with no marks yet, so the term still shows.
SELECT
    ay.id         AS academic_year_id,
    ay.label      AS academic_year,
    ay.is_current AS year_is_current,
    c.name        AS class_name,
    g.name        AS grade_name,
    t.id          AS term_id,
    t.name        AS term_name,
    t.start_date  AS term_start,
    t.end_date    AS term_end,
    t.is_current  AS term_is_current,
    tm.id         AS mark_id,
    tm.marks,
    tm.max_marks,
    tm.is_absent,
    s.id          AS subject_id,
    s.name        AS subject_name,
    s.code        AS subject_code,
    COALESCE(display_name(tp.full_name, tp.name_with_initials), '')::text AS teacher_name
FROM class_students cs
INNER JOIN classes c         ON c.id = cs.class_id
INNER JOIN grades g          ON g.id = c.grade_id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id
INNER JOIN terms t           ON t.academic_year_id = ay.id
LEFT JOIN term_marks tm      ON tm.student_id = cs.student_id AND tm.term_id = t.id
LEFT JOIN subjects s         ON s.id = tm.subject_id
LEFT JOIN class_subject_teachers cst ON cst.class_id = c.id AND cst.subject_id = tm.subject_id
LEFT JOIN teacher_profiles tp ON tp.id = cst.teacher_id
WHERE cs.student_id = $1
ORDER BY ay.start_date DESC, t.sort_order ASC, t.start_date ASC, s.code ASC;
