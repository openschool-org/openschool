-- name: CreateGuardian :one
INSERT INTO guardians (
    full_name,
    relationship,
    phone,
    email,
    nic_number
) VALUES (
    $1, $2, $3, $4, $5
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
-- Server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4):
-- serves both the guardian directory (no search term, paged) and the "link
-- an existing guardian to this student too" search picker (siblings
-- sharing a guardian; always passes a search term). The caller-supplied
-- search term is escaped by the service layer (httpx.EscapeLikeTerm)
-- before it reaches here, restricted to "orphans" (linked to no student —
-- e.g. their last child left the school).
SELECT g.*, COUNT(*) OVER () AS total FROM guardians g
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
ORDER BY
    -- Whitelisted by httpx.ParseSort; an empty key keeps the default name order.
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND NOT sqlc.arg(sort_desc)::bool THEN g.full_name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND sqlc.arg(sort_desc)::bool THEN g.full_name END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'relationship' AND NOT sqlc.arg(sort_desc)::bool THEN g.relationship END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'relationship' AND sqlc.arg(sort_desc)::bool THEN g.relationship END DESC,
    g.full_name ASC, g.id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

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
    email        = $5,
    nic_number   = $6
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

-- name: GetGuardianByUserIDAndNIC :one
-- Identity check for the unauthenticated forgot-password flow (Phase 8.4) —
-- confirms the caller knows this guardian's NIC before a reset token is
-- minted for their account.
SELECT * FROM guardians
WHERE user_id = $1 AND nic_number = $2;

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

-- name: GetGuardianChildrenSummary :many
-- One row per linked child so the parent dashboard costs one request however many children there are.
SELECT
    sg.student_id,
    COALESCE(att.total, 0)::int AS sessions_this_month,
    COALESCE(att.attended, 0)::int AS attended_this_month,
    COALESCE(latest.term_name, '')::text AS latest_term_name,
    COALESCE(latest.average_percent, 0)::float8 AS latest_average_percent,
    (latest.term_name IS NOT NULL)::bool AS has_marks
FROM guardians g
JOIN student_guardians sg ON sg.guardian_id = g.id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE ar.status IN ('present', 'late')) AS attended
    FROM attendance_records ar
    JOIN attendance_sessions s ON s.id = ar.session_id
    WHERE ar.student_id = sg.student_id
      AND s.date >= date_trunc('month', CURRENT_DATE)::date
) att ON TRUE
LEFT JOIN LATERAL (
    SELECT t.name AS term_name,
           ROUND((AVG(tm.marks / NULLIF(tm.max_marks, 0) * 100) FILTER (WHERE NOT tm.is_absent))::numeric, 1) AS average_percent
    FROM term_marks tm
    JOIN terms t ON t.id = tm.term_id
    WHERE tm.student_id = sg.student_id
    GROUP BY t.id, t.name, t.start_date
    ORDER BY t.start_date DESC
    LIMIT 1
) latest ON TRUE
WHERE g.user_id = $1;
