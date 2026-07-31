-- teacher_profiles.is_active
-- a teacher only becomes an active teaching staff member once they have at
-- least one subject assigned; kept in sync by AssignSubject/RemoveSubject
-- in TeacherService.
ALTER TABLE teacher_profiles
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;
