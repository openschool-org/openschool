-- name: UpsertTermMark :one
INSERT INTO term_marks (
    student_id,
    subject_id,
    term_id,
    marks,
    max_marks,
    entered_by
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (student_id, subject_id, term_id)
DO UPDATE SET
    marks      = EXCLUDED.marks,
    max_marks  = EXCLUDED.max_marks,
    entered_by = EXCLUDED.entered_by,
    updated_at = NOW()
RETURNING *;

-- name: ListClassMarksForTermSubject :many
-- Every student in the class, with their mark for this term+subject if one
-- has been entered yet (NULL columns otherwise) — powers the marks-entry
-- grid, which needs to show blanks for students not yet marked.
SELECT
    sp.id          AS student_id,
    sp.full_name   AS student_name,
    sp.index_number,
    tm.id          AS term_mark_id,
    tm.marks,
    tm.max_marks
FROM student_profiles sp
INNER JOIN class_students cs ON cs.student_id = sp.id
LEFT JOIN term_marks tm
    ON tm.student_id = sp.id
   AND tm.term_id = $2
   AND tm.subject_id = $3
WHERE cs.class_id = $1
ORDER BY sp.full_name ASC;

-- name: ListStudentMarksByTerm :many
SELECT
    tm.id,
    tm.marks,
    tm.max_marks,
    s.id   AS subject_id,
    s.name AS subject_name,
    s.code AS subject_code
FROM term_marks tm
INNER JOIN subjects s ON s.id = tm.subject_id
WHERE tm.student_id = $1
  AND tm.term_id = $2
ORDER BY s.name ASC;

-- name: DeleteTermMark :exec
DELETE FROM term_marks
WHERE id = $1;
