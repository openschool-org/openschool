-- name: CreateAuditLog :one
INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, before, after, reason)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListAuditLogs :many
-- Server-paginated (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md section 4) —
-- an append-only log grows without bound, so a fixed LIMIT eventually hides
-- older entries silently rather than paging to them. entity_type/entity_id
-- are optional filters (pass a zero UUID / empty string to skip that
-- filter — checked in the repository layer, since sqlc.narg with a
-- nullable uuid comparison reads awkwardly here).
SELECT al.*, u.full_name AS actor_name, COUNT(*) OVER () AS total
FROM audit_logs al
LEFT JOIN users u ON u.id = al.actor_id
WHERE (sqlc.narg(entity_type)::text IS NULL OR al.entity_type = sqlc.narg(entity_type))
  AND (sqlc.narg(entity_id)::uuid IS NULL OR al.entity_id = sqlc.narg(entity_id))
  -- search is escaped by httpx.ParsePage; it matches who, what and why.
  AND (sqlc.narg(search)::text IS NULL
       OR u.full_name     ILIKE '%' || sqlc.narg(search)::text || '%'
       OR al.action       ILIKE '%' || sqlc.narg(search)::text || '%'
       OR al.entity_type  ILIKE '%' || sqlc.narg(search)::text || '%'
       OR al.reason       ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(from_date)::date IS NULL OR al.created_at >= sqlc.narg(from_date)::date)
  AND (sqlc.narg(to_date)::date IS NULL OR al.created_at < sqlc.narg(to_date)::date + 1)
ORDER BY al.created_at DESC, al.id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: ListAuditEntityTypes :many
-- Feeds the entity filter so the frontend never hard-codes the list.
SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type;
