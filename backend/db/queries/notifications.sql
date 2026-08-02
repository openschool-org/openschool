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
SELECT * FROM notifications
WHERE status = 'draft' AND created_by = $1
ORDER BY updated_at DESC;

-- name: GetNotificationRecipientStats :one
SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE is_read)::int AS read_count
FROM notification_recipients
WHERE notification_id = $1;
