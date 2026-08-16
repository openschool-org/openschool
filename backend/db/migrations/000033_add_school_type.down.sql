-- WARNING: destructive — discards every stored school_type value. A
-- subsequent re-up resets the column to its 'mixed' default for all rows.
ALTER TABLE school DROP COLUMN school_type;
