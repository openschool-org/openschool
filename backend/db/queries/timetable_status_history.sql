-- name: CreateTimetableStatusHistory :one
INSERT INTO timetable_status_history (timetable_id, from_status, to_status, changed_by, comment)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListTimetableStatusHistory :many
SELECT
    h.*,
    u.full_name AS changed_by_name
FROM timetable_status_history h
INNER JOIN users u ON u.id = h.changed_by
WHERE h.timetable_id = $1
ORDER BY h.changed_at ASC;
