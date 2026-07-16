-- Restore name uniqueness. Fails if duplicate subject names exist.
ALTER TABLE subjects ADD CONSTRAINT subjects_name_key UNIQUE (name);
