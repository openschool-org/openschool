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

-- name: ListGuardians :many
-- Every guardian on file, for the "link an existing guardian to this
-- student too" search picker (siblings sharing a guardian).
SELECT * FROM guardians
ORDER BY full_name ASC;

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

-- name: SetGuardianUserID :exec
-- Links a guardian record to the ThunderID identity created for their
-- portal login (see internal/services/guardian.go ProvisionLogin).
UPDATE guardians
SET user_id = $2
WHERE id = $1;

-- name: GetGuardianByUserID :one
SELECT * FROM guardians
WHERE user_id = $1;

-- name: ListStudentsByGuardianUserID :many
-- The signed-in parent's linked children, for the parent portal.
SELECT
    sp.*,
    c.id     AS class_id,
    c.name   AS class_name,
    gr.name  AS grade_name
FROM student_profiles sp
INNER JOIN student_guardians sg ON sg.student_id = sp.id
INNER JOIN guardians g          ON g.id = sg.guardian_id
LEFT JOIN class_students cs ON cs.student_id = sp.id
    AND cs.academic_year_id = (SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1)
LEFT JOIN classes c ON c.id = cs.class_id
LEFT JOIN grades gr ON gr.id = c.grade_id
WHERE g.user_id = $1
ORDER BY sp.full_name ASC;

-- name: IsGuardianOfStudent :one
-- Authorization check: does the signed-in guardian actually have this
-- student linked to them? Used to gate GET /me/children/:id/... routes.
SELECT EXISTS (
    SELECT 1
    FROM student_guardians sg
    INNER JOIN guardians g ON g.id = sg.guardian_id
    WHERE g.user_id = $1
      AND sg.student_id = $2
) AS is_guardian;
