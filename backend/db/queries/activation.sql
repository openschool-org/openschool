-- name: GetActivationSettings :one
SELECT * FROM activation_settings WHERE id;

-- name: UpdateActivationSettings :one
UPDATE activation_settings
SET student_enabled = sqlc.arg('student_enabled'),
    parent_enabled  = sqlc.arg('parent_enabled'),
    opens_at        = sqlc.narg('opens_at'),
    closes_at       = sqlc.narg('closes_at'),
    code_ttl_days   = sqlc.arg('code_ttl_days'),
    updated_at      = NOW()
WHERE id
RETURNING *;

-- name: ActivationStudentTargets :many
-- Active students with no login, with their current class for class-wise code sheets.
SELECT sp.id, sp.full_name, sp.index_number,
       COALESCE(cur.name, '')::text         AS class_name,
       COALESCE(cur.grade_name, '')::text   AS grade_name,
       COALESCE(cur.grade_order, 9999)::int AS grade_order,
       COALESCE(cur.form_teacher, '')::text AS form_teacher
FROM student_profiles sp
LEFT JOIN LATERAL (
    SELECT c.id, c.name, g.name AS grade_name, g.sort_order AS grade_order, tp.full_name AS form_teacher
    FROM class_students cs
    JOIN classes c              ON c.id = cs.class_id
    JOIN academic_years ay      ON ay.id = c.academic_year_id AND ay.is_current
    JOIN grades g               ON g.id = c.grade_id
    LEFT JOIN teacher_profiles tp ON tp.id = c.form_teacher_id
    WHERE cs.student_id = sp.id
    LIMIT 1
) cur ON TRUE
WHERE sp.user_id IS NULL
  AND sp.enrollment_status = 'active'
  AND sp.erased_at IS NULL
  AND (sqlc.narg('class_id')::uuid IS NULL OR cur.id = sqlc.narg('class_id')::uuid)
  AND (sqlc.narg('student_id')::uuid IS NULL OR sp.id = sqlc.narg('student_id')::uuid)
ORDER BY grade_order, class_name, sp.full_name;

-- name: ActivationGuardianTargets :many
-- Guardians with no login and an NIC on file, linked to at least one active student. Each is filed under
-- the class of their youngest-grade child (or the chosen class), so codes can go home with the child.
SELECT g.id, g.full_name, kids.children::text AS children,
       COALESCE(kc.class_name, '')::text   AS class_name,
       COALESCE(kc.grade_name, '')::text   AS grade_name,
       COALESCE(kc.grade_order, 9999)::int AS grade_order,
       COALESCE(kc.form_teacher, '')::text AS form_teacher
FROM guardians g
JOIN LATERAL (
    SELECT string_agg(sp.full_name, ', ' ORDER BY sp.full_name) AS children
    FROM student_guardians sg
    JOIN student_profiles sp ON sp.id = sg.student_id AND sp.enrollment_status = 'active' AND sp.erased_at IS NULL
    WHERE sg.guardian_id = g.id
) kids ON kids.children IS NOT NULL
LEFT JOIN LATERAL (
    SELECT c.id, c.name AS class_name, gr.name AS grade_name, gr.sort_order AS grade_order, tp.full_name AS form_teacher
    FROM student_guardians sg
    JOIN student_profiles sp  ON sp.id = sg.student_id AND sp.enrollment_status = 'active' AND sp.erased_at IS NULL
    JOIN class_students cs    ON cs.student_id = sp.id
    JOIN classes c            ON c.id = cs.class_id
    JOIN academic_years ay    ON ay.id = c.academic_year_id AND ay.is_current
    JOIN grades gr            ON gr.id = c.grade_id
    LEFT JOIN teacher_profiles tp ON tp.id = c.form_teacher_id
    WHERE sg.guardian_id = g.id
      AND (sqlc.narg('class_id')::uuid IS NULL OR c.id = sqlc.narg('class_id')::uuid)
    ORDER BY gr.sort_order, c.name
    LIMIT 1
) kc ON TRUE
WHERE g.user_id IS NULL
  AND COALESCE(g.nic_number, '') <> ''
  AND (sqlc.narg('guardian_id')::uuid IS NULL OR g.id = sqlc.narg('guardian_id')::uuid)
  AND (sqlc.narg('class_id')::uuid IS NULL OR kc.id IS NOT NULL)
ORDER BY grade_order, class_name, g.full_name;

