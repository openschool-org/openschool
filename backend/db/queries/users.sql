-- name: CreateUser :one
INSERT INTO users (
    id,
    email,
    full_name,
    role
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: EnsureUserExists :one
-- Atomic get-or-create: used to provision the local row for an identity
-- that just authenticated for the first time. The no-op DO UPDATE (rather
-- than DO NOTHING) is required so RETURNING always yields a row, whether
-- this call created it or another concurrent request already did.
INSERT INTO users (
    id,
    email,
    full_name,
    role
) VALUES (
    $1, $2, $3, $4
)
ON CONFLICT (id) DO UPDATE SET id = users.id
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1;

-- name: ListUsers :many
SELECT * FROM users
ORDER BY full_name ASC;

-- name: ListUsersByRole :many
SELECT * FROM users
WHERE role = $1
ORDER BY full_name ASC;

-- name: CountUsersByRole :one
SELECT COUNT(*) FROM users
WHERE role = $1;

-- name: UpdateUser :one
UPDATE users
SET
    full_name  = $2,
    email      = $3,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeactivateUser :one
UPDATE users
SET
    is_active  = FALSE,
    updated_at = NOW()
WHERE id = $1
RETURNING *;
