-- employee_number_seq: shared numbering pool for teacher_profiles and
-- non_academic_staff, per the product decision that employee number is
-- unique to every employee regardless of category (not two independent
-- counters). Format is a plain zero-padded string ("00001", "00002", ...),
-- applied via column default so callers no longer supply it.
CREATE SEQUENCE employee_number_seq START WITH 1;
SELECT setval('employee_number_seq', (SELECT COUNT(*) FROM teacher_profiles) + 1, false);

ALTER TABLE teacher_profiles
    ALTER COLUMN employee_number SET DEFAULT lpad(nextval('employee_number_seq')::text, 5, '0');

-- non_academic_staff: Lab Assistant, Librarian, Office Staff, Development
-- Officer, IT Officer, Security, Minor Employee. Deliberately without the
-- teacher stack's identity/login machinery — no user_id, no IDP
-- provisioning, no role assignment. Just profile fields.
CREATE TABLE non_academic_staff (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name          VARCHAR(255) NOT NULL,
    employee_number    VARCHAR(50)  NOT NULL UNIQUE DEFAULT lpad(nextval('employee_number_seq')::text, 5, '0'),
    designation        VARCHAR(30)  NOT NULL CHECK (designation IN (
                            'lab_assistant', 'librarian', 'office_staff',
                            'development_officer', 'it_officer', 'security', 'minor_employee'
                        )),
    phone              VARCHAR(30),
    joined_date        DATE         NOT NULL,
    gender             VARCHAR(10)  CHECK (gender IS NULL OR gender IN ('male', 'female')),
    house_id           UUID         REFERENCES houses (id) ON DELETE SET NULL,
    employment_status  VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'resigned', 'transferred')),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_non_academic_staff_designation ON non_academic_staff (designation);
CREATE INDEX idx_non_academic_staff_house_id    ON non_academic_staff (house_id);
