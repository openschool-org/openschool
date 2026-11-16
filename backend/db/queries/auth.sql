-- name: CreatePasswordResetToken :one
INSERT INTO password_reset_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: ConsumePasswordResetToken :one
-- Atomically claims a valid token. This prevents two concurrent reset
-- requests from both changing the account password with the same token.
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE token_hash = $1
  AND used_at IS NULL
  AND expires_at > NOW()
RETURNING *;

-- name: RevokePasswordResetTokens :exec
-- Ends every unused reset link for a user: run when a new link is issued and
-- when the password changes, so an older email cannot be used afterwards.
UPDATE password_reset_tokens
SET used_at = NOW()
WHERE user_id = $1 AND used_at IS NULL;
