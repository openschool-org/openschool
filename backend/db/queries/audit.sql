-- name: CreateAuditLog :one
INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, before, after, reason)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListAuditLogs :many
-- entity_type/entity_id are optional filters (pass a zero UUID / empty
-- string to skip that filter — checked in the repository layer, since
-- sqlc.narg with a nullable uuid comparison reads awkwardly here).
SELECT al.*, u.full_name AS actor_name
FROM audit_logs al
LEFT JOIN users u ON u.id = al.actor_id
WHERE (sqlc.narg(entity_type)::text IS NULL OR al.entity_type = sqlc.narg(entity_type))
  AND (sqlc.narg(entity_id)::uuid IS NULL OR al.entity_id = sqlc.narg(entity_id))
ORDER BY al.created_at DESC
LIMIT 200;
