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

-- name: DeleteGuardian :execrows
-- Blocked while linked to any student, since student_guardians cascades on
-- delete and silently unlinking a shared guardian from every child would be
-- surprising — admins must unlink each student first.
DELETE FROM guardians AS g
WHERE g.id = $1
AND g.id NOT IN (
    SELECT DISTINCT guardian_id FROM student_guardians
);

-- name: ListGuardians :many
-- Every guardian on file, optionally filtered by a search term matched
-- against name/phone/email and/or restricted to "orphans" (linked to no
-- student — e.g. their last child left the school). Used both by the
-- guardian directory and the "link an existing guardian to this student
-- too" search picker (siblings sharing a guardian).
SELECT g.* FROM guardians g
WHERE (
    sqlc.narg(search)::text IS NULL
    OR g.full_name ILIKE '%' || sqlc.narg(search) || '%'
    OR g.phone      ILIKE '%' || sqlc.narg(search) || '%'
    OR g.email      ILIKE '%' || sqlc.narg(search) || '%'
  )
  AND (
    sqlc.narg(orphans_only)::bool IS NOT TRUE
    OR NOT EXISTS (SELECT 1 FROM student_guardians sg WHERE sg.guardian_id = g.id)
  )
ORDER BY g.full_name ASC;

-- name: FindGuardianDuplicateCandidates :many
-- Near-matches by phone or email, surfaced as a soft warning ("this
-- guardian may already exist") when creating a new guardian record —
-- never hard-blocked, since a shared home phone across two guardians is
-- legitimate.
SELECT * FROM guardians
WHERE phone = $1
   OR (sqlc.narg(email)::text IS NOT NULL AND email = sqlc.narg(email))
ORDER BY full_name ASC;

-- name: ListStudentsByGuardianID :many
-- Linked students for the guardian directory's "children" column — works
-- regardless of whether the guardian has a portal login (unlike
-- ListStudentsByGuardianUserID, which requires one).
SELECT sp.*
FROM student_profiles sp
INNER JOIN student_guardians sg ON sg.student_id = sp.id
WHERE sg.guardian_id = $1
ORDER BY sp.full_name ASC;

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

-- name: ListGuardianUserIDsByStudentIDs :many
-- Distinct guardian user_ids (portal logins only) for a set of students in
-- one round trip — used to build notification recipient lists without a
-- ListByStudent call per student (see timetable.go's notifyPublication).
SELECT DISTINCT g.user_id
FROM guardians g
INNER JOIN student_guardians sg ON sg.guardian_id = g.id
WHERE sg.student_id = ANY(sqlc.arg(student_ids)::uuid[])
  AND g.user_id IS NOT NULL;

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
