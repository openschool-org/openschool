-- Re-point attendance_sessions.taken_by from teacher_profiles(id) to users(id).
--
-- The create-session route is open to teachers AND admins, but admins have no
-- teacher_profiles row, so the old FK made an admin-created session impossible.
-- Attributing the session to the acting user fixes that. taken_by stays NOT NULL.
--
-- Existing rows store a teacher_profiles.id; translate each to the owning
-- user_id before swapping the FK so current data stays valid under the new
-- reference. teacher_profiles.user_id is NOT NULL, so every row maps cleanly.

ALTER TABLE attendance_sessions
    DROP CONSTRAINT attendance_sessions_taken_by_fkey;

UPDATE attendance_sessions ats
SET taken_by = tp.user_id
FROM teacher_profiles tp
WHERE tp.id = ats.taken_by;

ALTER TABLE attendance_sessions
    ADD CONSTRAINT attendance_sessions_taken_by_fkey
        FOREIGN KEY (taken_by) REFERENCES users (id) ON DELETE RESTRICT;
