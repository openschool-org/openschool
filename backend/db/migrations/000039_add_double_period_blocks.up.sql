-- AL (Grade 12/13) subjects commonly run as a double period — two
-- back-to-back periods of the same subject/teacher/room in one sitting.
-- Not all-or-nothing: a subject can have e.g. 6 periods/week with only 1 or
-- 2 of those as double-period blocks and the rest as regular singles, so
-- this is a count of double-period blocks, not a flag.
-- No change to timetable_entries: a double period is still two adjacent
-- entries sharing the same subject/teacher/classroom — this just tells the
-- auto-generator (and Subject Period Requirements UI) how many pairs to
-- carve out of periods_per_week.
ALTER TABLE subject_period_requirements ADD COLUMN double_period_blocks INTEGER NOT NULL DEFAULT 0
    CHECK (double_period_blocks >= 0);
