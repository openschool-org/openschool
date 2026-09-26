-- name: CreateNotification :one
INSERT INTO notifications (title, message, category, priority, status, recipient_rules, created_by, sent_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: UpdateNotificationDraft :one
UPDATE notifications
SET title = $2, message = $3, category = $4, priority = $5, recipient_rules = $6, updated_at = NOW()
WHERE id = $1 AND status = 'draft'
RETURNING *;

-- name: MarkNotificationSent :one
UPDATE notifications
SET status = 'sent', sent_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status = 'draft'
RETURNING *;

-- name: GetNotificationByID :one
SELECT * FROM notifications
WHERE id = $1;

-- name: DeleteDraftNotification :execrows
DELETE FROM notifications
WHERE id = $1 AND status = 'draft';

-- name: ListSentNotificationsByUser :many
SELECT
    n.*,
    u.full_name AS sender_name
FROM notifications n
INNER JOIN users u ON u.id = n.created_by
WHERE n.status = 'sent' AND n.created_by = $1
ORDER BY n.sent_at DESC
LIMIT 100;

-- name: ListAllSentNotifications :many
SELECT
    n.*,
    u.full_name AS sender_name
FROM notifications n
INNER JOIN users u ON u.id = n.created_by
WHERE n.status = 'sent'
ORDER BY n.sent_at DESC
LIMIT 100;

-- name: ListMyDraftNotifications :many
-- Bounded like the sent-notification lists (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
-- section 4): an admin who never sends or deletes a draft could otherwise
-- grow this without bound.
SELECT * FROM notifications
WHERE status = 'draft' AND created_by = $1
ORDER BY updated_at DESC
LIMIT 100;

-- name: GetNotificationRecipientStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE is_read)::int AS read_count
FROM notification_recipients
WHERE notification_id = $1;

-- name: SearchSentNotifications :many
-- Paged history of sent notifications. Admins pass no sender (whole school);
-- teachers are forced to their own id by the service. Search is escaped by the caller.
SELECT
    n.id, n.title, n.message, n.category, n.priority, n.sent_at, n.created_by,
    u.full_name AS sender_name,
    (SELECT COUNT(*) FROM notification_recipients r WHERE r.notification_id = n.id)::int AS recipient_count,
    (SELECT COUNT(*) FROM notification_recipients r WHERE r.notification_id = n.id AND r.is_read)::int AS read_count,
    COUNT(*) OVER () AS total
FROM notifications n
INNER JOIN users u ON u.id = n.created_by
WHERE n.status = 'sent'
  AND (sqlc.narg(sender_id)::uuid IS NULL OR n.created_by = sqlc.narg(sender_id)::uuid)
  AND (sqlc.narg(search)::text IS NULL
       OR n.title ILIKE '%' || sqlc.narg(search)::text || '%'
       OR n.message ILIKE '%' || sqlc.narg(search)::text || '%'
       OR u.full_name ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(category)::text IS NULL OR n.category = sqlc.narg(category)::text)
  AND (sqlc.narg(priority)::text IS NULL OR n.priority = sqlc.narg(priority)::text)
  AND (sqlc.narg(from_date)::date IS NULL OR n.sent_at >= sqlc.narg(from_date)::date)
  AND (sqlc.narg(to_date)::date IS NULL OR n.sent_at < sqlc.narg(to_date)::date + 1)
ORDER BY n.sent_at DESC, n.id DESC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;
