-- name: CreateClassroom :one
INSERT INTO classrooms (name, code, capacity)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetClassroomByID :one
SELECT * FROM classrooms
WHERE id = $1;

-- name: ListClassrooms :many
SELECT * FROM classrooms
ORDER BY name ASC;

-- name: UpdateClassroom :one
UPDATE classrooms
SET name = $2, code = $3, capacity = $4
WHERE id = $1
RETURNING *;

-- name: DeleteClassroom :execrows
DELETE FROM classrooms AS c
WHERE c.id = $1
AND c.id NOT IN (
    SELECT DISTINCT classroom_id FROM timetable_entries WHERE classroom_id IS NOT NULL
);
