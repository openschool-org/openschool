-- name: CreateHouse :one
INSERT INTO houses (name, code, remainder)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetHouseByID :one
SELECT * FROM houses
WHERE id = $1;

-- name: ListHouses :many
SELECT * FROM houses
ORDER BY remainder ASC, name ASC;

-- name: UpdateHouse :one
UPDATE houses
SET
    name      = $2,
    code      = $3,
    remainder = $4
WHERE id = $1
RETURNING *;

-- name: DeleteHouse :execrows
DELETE FROM houses AS h
WHERE h.id = $1
AND h.id NOT IN (
    SELECT DISTINCT house_id FROM student_profiles WHERE house_id IS NOT NULL
);

-- name: ListStudentsMissingHouse :many
SELECT * FROM student_profiles
WHERE house_id IS NULL
ORDER BY index_number ASC;

-- name: UpdateStudentHouse :one
UPDATE student_profiles
SET
    house_id   = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: BulkUpdateStudentHouses :exec
-- Assigns each student_ids[i] to house_ids[i] in a single statement, for
-- ReassignMissing — avoids one UPDATE round-trip per student when
-- reassigning houses for an entire cohort at once.
UPDATE student_profiles AS sp
SET
    house_id   = data.house_id,
    updated_at = NOW()
FROM (
    SELECT
        unnest(sqlc.arg(student_ids)::uuid[]) AS student_id,
        unnest(sqlc.arg(house_ids)::uuid[])   AS house_id
) AS data
WHERE sp.id = data.student_id;
