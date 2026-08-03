-- houses: replace the deterministic "remainder" scheme with a visible
-- house color; balance is now computed at assignment time (least-populated
-- + random tiebreak, see db/queries/houses.sql), not pre-configured here.
ALTER TABLE houses DROP COLUMN remainder;
ALTER TABLE houses ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#0f62fe';

-- staff houses mirror student houses: permanent, admin-changeable, audited.
ALTER TABLE teacher_profiles ADD COLUMN house_id UUID REFERENCES houses (id) ON DELETE SET NULL;
CREATE INDEX idx_teacher_profiles_house_id ON teacher_profiles (house_id);

-- generic audit trail for actions that need an accountable record: manual
-- house re-assignments and admin edits made to locked attendance records.
CREATE TABLE audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID        NOT NULL,
    action      VARCHAR(50) NOT NULL,
    actor_id    UUID        REFERENCES users (id) ON DELETE SET NULL,
    before      JSONB,
    after       JSONB,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
