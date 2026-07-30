-- Class monitors: one girl, one boy, per class. Nullable and independent of
-- form_teacher_id (the class teacher) — a class can have a teacher without
-- monitors assigned yet, or vice versa.
ALTER TABLE classes
    ADD COLUMN girl_monitor_id UUID REFERENCES student_profiles (id) ON DELETE SET NULL,
    ADD COLUMN boy_monitor_id  UUID REFERENCES student_profiles (id) ON DELETE SET NULL;
