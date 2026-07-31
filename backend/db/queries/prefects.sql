-- name: UpsertPrefect :one
INSERT INTO prefects (academic_year_id, student_id, rank)
VALUES ($1, $2, $3)
ON CONFLICT (academic_year_id, student_id)
DO UPDATE SET rank = EXCLUDED.rank
RETURNING *;

-- name: ListPrefectsByYear :many
SELECT
    p.id,
    p.academic_year_id,
    p.student_id,
    p.rank,
    p.created_at,
    sp.full_name    AS student_name,
    sp.index_number AS student_index,
    g.name          AS grade_name
FROM prefects p
INNER JOIN student_profiles sp ON sp.id = p.student_id
LEFT JOIN  class_students cs   ON cs.student_id = sp.id
LEFT JOIN  classes c           ON c.id = cs.class_id AND c.academic_year_id = p.academic_year_id
LEFT JOIN  grades g            ON g.id = c.grade_id
WHERE p.academic_year_id = $1
ORDER BY
    CASE p.rank
        WHEN 'head' THEN 1
        WHEN 'deputy_head' THEN 2
        WHEN 'senior' THEN 3
        WHEN 'junior' THEN 4
    END,
    sp.full_name ASC;

-- name: DeletePrefect :execrows
DELETE FROM prefects WHERE id = $1;