-- name: RevokeLiveActivationCodesForStudents :exec
UPDATE activation_codes SET revoked_at = NOW()
WHERE student_id = ANY(sqlc.arg('ids')::uuid[]) AND used_at IS NULL AND revoked_at IS NULL;

-- name: RevokeLiveActivationCodesForGuardians :exec
UPDATE activation_codes SET revoked_at = NOW()
WHERE guardian_id = ANY(sqlc.arg('ids')::uuid[]) AND used_at IS NULL AND revoked_at IS NULL;

-- name: InsertActivationCodes :copyfrom
INSERT INTO activation_codes (batch_id, role, student_id, guardian_id, code_hash, expires_at, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- name: GetUsableActivationCode :one
-- A code that is not used, revoked or expired, with the record it belongs to.
SELECT ac.id, ac.role, ac.student_id, ac.guardian_id, ac.locked_until,
       sp.index_number, sp.user_id AS student_user_id,
       g.nic_number,    g.user_id  AS guardian_user_id
FROM activation_codes ac
LEFT JOIN student_profiles sp ON sp.id = ac.student_id
LEFT JOIN guardians g         ON g.id  = ac.guardian_id
WHERE ac.code_hash = $1 AND ac.used_at IS NULL AND ac.revoked_at IS NULL AND ac.expires_at > NOW();

-- name: GetUsableActivationCodeByID :one
SELECT ac.id, ac.role, ac.student_id, ac.guardian_id, ac.locked_until,
       sp.index_number, sp.user_id AS student_user_id,
       g.nic_number,    g.user_id  AS guardian_user_id
FROM activation_codes ac
LEFT JOIN student_profiles sp ON sp.id = ac.student_id
LEFT JOIN guardians g         ON g.id  = ac.guardian_id
WHERE ac.id = $1 AND ac.used_at IS NULL AND ac.revoked_at IS NULL AND ac.expires_at > NOW();

-- name: RecordActivationFailure :exec
-- Five wrong identifiers lock the code for an hour; each later miss locks it again.
UPDATE activation_codes
SET failed_attempts = failed_attempts + 1,
    locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '1 hour' ELSE locked_until END
WHERE id = $1;

-- name: ResetActivationFailures :exec
UPDATE activation_codes SET failed_attempts = 0, locked_until = NULL WHERE id = $1;

-- name: CreateActivationEmailToken :exec
INSERT INTO activation_email_tokens (token_hash, code_id, email, expires_at) VALUES ($1, $2, $3, $4);

-- name: PeekActivationEmailToken :one
SELECT code_id, email FROM activation_email_tokens
WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();

-- name: ConsumeActivationEmailToken :execrows
UPDATE activation_email_tokens SET used_at = NOW()
WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();

-- name: ClaimActivationCode :execrows
-- Marks the code used before any account is created, so two requests can't both activate.
UPDATE activation_codes SET used_at = NOW()
WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > NOW();

-- name: ReleaseActivationCode :exec
UPDATE activation_codes SET used_at = NULL WHERE id = $1;

-- name: ActivationEmailTaken :one
SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(sqlc.arg('email')::text));

-- name: ActivationStudentName :one
SELECT full_name FROM student_profiles WHERE id = $1;

-- name: ActivationGuardianName :one
SELECT full_name FROM guardians WHERE id = $1;

-- name: LinkActivatedStudent :execrows
UPDATE student_profiles SET user_id = sqlc.arg('user_id'), updated_at = NOW()
WHERE id = sqlc.arg('id') AND user_id IS NULL;

-- name: LinkActivatedGuardian :execrows
UPDATE guardians SET user_id = sqlc.arg('user_id'), email = sqlc.arg('email')
WHERE id = sqlc.arg('id') AND user_id IS NULL;

-- name: ListActivationBatches :many
SELECT batch_id, role,
       MIN(created_at)::timestamptz AS created_at,
       MAX(expires_at)::timestamptz AS expires_at,
       COUNT(*)                     AS total,
       COUNT(used_at)               AS used,
       COUNT(revoked_at)            AS revoked,
       COUNT(*) FILTER (WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at <= NOW()) AS expired
FROM activation_codes
GROUP BY batch_id, role
ORDER BY MIN(created_at) DESC
LIMIT 50;

-- name: RevokeActivationBatch :execrows
UPDATE activation_codes SET revoked_at = NOW()
WHERE batch_id = $1 AND used_at IS NULL AND revoked_at IS NULL;
