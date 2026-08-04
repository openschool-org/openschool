-- teacher_positions
-- School-wide leadership positions (Principal, Vice Principal). Section Head
-- (section_heads), Class Teacher (classes.form_teacher_id) and Subject
-- Teacher (class_subject_teachers) already exist as their own overlays —
-- this table only covers the two positions that had no home yet.
--
-- Unlike section_heads/prefects, these are NOT scoped to an academic year:
-- a Principal or Vice Principal holds the position permanently until they
-- resign or are promoted (an admin removes/reassigns the row when that
-- happens), not re-appointed every year.
--
-- notify_whole_school + vice_principal_grade_scopes together implement "a
-- Vice Principal can notify assigned sections, or the whole school if
-- permitted": when notify_whole_school is TRUE the scope rows are ignored;
-- otherwise the VP is authorized only for the grades listed in
-- vice_principal_grade_scopes.
CREATE TABLE teacher_positions (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id           UUID         NOT NULL REFERENCES teacher_profiles (id) ON DELETE CASCADE,
    position             VARCHAR(20)  NOT NULL CHECK (position IN ('principal', 'vice_principal')),
    notify_whole_school  BOOLEAN      NOT NULL DEFAULT FALSE,
    scope_note           TEXT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- at most one Principal for the school, ever (not per year).
CREATE UNIQUE INDEX idx_teacher_positions_one_principal
    ON teacher_positions (position)
    WHERE position = 'principal';

-- a teacher holds each of these two positions at most once.
CREATE UNIQUE INDEX idx_teacher_positions_teacher_position_unique
    ON teacher_positions (teacher_id, position);

CREATE TABLE vice_principal_grade_scopes (
    position_id  UUID NOT NULL REFERENCES teacher_positions (id) ON DELETE CASCADE,
    grade_id     UUID NOT NULL REFERENCES grades (id)             ON DELETE CASCADE,
    PRIMARY KEY (position_id, grade_id)
);
