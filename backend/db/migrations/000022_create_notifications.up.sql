-- the narrow, timetable-only notification table is superseded by the
-- general-purpose system below; the timetable module now sends through it
-- like any other notification source.
DROP TABLE IF EXISTS timetable_notifications;

-- notifications
-- one row per notification SENT (or drafted), regardless of how many users
-- receive it. recipient_rules records the targeting criteria the sender
-- picked (e.g. "grade X" + "teacher Y"), purely for display/audit —
-- resolving it into actual recipients happens once, at send time, into
-- notification_recipients below.
CREATE TABLE notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(200) NOT NULL,
    message         TEXT        NOT NULL,
    category        VARCHAR(30) NOT NULL,
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    status          VARCHAR(10) NOT NULL DEFAULT 'sent',
    recipient_rules JSONB       NOT NULL DEFAULT '[]',
    created_by      UUID        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (category IN (
        'general', 'academic', 'examination', 'attendance', 'timetable',
        'events', 'sports', 'meetings', 'fee_reminder', 'emergency',
        'discipline', 'holidays'
    )),
    CHECK (priority IN ('normal', 'important', 'urgent')),
    CHECK (status IN ('draft', 'sent'))
);

CREATE INDEX idx_notifications_created_by ON notifications (created_by);
CREATE INDEX idx_notifications_status ON notifications (status);
CREATE INDEX idx_notifications_sent_at ON notifications (sent_at);

-- notification_recipients
-- the materialized per-user delivery + read/archive state for a sent
-- notification. Rows are created once, at send time, from resolving
-- notifications.recipient_rules against the current class/grade/subject
-- rosters — a later roster change does not retroactively add or remove
-- recipients of an already-sent notification.
CREATE TABLE notification_recipients (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID        NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users (id)         ON DELETE CASCADE,
    is_read         BOOLEAN     NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    is_archived     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notification_recipients_user_id ON notification_recipients (user_id, is_archived, is_read);
CREATE INDEX idx_notification_recipients_notification_id ON notification_recipients (notification_id);
