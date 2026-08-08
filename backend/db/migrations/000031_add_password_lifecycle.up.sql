-- must_change_password: set TRUE whenever a user's password is a
-- system-assigned default (NIC/index-number derived, Phase 8.2) rather than
-- one they chose themselves. ThunderID's identity.Provider exposes no
-- temporary-credential/force-change-on-next-login primitive (confirmed —
-- CreateUser/UpdateUser/DeleteUser/AssignRole only), so this is tracked
-- locally and checked by the frontend's post-login interstitial (Phase 8.3).
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- password_reset_tokens: backs both the first-login "set a new password"
-- choice (8.3) and the unauthenticated "forgot password" flow (8.4).
-- ThunderID exposes no reset primitive either, so password changes are
-- hand-rolled: a short-lived, single-use token is minted once the caller's
-- identity is verified (authenticated session for 8.3, or the
-- identity+NIC/index-number match for 8.4's ForgotPassword step) and must be
-- presented to actually set the new password. Only a hash is stored, same
-- reasoning as never storing a password in plaintext.
CREATE TABLE password_reset_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
