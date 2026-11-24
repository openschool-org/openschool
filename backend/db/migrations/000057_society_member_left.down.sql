-- Before this migration a removed member had no row, so former members are dropped.
DROP INDEX IF EXISTS idx_society_members_active;
DELETE FROM society_members WHERE left_at IS NOT NULL;
ALTER TABLE society_members
    DROP COLUMN left_reason,
    DROP COLUMN left_at;
