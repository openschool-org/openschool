DROP TABLE non_academic_staff;

ALTER TABLE teacher_profiles ALTER COLUMN employee_number DROP DEFAULT;

DROP SEQUENCE employee_number_seq;
