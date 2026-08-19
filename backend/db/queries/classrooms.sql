-- name: CreateClassroom :one
INSERT INTO classrooms (name, code, capacity, room_type, subject_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetClassroomByID :one
SELECT * FROM classrooms
WHERE id = $1;

-- name: ListClassrooms :many
SELECT
    cr.*,
    s.name AS subject_name
FROM classrooms cr
LEFT JOIN subjects s ON s.id = cr.subject_id
ORDER BY cr.name ASC;

-- name: ListClassroomsBySubject :many
-- free-standing lab rooms tagged to a subject — the auto-generator's pool
-- of candidate rooms for that subject's lab periods
SELECT * FROM classrooms
WHERE room_type = 'lab' AND subject_id = $1
ORDER BY name ASC;

-- name: UpdateClassroom :one
UPDATE classrooms
SET name = $2, code = $3, capacity = $4, room_type = $5, subject_id = $6
WHERE id = $1
RETURNING *;

-- name: DeleteClassroom :execrows
DELETE FROM classrooms AS c
WHERE c.id = $1
AND c.id NOT IN (
    SELECT DISTINCT classroom_id FROM timetable_entries WHERE classroom_id IS NOT NULL
);
