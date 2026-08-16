-- school_type: single-sex vs mixed, set once at School Setup and editable in
-- School Settings. School-wide, not per-class, because in the government-school
-- system this schema mirrors, a single-sex school has zero opposite-gender
-- students at any grade — not a mix of single-sex and mixed classes within it.
ALTER TABLE school ADD COLUMN school_type VARCHAR(10) NOT NULL DEFAULT 'mixed'
    CHECK (school_type IN ('boys', 'girls', 'mixed'));
