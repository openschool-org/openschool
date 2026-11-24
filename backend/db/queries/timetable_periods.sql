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

-- name: ListTimetablePeriodsForClass :many
-- The bell schedule of the grade section the class's grade belongs to in the class's year.
SELECT tp.* FROM timetable_periods tp
INNER JOIN grade_section_grades gsg ON gsg.grade_section_id = tp.grade_section_id
INNER JOIN classes c ON c.grade_id = gsg.grade_id AND c.academic_year_id = gsg.academic_year_id
WHERE c.id = $1
ORDER BY tp.sort_order ASC;
