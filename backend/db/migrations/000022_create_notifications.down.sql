DROP TABLE IF EXISTS notification_recipients;
DROP TABLE IF EXISTS notifications;

CREATE TABLE timetable_notifications (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    timetable_id UUID        REFERENCES timetables (id)          ON DELETE CASCADE,
    type         VARCHAR(30) NOT NULL,
    message      TEXT        NOT NULL,
    is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timetable_notifications_user_id ON timetable_notifications (user_id, is_read);
