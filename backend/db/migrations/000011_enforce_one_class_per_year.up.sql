-- class_students previously had no mechanism enforcing "a student can only
-- be in one class per academic year" despite the comment on its creation
-- claiming this was enforced. Denormalize academic_year_id onto the join
-- table (kept in sync via trigger) so a real UNIQUE constraint can apply.

ALTER TABLE class_students ADD COLUMN academic_year_id UUID;

UPDATE class_students cs
SET academic_year_id = c.academic_year_id
FROM classes c
WHERE cs.class_id = c.id;

ALTER TABLE class_students
    ALTER COLUMN academic_year_id SET NOT NULL,
    ADD CONSTRAINT class_students_academic_year_id_fkey
        FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
    ADD CONSTRAINT class_students_student_academic_year_unique
        UNIQUE (student_id, academic_year_id);

CREATE OR REPLACE FUNCTION set_class_students_academic_year_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT academic_year_id INTO NEW.academic_year_id
    FROM classes WHERE id = NEW.class_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_class_students_set_academic_year
    BEFORE INSERT OR UPDATE OF class_id ON class_students
    FOR EACH ROW EXECUTE FUNCTION set_class_students_academic_year_id();
