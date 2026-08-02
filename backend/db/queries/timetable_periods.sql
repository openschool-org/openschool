-- name: CreateTimetablePeriod :one
INSERT INTO timetable_periods (
    grade_section_id, sort_order, period_number, start_time, end_time, slot_type
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: ListTimetablePeriodsBySection :many
SELECT * FROM timetable_periods
WHERE grade_section_id = $1
ORDER BY sort_order ASC;

-- name: UpdateTimetablePeriod :one
UPDATE timetable_periods
SET start_time = $2, end_time = $3
WHERE id = $1
RETURNING *;

-- name: DeleteTimetablePeriodsBySection :exec
DELETE FROM timetable_periods
WHERE grade_section_id = $1;
