-- Self-service account activation: a person claims a login for a record the
-- school already holds, using an admin-issued one-time code (see ADR 0008).

-- activation_settings: single row; every role starts switched off.
CREATE TABLE activation_settings (
    id              BOOLEAN     PRIMARY KEY DEFAULT TRUE CHECK (id),
    student_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    parent_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    opens_at        TIMESTAMPTZ,
    closes_at       TIMESTAMPTZ,
    code_ttl_days   INT         NOT NULL DEFAULT 14 CHECK (code_ttl_days BETWEEN 1 AND 90),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (opens_at IS NULL OR closes_at IS NULL OR closes_at > opens_at)
);
INSERT INTO activation_settings DEFAULT VALUES;

-- activation_codes: only a SHA-256 hash of each code is stored.
CREATE TABLE activation_codes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID        NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('student', 'parent')),
    student_id      UUID        REFERENCES student_profiles (id) ON DELETE CASCADE,
    guardian_id     UUID        REFERENCES guardians (id)        ON DELETE CASCADE,
    code_hash       CHAR(64)    NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    failed_attempts INT         NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    used_at         TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (role = 'student' AND student_id IS NOT NULL AND guardian_id IS NULL) OR
        (role = 'parent'  AND guardian_id IS NOT NULL AND student_id IS NULL)
    )
);

-- At most one live code per record; issuing a new one revokes the old one first.
CREATE UNIQUE INDEX uq_activation_codes_live_student ON activation_codes (student_id)
    WHERE used_at IS NULL AND revoked_at IS NULL AND student_id IS NOT NULL;
CREATE UNIQUE INDEX uq_activation_codes_live_guardian ON activation_codes (guardian_id)
    WHERE used_at IS NULL AND revoked_at IS NULL AND guardian_id IS NOT NULL;
CREATE INDEX idx_activation_codes_batch_id ON activation_codes (batch_id);

-- activation_email_tokens: proves the person owns the email they gave.
CREATE TABLE activation_email_tokens (
    token_hash CHAR(64)     PRIMARY KEY,
    code_id    UUID         NOT NULL REFERENCES activation_codes (id) ON DELETE CASCADE,
    email      VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activation_email_tokens_code_id ON activation_email_tokens (code_id);
