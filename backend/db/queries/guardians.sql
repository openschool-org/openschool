-- name: CreateGuardian :one
INSERT INTO guardians (
    full_name,
    relationship,
    phone,
    email
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetGuardianByID :one
SELECT * FROM guardians
WHERE id = $1;

-- name: UpdateGuardian :one
UPDATE guardians
SET
    full_name    = $2,
    relationship = $3,
    phone        = $4,
    email        = $5
WHERE id = $1
RETURNING *;

-- name: LinkGuardianToStudent :exec
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact)
VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING;

-- name: UnlinkGuardianFromStudent :exec
DELETE FROM student_guardians
WHERE student_id = $1 AND guardian_id = $2;

-- name: SetPrimaryContact :exec
UPDATE student_guardians
SET is_primary_contact = (guardian_id = $2)
WHERE student_id = $1;

-- name: ListGuardiansByStudent :many
SELECT
    g.*,
    sg.is_primary_contact
FROM guardians g
INNER JOIN student_guardians sg ON sg.guardian_id = g.id
WHERE sg.student_id = $1
ORDER BY sg.is_primary_contact DESC, g.full_name ASC;

-- name: GetPrimaryGuardian :one
SELECT
    g.*
FROM guardians g
INNER JOIN student_guardians sg ON sg.guardian_id = g.id
WHERE sg.student_id = $1
  AND sg.is_primary_contact = TRUE
LIMIT 1;
