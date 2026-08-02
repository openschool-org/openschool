-- name: CreateTeacherAvailability :one
INSERT INTO teacher_availability (teacher_id, academic_year_id, day_of_week, period_number)
VALUES ($1, $2, $3, $4)
ON CONFLICT (teacher_id, academic_year_id, day_of_week, period_number) DO NOTHING
RETURNING *;

-- name: ListTeacherAvailabilityByTeacherYear :many
SELECT * FROM teacher_availability
WHERE teacher_id = $1 AND academic_year_id = $2
ORDER BY day_of_week ASC, period_number ASC;

-- name: DeleteTeacherAvailability :exec
DELETE FROM teacher_availability
WHERE id = $1;

-- name: IsTeacherUnavailable :one
SELECT EXISTS (
    SELECT 1 FROM teacher_availability
    WHERE teacher_id = $1 AND academic_year_id = $2 AND day_of_week = $3 AND period_number = $4
) AS unavailable;
