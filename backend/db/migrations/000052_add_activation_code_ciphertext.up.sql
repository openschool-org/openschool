-- Lets admins reprint unused activation codes. The code is stored encrypted (AES-256-GCM, key from
-- ACTIVATION_CODE_KEY) next to its hash; sign-in checks still use only the hash.
ALTER TABLE activation_codes ADD COLUMN code_encrypted BYTEA;
