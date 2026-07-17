-- ── mediums ─────────────────────────────────────────────────────────────────

-- name: CreateMedium :one
INSERT INTO mediums (name)
VALUES ($1)
RETURNING *;

-- name: GetMediumByID :one
SELECT * FROM mediums
WHERE id = $1;

-- name: ListMediums :many
SELECT * FROM mediums
ORDER BY name ASC;

-- name: UpdateMedium :one
UPDATE mediums
SET name = $2
WHERE id = $1
RETURNING *;

-- name: DeleteMedium :execrows
DELETE FROM mediums AS m
WHERE m.id = $1
AND m.id NOT IN (
    SELECT DISTINCT medium_id FROM group_subjects
    WHERE medium_id IS NOT NULL
    UNION
    SELECT DISTINCT medium_id FROM student_subject_enrollments
    WHERE medium_id IS NOT NULL
);

-- ── levels ──────────────────────────────────────────────────────────────────

-- name: CreateLevel :one
INSERT INTO levels (label, grade_id, sort_order)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetLevelByID :one
SELECT * FROM levels
WHERE id = $1;

-- name: ListLevels :many
SELECT * FROM levels
ORDER BY sort_order ASC, label ASC;

-- name: ListLevelsByGrade :many
SELECT * FROM levels
WHERE grade_id = $1
ORDER BY sort_order ASC, label ASC;

-- name: UpdateLevel :one
UPDATE levels
SET
    label      = $2,
    grade_id   = $3,
    sort_order = $4
WHERE id = $1
RETURNING *;

-- name: DeleteLevel :execrows
-- blocked while any of its groups still carry enrollments
DELETE FROM levels AS l
WHERE l.id = $1
AND NOT EXISTS (
    SELECT 1
    FROM selection_groups sg
    INNER JOIN student_subject_enrollments sse ON sse.group_id = sg.id
    WHERE sg.level_id = l.id
);

-- ── selection groups ────────────────────────────────────────────────────────

-- name: CreateSelectionGroup :one
INSERT INTO selection_groups (level_id, label, min_select, max_select, sort_order)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetSelectionGroupByID :one
SELECT * FROM selection_groups
WHERE id = $1;

-- name: ListSelectionGroupsByLevel :many
SELECT * FROM selection_groups
WHERE level_id = $1
ORDER BY sort_order ASC, label ASC;

-- name: UpdateSelectionGroup :one
UPDATE selection_groups
SET
    label      = $2,
    min_select = $3,
    max_select = $4,
    sort_order = $5
WHERE id = $1
RETURNING *;

-- name: DeleteSelectionGroup :execrows
-- blocked while enrollments reference it
DELETE FROM selection_groups AS sg
WHERE sg.id = $1
AND sg.id NOT IN (
    SELECT DISTINCT group_id FROM student_subject_enrollments
);

-- name: CountGroupSubjects :one
SELECT COUNT(*) FROM group_subjects
WHERE group_id = $1;

-- ── group subjects ──────────────────────────────────────────────────────────

-- name: AddGroupSubject :one
INSERT INTO group_subjects (group_id, subject_id, medium_id, prerequisite_note, sort_order)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (group_id, subject_id) DO UPDATE
SET
    medium_id         = EXCLUDED.medium_id,
    prerequisite_note = EXCLUDED.prerequisite_note,
    sort_order        = EXCLUDED.sort_order
RETURNING *;

-- name: ListGroupSubjects :many
SELECT
    gs.group_id,
    gs.subject_id,
    s.name    AS subject_name,
    s.code    AS subject_code,
    s.type    AS subject_type,
    gs.medium_id,
    m.name    AS medium_name,
    gs.prerequisite_note,
    gs.sort_order
FROM group_subjects gs
INNER JOIN subjects s ON s.id = gs.subject_id
LEFT  JOIN mediums  m ON m.id = gs.medium_id
WHERE gs.group_id = $1
ORDER BY gs.sort_order ASC, s.name ASC;

-- name: RemoveGroupSubject :exec
DELETE FROM group_subjects
WHERE group_id = $1 AND subject_id = $2;

-- ── curriculum tree ─────────────────────────────────────────────────────────

-- name: GetCurriculumTreeByLevel :many
-- every group of a level with its subjects flattened alongside it.
-- LEFT JOIN so a group with no subjects yet still comes back.
SELECT
    sg.id         AS group_id,
    sg.label      AS group_label,
    sg.min_select,
    sg.max_select,
    sg.sort_order AS group_sort_order,
    gs.subject_id,
    s.name        AS subject_name,
    s.code        AS subject_code,
    s.type        AS subject_type,
    gs.medium_id,
    m.name        AS medium_name,
    gs.prerequisite_note,
    gs.sort_order AS subject_sort_order
FROM selection_groups sg
LEFT JOIN group_subjects gs ON gs.group_id   = sg.id
LEFT JOIN subjects       s  ON s.id          = gs.subject_id
LEFT JOIN mediums        m  ON m.id          = gs.medium_id
WHERE sg.level_id = $1
ORDER BY sg.sort_order ASC, sg.label ASC, gs.sort_order ASC, s.name ASC;

-- name: ListSelectionGroupsWithSubjectIDsByLevel :many
-- everything needed to validate a set of picks against a level in one round trip
SELECT
    sg.id         AS group_id,
    sg.label      AS group_label,
    sg.min_select,
    sg.max_select,
    sg.sort_order AS group_sort_order,
    COALESCE(
        ARRAY_AGG(gs.subject_id) FILTER (WHERE gs.subject_id IS NOT NULL),
        '{}'
    )::uuid[] AS subject_ids
FROM selection_groups sg
LEFT JOIN group_subjects gs ON gs.group_id = sg.id
WHERE sg.level_id = $1
GROUP BY sg.id
ORDER BY sg.sort_order ASC, sg.label ASC;
