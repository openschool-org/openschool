-- name: CreateTerm :one
INSERT INTO terms (
    academic_year_id,
    name,
    start_date,
    end_date,
    sort_order
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetTermByID :one
SELECT * FROM terms
WHERE id = $1;

-- name: ListTermsByAcademicYear :many
SELECT * FROM terms
WHERE academic_year_id = $1
ORDER BY sort_order ASC;

-- name: GetCurrentTerm :one
SELECT * FROM terms
WHERE is_current = TRUE
LIMIT 1;

-- name: SetCurrentTerm :exec
UPDATE terms
SET is_current = (id = $1)
WHERE id = $1 OR is_current = true;

-- name: UpdateTerm :one
UPDATE terms
SET
    name       = $2,
    start_date = $3,
    end_date   = $4,
    sort_order = $5
WHERE id = $1
RETURNING *;

-- name: DeleteTerm :execrows
DELETE FROM terms AS t
WHERE t.id = $1
AND t.id NOT IN (
    SELECT DISTINCT term_id FROM term_marks
);
