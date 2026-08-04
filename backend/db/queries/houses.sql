-- name: CreateHouse :one
INSERT INTO houses (name, code, color)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetHouseByID :one
SELECT * FROM houses
WHERE id = $1;

-- name: ListHouses :many
SELECT * FROM houses
ORDER BY name ASC;

-- name: UpdateHouse :one
UPDATE houses
SET
    name  = $2,
    code  = $3,
    color = $4
WHERE id = $1
RETURNING *;

-- name: DeleteHouse :execrows
DELETE FROM houses AS h
WHERE h.id = $1
AND h.id NOT IN (
    SELECT DISTINCT house_id FROM student_profiles WHERE house_id IS NOT NULL
)
AND h.id NOT IN (
    SELECT DISTINCT house_id FROM teacher_profiles WHERE house_id IS NOT NULL
);

-- name: ListStudentsMissingHouse :many
SELECT * FROM student_profiles
WHERE house_id IS NULL
ORDER BY index_number ASC;

-- name: ListTeachersMissingHouse :many
SELECT * FROM teacher_profiles
WHERE house_id IS NULL
ORDER BY employee_number ASC;

-- name: UpdateStudentHouse :one
UPDATE student_profiles
SET
    house_id   = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateTeacherHouse :one
UPDATE teacher_profiles
SET
    house_id   = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: PickBalancedHouseForStudent :one
-- Picks whichever house currently has the fewest students, breaking ties
-- randomly. A newly-created house has zero members and so is naturally
-- preferred until it catches up — no manual remainder bookkeeping needed.
SELECT h.id FROM houses h
LEFT JOIN (
    SELECT house_id, COUNT(*) AS cnt
    FROM student_profiles
    WHERE house_id IS NOT NULL
    GROUP BY house_id
) c ON c.house_id = h.id
ORDER BY COALESCE(c.cnt, 0) ASC, RANDOM()
LIMIT 1;

-- name: PickBalancedHouseForTeacher :one
-- Same balancing logic as PickBalancedHouseForStudent, but against the
-- teacher_profiles pool — staff and students are balanced independently.
SELECT h.id FROM houses h
LEFT JOIN (
    SELECT house_id, COUNT(*) AS cnt
    FROM teacher_profiles
    WHERE house_id IS NOT NULL
    GROUP BY house_id
) c ON c.house_id = h.id
ORDER BY COALESCE(c.cnt, 0) ASC, RANDOM()
LIMIT 1;
