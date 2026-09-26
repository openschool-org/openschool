-- UI language per user (UX playbook L1); English stays the default.
ALTER TABLE users
    ADD COLUMN preferred_language VARCHAR(2) NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'si', 'ta'));
