ALTER TABLE guardians DROP CONSTRAINT guardians_nic_number_key;
ALTER TABLE guardians DROP COLUMN nic_number;

ALTER TABLE teacher_profiles DROP CONSTRAINT teacher_profiles_nic_number_key;
ALTER TABLE teacher_profiles DROP COLUMN nic_number;
