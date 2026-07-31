-- Revert attendance_sessions.taken_by back to teacher_profiles(id).
--
-- Translate each user_id back to that user's teacher_profiles.id before
-- restoring the original FK. Rows attributed to a user without a
-- teacher_profiles row (e.g. an admin) cannot be represented under the old
-- schema and will block this down migration by design.

ALTER TABLE attendance_sessions
    DROP CONSTRAINT attendance_sessions_taken_by_fkey;

UPDATE attendance_sessions ats
SET taken_by = tp.id
FROM teacher_profiles tp
WHERE tp.user_id = ats.taken_by;

ALTER TABLE attendance_sessions
    ADD CONSTRAINT attendance_sessions_taken_by_fkey
        FOREIGN KEY (taken_by) REFERENCES teacher_profiles (id) ON DELETE RESTRICT;
