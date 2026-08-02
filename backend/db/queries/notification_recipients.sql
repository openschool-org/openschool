-- name: CreateNotificationRecipient :exec
INSERT INTO notification_recipients (notification_id, user_id)
VALUES ($1, $2)
ON CONFLICT (notification_id, user_id) DO NOTHING;

-- name: ListMyNotifications :many
-- everything not archived, most recent first; category/date/search
-- filtering happens client-side, matching this app's existing convention
-- for list pages (see e.g. Subjects, Streams)
SELECT
    nr.id AS recipient_id,
    nr.is_read,
    nr.read_at,
    nr.is_archived,
    n.id AS notification_id,
    n.title,
    n.message,
    n.category,
    n.priority,
    n.sent_at,
    u.full_name AS sender_name
FROM notification_recipients nr
INNER JOIN notifications n ON n.id = nr.notification_id
INNER JOIN users u          ON u.id = n.created_by
WHERE nr.user_id = $1 AND nr.is_archived = FALSE
ORDER BY n.sent_at DESC
LIMIT 200;

-- name: ListMyArchivedNotifications :many
SELECT
    nr.id AS recipient_id,
    nr.is_read,
    nr.read_at,
    nr.is_archived,
    n.id AS notification_id,
    n.title,
    n.message,
    n.category,
    n.priority,
    n.sent_at,
    u.full_name AS sender_name
FROM notification_recipients nr
INNER JOIN notifications n ON n.id = nr.notification_id
INNER JOIN users u          ON u.id = n.created_by
WHERE nr.user_id = $1 AND nr.is_archived = TRUE
ORDER BY n.sent_at DESC
LIMIT 200;

-- name: CountMyUnreadNotifications :one
SELECT COUNT(*) FROM notification_recipients
WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE;

-- name: MarkNotificationRecipientRead :exec
UPDATE notification_recipients
SET is_read = TRUE, read_at = NOW()
WHERE notification_id = $1 AND user_id = $2;

-- name: SetNotificationRecipientArchived :exec
UPDATE notification_recipients
SET is_archived = $3
WHERE notification_id = $1 AND user_id = $2;
