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
