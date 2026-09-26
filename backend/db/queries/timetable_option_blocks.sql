-- name: ListOptionBlocksForClasses :many
-- every option block that includes at least one of these classes
SELECT DISTINCT b.id, b.grade_id, b.name, b.periods_per_week
FROM timetable_option_blocks b
INNER JOIN timetable_option_block_classes bc ON bc.block_id = b.id
WHERE bc.class_id = ANY(sqlc.arg(class_ids)::uuid[])
ORDER BY b.name, b.id;

-- name: ListOptionBlocksForYear :many
SELECT id, grade_id, name, periods_per_week FROM timetable_option_blocks
WHERE academic_year_id = $1
ORDER BY name, id;

-- name: ListOptionBlockClasses :many
SELECT bc.block_id, bc.class_id FROM timetable_option_block_classes bc
WHERE bc.block_id = ANY(sqlc.arg(block_ids)::uuid[]);

-- name: ListOptionBlockSubjects :many
SELECT bs.block_id, bs.subject_id, s.name AS subject_name
FROM timetable_option_block_subjects bs
INNER JOIN subjects s ON s.id = bs.subject_id
WHERE bs.block_id = ANY(sqlc.arg(block_ids)::uuid[])
ORDER BY s.name;

-- name: CreateOptionBlock :one
INSERT INTO timetable_option_blocks (academic_year_id, grade_id, name, periods_per_week)
VALUES ($1, $2, $3, $4)
RETURNING id;

-- name: AddOptionBlockSubject :exec
INSERT INTO timetable_option_block_subjects (block_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: AddOptionBlockClass :exec
INSERT INTO timetable_option_block_classes (block_id, class_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: DeleteOptionBlocks :exec
DELETE FROM timetable_option_blocks WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: OptionBlocksInSubmittedTimetables :one
-- a block already used by a timetable past draft cannot be replaced
SELECT EXISTS (
    SELECT 1 FROM timetable_entries te
    INNER JOIN timetables t ON t.id = te.timetable_id
    WHERE te.option_block_id = ANY(sqlc.arg(ids)::uuid[]) AND t.status <> 'draft'
)::bool AS in_use;

-- name: ListOptionBlockTeachersForClass :many
-- the teachers a class's students go to in one option block period
SELECT DISTINCT cst.teacher_id, tp.full_name AS teacher_name
FROM timetable_option_block_subjects bs
INNER JOIN class_subject_teachers cst ON cst.subject_id = bs.subject_id AND cst.class_id = sqlc.arg(class_id)::uuid
INNER JOIN teacher_profiles tp ON tp.id = cst.teacher_id
WHERE bs.block_id = sqlc.arg(block_id)::uuid;
