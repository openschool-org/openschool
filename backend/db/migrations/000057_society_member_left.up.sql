-- A member who leaves keeps their row, marked with when and why, so the
-- student's portfolio still shows the membership as a former one.
ALTER TABLE society_members
    ADD COLUMN left_at     TIMESTAMPTZ,
    ADD COLUMN left_reason TEXT;

CREATE INDEX idx_society_members_active ON society_members (society_id) WHERE left_at IS NULL;
