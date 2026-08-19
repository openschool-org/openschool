ALTER TABLE subject_period_requirements DROP COLUMN lab_periods_per_week;

ALTER TABLE classes DROP COLUMN home_classroom_id;

ALTER TABLE classrooms DROP COLUMN subject_id;
ALTER TABLE classrooms DROP COLUMN room_type;
