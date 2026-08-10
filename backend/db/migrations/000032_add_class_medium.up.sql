-- language of instruction for a classroom. NULL means the class is not
-- medium-designated — schools that don't split sections by language leave it
-- unset, and those rows stay in the normal promotion shuffle pool.
ALTER TABLE classes
    ADD COLUMN medium_id UUID REFERENCES mediums (id) ON DELETE SET NULL;

CREATE INDEX idx_classes_medium_id ON classes (medium_id);
