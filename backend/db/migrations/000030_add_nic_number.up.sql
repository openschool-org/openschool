-- nic_number: Sri Lankan National Identity Card number, required for
-- teachers and guardians (Phase 8.1). Not added to student_profiles —
-- students already have index_number as their unique identifier. Format is
-- validated loosely at the application layer (both the old 9-digit+V/X and
-- new 12-digit-numeric NIC formats are still in active use), not via a DB
-- CHECK constraint.
--
-- Existing rows are backfilled with a placeholder so the NOT NULL/UNIQUE
-- constraints can be added in the same migration; unlike employee_number,
-- nic_number is editable afterward, so an admin can correct the placeholder
-- the same way they'd fix a typo.
ALTER TABLE teacher_profiles ADD COLUMN nic_number VARCHAR(20);
UPDATE teacher_profiles SET nic_number = 'UNSET-' || employee_number WHERE nic_number IS NULL;
ALTER TABLE teacher_profiles ALTER COLUMN nic_number SET NOT NULL;
ALTER TABLE teacher_profiles ADD CONSTRAINT teacher_profiles_nic_number_key UNIQUE (nic_number);

ALTER TABLE guardians ADD COLUMN nic_number VARCHAR(20);
-- 'UNSET-' (6 chars) + 14 hex chars of the id keeps this within VARCHAR(20)
-- (the full undashed UUID is 32 chars — too long for the column).
UPDATE guardians SET nic_number = 'UNSET-' || substr(replace(id::text, '-', ''), 1, 14) WHERE nic_number IS NULL;
ALTER TABLE guardians ALTER COLUMN nic_number SET NOT NULL;
ALTER TABLE guardians ADD CONSTRAINT guardians_nic_number_key UNIQUE (nic_number);
