-- name: CreateWorkflowRun :one
INSERT INTO workflow_runs (workflow_key, scope_key, state, inputs, proposal, trace, summary, created_by)
VALUES ($1, $2, 'proposed', $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetWorkflowRun :one
SELECT * FROM workflow_runs WHERE id = $1;

-- name: GetWorkflowRunForUpdate :one
SELECT * FROM workflow_runs WHERE id = $1 FOR UPDATE;

-- name: DiscardOpenWorkflowRuns :exec
UPDATE workflow_runs SET state = 'discarded', updated_at = NOW()
WHERE workflow_key = $1 AND scope_key = $2 AND state = 'proposed';

-- name: UpdateWorkflowRunProposal :exec
UPDATE workflow_runs SET proposal = $2, updated_at = NOW() WHERE id = $1;

-- name: MarkWorkflowRunApplied :exec
UPDATE workflow_runs
SET state = 'applied', snapshot = $2, trace = $3, summary = $4, applied_by = $5, applied_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: MarkWorkflowRunFailed :exec
UPDATE workflow_runs SET state = 'failed', error = $2, trace = $3, updated_at = NOW() WHERE id = $1;

-- name: MarkWorkflowRunState :exec
UPDATE workflow_runs
SET state = sqlc.arg(state)::text, updated_at = NOW(),
    reverted_at = CASE WHEN sqlc.arg(state)::text = 'reverted' THEN NOW() ELSE reverted_at END
WHERE id = sqlc.arg(id)::uuid;

-- name: ListWorkflowRuns :many
SELECT r.id, r.workflow_key, r.scope_key, r.state, r.summary, r.error, r.created_at, r.applied_at, r.reverted_at,
       cu.full_name AS created_by_name, au.full_name AS applied_by_name
FROM workflow_runs r
LEFT JOIN users cu ON cu.id = r.created_by
LEFT JOIN users au ON au.id = r.applied_by
WHERE r.workflow_key = $1
ORDER BY r.created_at DESC
LIMIT 20;

-- name: LatestWorkflowRuns :many
-- Latest run per workflow for the hub cards.
SELECT DISTINCT ON (workflow_key) id, workflow_key, state, summary, created_at, applied_at
FROM workflow_runs
WHERE state <> 'discarded'
ORDER BY workflow_key, created_at DESC;

-- ---- Shared reads ----

-- name: WfListAcademicYears :many
SELECT id, label, start_date, end_date, is_current FROM academic_years ORDER BY start_date DESC;

-- name: WfGetAcademicYear :one
SELECT id, label, start_date, end_date, is_current FROM academic_years WHERE id = $1;

-- name: WfAcademicYearLabelExists :one
SELECT EXISTS (SELECT 1 FROM academic_years WHERE lower(label) = lower($1));

-- name: WfListYearClasses :many
SELECT
    c.id, c.name, c.grade_id, g.name AS grade_name, g.sort_order AS grade_order,
    c.stream_id, s.name AS stream_name, c.stream_group_id, sg.name AS stream_group_name,
    c.medium_id, m.name AS medium_name, c.home_classroom_id, hc.name AS homeroom_name,
    c.form_teacher_id, c.capacity,
    (SELECT COUNT(*) FROM class_students cs WHERE cs.class_id = c.id)::int AS student_count
FROM classes c
JOIN grades g ON g.id = c.grade_id
LEFT JOIN streams s        ON s.id = c.stream_id
LEFT JOIN stream_groups sg ON sg.id = c.stream_group_id
LEFT JOIN mediums m        ON m.id = c.medium_id
LEFT JOIN classrooms hc    ON hc.id = c.home_classroom_id
WHERE c.academic_year_id = $1
ORDER BY g.sort_order, c.name;

-- name: WfListTerms :many
SELECT id, name, start_date, end_date, sort_order, is_current FROM terms WHERE academic_year_id = $1 ORDER BY sort_order, start_date;

-- name: WfListGrades :many
SELECT id, name, sort_order FROM grades ORDER BY sort_order;

-- ---- W1 year rollover ----

-- name: WfCreateAcademicYear :one
INSERT INTO academic_years (label, start_date, end_date, is_current) VALUES ($1, $2, $3, FALSE) RETURNING id;

-- name: WfCreateTerm :exec
INSERT INTO terms (academic_year_id, name, start_date, end_date, sort_order, is_current) VALUES ($1, $2, $3, $4, $5, FALSE);

-- name: WfCreateClass :one
INSERT INTO classes (grade_id, academic_year_id, name, stream_id, stream_group_id, medium_id, home_classroom_id, form_teacher_id, capacity)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id;

-- name: WfListGradeSections :many
SELECT id, name, interval_start_time, interval_end_time, section_head_teacher_id, sort_order FROM grade_sections WHERE academic_year_id = $1 ORDER BY sort_order, name;

-- name: WfCreateGradeSection :one
INSERT INTO grade_sections (academic_year_id, name, interval_start_time, interval_end_time, section_head_teacher_id, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: WfCopyGradeSectionGrades :exec
INSERT INTO grade_section_grades (grade_section_id, grade_id, academic_year_id)
SELECT sqlc.arg(new_section)::uuid, grade_id, sqlc.arg(new_year)::uuid FROM grade_section_grades WHERE grade_section_id = sqlc.arg(old_section)::uuid;

-- name: WfCopyTimetablePeriods :exec
INSERT INTO timetable_periods (grade_section_id, sort_order, period_number, start_time, end_time, slot_type)
SELECT sqlc.arg(new_section)::uuid, sort_order, period_number, start_time, end_time, slot_type FROM timetable_periods WHERE grade_section_id = sqlc.arg(old_section)::uuid;

-- name: WfCopySubjectPeriodRequirements :execrows
INSERT INTO subject_period_requirements (academic_year_id, grade_id, subject_id, periods_per_week, lab_periods_per_week, double_period_blocks)
SELECT sqlc.arg(new_year)::uuid, grade_id, subject_id, periods_per_week, lab_periods_per_week, double_period_blocks
FROM subject_period_requirements WHERE academic_year_id = sqlc.arg(old_year)::uuid;

-- name: WfCopyTimetableSettings :execrows
INSERT INTO timetable_settings (academic_year_id, school_start_time, school_end_time, number_of_periods, period_duration_minutes, interval_duration_minutes)
SELECT sqlc.arg(new_year)::uuid, school_start_time, school_end_time, number_of_periods, period_duration_minutes, interval_duration_minutes
FROM timetable_settings WHERE academic_year_id = sqlc.arg(old_year)::uuid;

-- name: WfCopySectionHeads :execrows
INSERT INTO section_heads (academic_year_id, grade_id, stream_id, teacher_id)
SELECT sqlc.arg(new_year)::uuid, grade_id, stream_id, teacher_id FROM section_heads WHERE academic_year_id = sqlc.arg(old_year)::uuid;

-- name: WfYearHasActivity :one
-- True once anything real is recorded against the year's classes; a rollover can no longer be reverted.
SELECT (EXISTS (SELECT 1 FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE c.academic_year_id = $1)
    OR EXISTS (SELECT 1 FROM attendance_sessions a JOIN classes c ON c.id = a.class_id WHERE c.academic_year_id = $1)
    OR EXISTS (SELECT 1 FROM timetables t WHERE t.academic_year_id = $1)
    OR EXISTS (SELECT 1 FROM student_subject_enrollments e WHERE e.academic_year_id = $1))::bool AS has_activity;

-- name: WfDeleteYearClasses :exec
-- Classes RESTRICT their year, so they go first; the rest cascades from the year.
DELETE FROM classes WHERE academic_year_id = $1;

-- name: WfDeleteAcademicYear :exec
DELETE FROM academic_years WHERE id = $1;

-- ---- W2 leavers ----

-- name: WfListActiveStudentsInGrades :many
SELECT sp.id, sp.full_name, sp.index_number, c.name AS class_name, g.id AS grade_id, g.name AS grade_name, g.sort_order AS grade_order
FROM student_profiles sp
JOIN class_students cs ON cs.student_id = sp.id
JOIN classes c ON c.id = cs.class_id AND c.academic_year_id = sqlc.arg(year)::uuid
JOIN grades g ON g.id = c.grade_id
WHERE sp.enrollment_status = 'active' AND g.id = ANY(sqlc.arg(grade_ids)::uuid[])
ORDER BY g.sort_order, c.name, sp.full_name;

-- name: WfMarkStudentsLeft :execrows
UPDATE student_profiles SET enrollment_status = 'left', left_at = sqlc.arg(left_at)::timestamptz, updated_at = NOW()
WHERE id = ANY(sqlc.arg(ids)::uuid[]) AND enrollment_status = 'active';

-- name: WfRestoreStudentsActive :execrows
UPDATE student_profiles SET enrollment_status = 'active', left_at = NULL, updated_at = NOW()
WHERE id = ANY(sqlc.arg(ids)::uuid[]) AND enrollment_status = 'left' AND erased_at IS NULL;

-- ---- W8 go live ----

-- name: WfYearReadiness :one
SELECT
    (SELECT COUNT(*) FROM classes c WHERE c.academic_year_id = $1)::int AS classes,
    (SELECT COUNT(*) FROM class_students cs JOIN classes c ON c.id = cs.class_id WHERE c.academic_year_id = $1)::int AS students,
    (SELECT COUNT(DISTINCT t.class_id) FROM timetables t WHERE t.academic_year_id = $1 AND t.status = 'published')::int AS published_timetables,
    (SELECT COUNT(*) FROM terms tr WHERE tr.academic_year_id = $1)::int AS terms;

-- name: WfCurrentTerm :one
SELECT id FROM terms WHERE is_current = TRUE LIMIT 1;

-- name: WfSetCurrentYear :exec
UPDATE academic_years SET is_current = (id = $1) WHERE id = $1 OR is_current = TRUE;

-- name: WfSetCurrentTerm :exec
UPDATE terms SET is_current = (id = $1) WHERE id = $1 OR is_current = TRUE;

-- ---- W5 promotion ----

-- name: WfPromotionStudents :many
-- Active students in the source year with what placement needs: class, grade, medium, gender, house.
SELECT sp.id, sp.full_name, sp.index_number, COALESCE(sp.gender, '')::text AS gender,
       COALESCE(sp.house_id::text, '')::text AS house_id,
       c.name AS class_name, c.grade_id, COALESCE(c.medium_id::text, '')::text AS medium_id
FROM student_profiles sp
JOIN class_students cs ON cs.student_id = sp.id
JOIN classes c ON c.id = cs.class_id AND c.academic_year_id = $1
WHERE sp.enrollment_status = 'active'
ORDER BY sp.full_name, sp.id;

-- name: WfTargetOccupancy :many
-- Seats already taken in target classes by students outside this promotion (for example placed by hand).
SELECT cs.class_id, COUNT(*)::int AS taken
FROM class_students cs
JOIN classes c ON c.id = cs.class_id AND c.academic_year_id = sqlc.arg(year)::uuid
WHERE NOT (cs.student_id = ANY(sqlc.arg(exclude)::uuid[]))
GROUP BY cs.class_id;

-- name: WfStudentChoices :many
-- Each student's optional subjects for the target year, and the stream of the level they are in.
-- A group is a real choice when it offers more subjects than a student may take.
SELECT e.student_id, s.name AS subject_name, e.subject_id,
       COALESCE(l.stream_id::text, '')::text AS stream_id,
       COALESCE(l.stream_group_id::text, '')::text AS stream_group_id,
       ((SELECT COUNT(*) FROM group_subjects gs WHERE gs.group_id = g.id) > g.max_select)::bool AS is_choice
FROM student_subject_enrollments e
JOIN selection_groups g ON g.id = e.group_id
JOIN levels l ON l.id = g.level_id
JOIN subjects s ON s.id = e.subject_id
WHERE e.academic_year_id = sqlc.arg(year)::uuid AND e.student_id = ANY(sqlc.arg(ids)::uuid[])
ORDER BY e.student_id, s.name;

-- name: WfPromotionPolicies :many
SELECT from_grade_id, policy, spread_by_marks FROM promotion_policies;

-- name: WfUpsertPromotionPolicy :exec
INSERT INTO promotion_policies (from_grade_id, policy, spread_by_marks) VALUES ($1, $2, $3)
ON CONFLICT (from_grade_id) DO UPDATE SET policy = EXCLUDED.policy, spread_by_marks = EXCLUDED.spread_by_marks, updated_at = NOW();

-- name: WfGradesWithChoiceGroups :many
-- Grades whose curriculum has a real subject choice; their incoming students default to by_subject_choice.
SELECT DISTINCT l.grade_id::uuid AS grade_id
FROM levels l JOIN selection_groups g ON g.level_id = l.id
WHERE l.grade_id IS NOT NULL AND (SELECT COUNT(*) FROM group_subjects gs WHERE gs.group_id = g.id) > g.max_select;

-- name: WfLatestAverages :many
-- Each student's average percentage in the latest term of the year that has marks.
WITH latest AS (
    SELECT t.id FROM terms t
    WHERE t.academic_year_id = sqlc.arg(year)::uuid AND EXISTS (SELECT 1 FROM term_marks m WHERE m.term_id = t.id)
    ORDER BY t.sort_order DESC, t.start_date DESC LIMIT 1
)
SELECT m.student_id, (AVG(m.marks / NULLIF(m.max_marks, 0) * 100))::float8 AS average
FROM term_marks m JOIN latest ON latest.id = m.term_id
WHERE m.student_id = ANY(sqlc.arg(ids)::uuid[]) AND NOT m.is_absent
GROUP BY m.student_id;

-- name: WfYearAssignments :many
SELECT cs.student_id, cs.class_id
FROM class_students cs JOIN classes c ON c.id = cs.class_id AND c.academic_year_id = sqlc.arg(year)::uuid
WHERE cs.student_id = ANY(sqlc.arg(ids)::uuid[]);

-- name: WfClassesHaveRecords :one
-- Attendance or marks already recorded in these classes; a placement can no longer be reverted.
SELECT (EXISTS (SELECT 1 FROM attendance_sessions a WHERE a.class_id = ANY(sqlc.arg(class_ids)::uuid[]))
     OR EXISTS (SELECT 1 FROM term_marks m JOIN terms t ON t.id = m.term_id
                WHERE t.academic_year_id = sqlc.arg(year)::uuid AND m.student_id = ANY(sqlc.arg(student_ids)::uuid[])))::bool AS has_records;

-- name: WfDeleteEmptyClasses :exec
DELETE FROM classes c WHERE c.id = ANY(sqlc.arg(ids)::uuid[]) AND NOT EXISTS (SELECT 1 FROM class_students cs WHERE cs.class_id = c.id);

-- name: WfIntakeStudents :many
-- Admitted students waiting for a class in the target year.
SELECT sp.id, sp.full_name, sp.index_number, COALESCE(sp.gender, '')::text AS gender,
       COALESCE(sp.house_id::text, '')::text AS house_id,
       i.grade_id, COALESCE(i.medium_id::text, '')::text AS medium_id
FROM student_intakes i
JOIN student_profiles sp ON sp.id = i.student_id
WHERE i.academic_year_id = $1 AND sp.enrollment_status = 'active'
ORDER BY sp.full_name, sp.id;

-- name: WfDeleteIntakes :exec
DELETE FROM student_intakes WHERE student_id = ANY(sqlc.arg(ids)::uuid[]);

-- name: WfRestoreIntake :exec
INSERT INTO student_intakes (student_id, academic_year_id, grade_id, medium_id) VALUES ($1, $2, $3, $4)
ON CONFLICT (student_id) DO NOTHING;

-- name: WfIntakesByIDs :many
SELECT student_id, academic_year_id, grade_id, medium_id FROM student_intakes WHERE student_id = ANY(sqlc.arg(ids)::uuid[]);

-- name: WfGradesWithStreamLevels :many
-- Grades whose levels are tied to an A/L stream; their incoming students default to by_stream.
SELECT DISTINCT grade_id::uuid AS grade_id FROM levels WHERE grade_id IS NOT NULL AND stream_id IS NOT NULL;

-- ---- W4 intake ----

-- name: WfListMediums :many
SELECT id, name FROM mediums ORDER BY name;

-- name: WfSchoolType :one
SELECT COALESCE(school_type, '')::text AS school_type FROM school LIMIT 1;

-- name: WfExistingIndexNumbers :many
SELECT index_number FROM student_profiles WHERE index_number = ANY(sqlc.arg(numbers)::text[]);

-- name: WfGuardiansByNIC :many
SELECT id, nic_number, full_name FROM guardians WHERE nic_number = ANY(sqlc.arg(nics)::text[]);

-- name: WfLeastUsedHouse :one
-- The house with the fewest active students, so imported students spread evenly.
SELECT h.id FROM houses h
LEFT JOIN student_profiles sp ON sp.house_id = h.id AND sp.enrollment_status = 'active'
GROUP BY h.id, h.name
ORDER BY COUNT(sp.id), h.name
LIMIT 1;

-- name: WfCreateIntakeStudent :one
INSERT INTO student_profiles (full_name, index_number, address, phone, gender, house_id)
VALUES (sqlc.arg(full_name), sqlc.arg(index_number), sqlc.narg(address), sqlc.narg(phone), sqlc.narg(gender), sqlc.narg(house_id))
RETURNING id;

-- name: WfCreateGuardian :one
INSERT INTO guardians (full_name, relationship, phone, email, nic_number)
VALUES (sqlc.arg(full_name), sqlc.arg(relationship), sqlc.arg(phone), sqlc.narg(email), sqlc.arg(nic_number))
RETURNING id;

-- name: WfLinkGuardian :exec
INSERT INTO student_guardians (student_id, guardian_id, is_primary_contact) VALUES ($1, $2, TRUE)
ON CONFLICT DO NOTHING;

-- name: WfCreateIntake :exec
INSERT INTO student_intakes (student_id, academic_year_id, grade_id, medium_id) VALUES ($1, $2, $3, $4);

-- name: WfStudentsInUse :one
-- An imported student can no longer be removed once they have an account, a class, subjects or records.
SELECT (EXISTS (SELECT 1 FROM student_profiles WHERE id = ANY(sqlc.arg(ids)::uuid[]) AND user_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM class_students WHERE student_id = ANY(sqlc.arg(ids)::uuid[]))
     OR EXISTS (SELECT 1 FROM student_subject_enrollments WHERE student_id = ANY(sqlc.arg(ids)::uuid[]))
     OR EXISTS (SELECT 1 FROM attendance_records WHERE student_id = ANY(sqlc.arg(ids)::uuid[]))
     OR EXISTS (SELECT 1 FROM term_marks WHERE student_id = ANY(sqlc.arg(ids)::uuid[])))::bool AS in_use;

-- name: WfDeleteStudents :exec
DELETE FROM student_profiles WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: WfDeleteUnlinkedGuardians :exec
DELETE FROM guardians g WHERE g.id = ANY(sqlc.arg(ids)::uuid[])
  AND NOT EXISTS (SELECT 1 FROM student_guardians sg WHERE sg.guardian_id = g.id);

-- name: WfStudentsWithoutAccount :many
SELECT id, full_name, index_number FROM student_profiles
WHERE index_number = ANY(sqlc.arg(numbers)::text[]) AND user_id IS NULL;

-- name: WfSetStudentUser :exec
UPDATE student_profiles SET user_id = $2, updated_at = NOW() WHERE id = $1;
