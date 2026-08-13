-- societies: government-school clubs/societies (Science Society, Sinhala
-- Literary Society, Interact/Leo Club, Scouts, etc.), each led by a
-- Teacher-in-Charge and scoped per academic year — distinct from the
-- free-text student_activities rows (category = 'society'), which have no
-- TIC, no TIC-managed roster, and no fixed hierarchy.
CREATE TABLE societies (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(150) NOT NULL,
    teacher_in_charge_id UUID         NOT NULL REFERENCES teacher_profiles (id) ON DELETE RESTRICT,
    academic_year_id     UUID         NOT NULL REFERENCES academic_years (id)   ON DELETE CASCADE,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, name),
    -- lets society_members' composite FK below pin a membership row to the
    -- exact same year as the society it belongs to, not just any society
    -- row with that id — defense in depth alongside the service-layer
    -- check (SocietyService.AssignMember derives the year from the society
    -- itself rather than trusting the caller).
    UNIQUE (id, academic_year_id)
);

CREATE INDEX idx_societies_academic_year_id     ON societies (academic_year_id);
CREATE INDEX idx_societies_teacher_in_charge_id ON societies (teacher_in_charge_id);

-- society_members: a student's role within one society, per year. One role
-- per student per society per year — the same shape as prefects'
-- UNIQUE(academic_year_id, student_id), scoped one level narrower to a
-- single society since a student may belong to several societies at once.
CREATE TABLE society_members (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    society_id        UUID         NOT NULL,
    student_id        UUID         NOT NULL REFERENCES student_profiles (id)  ON DELETE CASCADE,
    role              VARCHAR(20)  NOT NULL CHECK (role IN ('leader', 'deputy_leader', 'secretary', 'treasurer', 'member')),
    academic_year_id  UUID         NOT NULL REFERENCES academic_years (id)    ON DELETE CASCADE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (society_id, student_id, academic_year_id),
    -- composite FK (rather than a plain society_id -> societies(id)
    -- reference) so the DB itself rejects a membership row whose
    -- academic_year_id doesn't match its society's actual year.
    FOREIGN KEY (society_id, academic_year_id) REFERENCES societies (id, academic_year_id) ON DELETE CASCADE
);

CREATE INDEX idx_society_members_society_id       ON society_members (society_id);
CREATE INDEX idx_society_members_student_id       ON society_members (student_id);
CREATE INDEX idx_society_members_academic_year_id ON society_members (academic_year_id);
