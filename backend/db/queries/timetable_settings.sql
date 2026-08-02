-- name: UpsertTimetableSettings :one
INSERT INTO timetable_settings (
    academic_year_id, school_start_time, school_end_time, number_of_periods,
    period_duration_minutes, interval_duration_minutes
) VALUES (
    $1, $2, $3, $4, $5, $6
)
ON CONFLICT (academic_year_id) DO UPDATE
SET
    school_start_time         = EXCLUDED.school_start_time,
    school_end_time           = EXCLUDED.school_end_time,
    number_of_periods         = EXCLUDED.number_of_periods,
    period_duration_minutes   = EXCLUDED.period_duration_minutes,
    interval_duration_minutes = EXCLUDED.interval_duration_minutes,
    updated_at                = NOW()
RETURNING *;

-- name: GetTimetableSettingsByYear :one
SELECT * FROM timetable_settings
WHERE academic_year_id = $1;
