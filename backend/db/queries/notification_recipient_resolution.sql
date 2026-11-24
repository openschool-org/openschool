-- Recipient-resolution queries for the notification composer. Each rule
-- type in a notification's recipient_rules resolves through one or more
-- of these into a set of users.id, unioned together in Go (see
-- services/notifications).

-- name: ListAllUserIDs :many
SELECT id FROM users;

-- name: ListStudentUserIDsByClass :many
SELECT sp.user_id FROM student_profiles sp
INNER JOIN class_students cs ON cs.student_id = sp.id
WHERE cs.class_id = $1;

-- name: ListGuardianUserIDsByClass :many
SELECT DISTINCT g.user_id FROM guardians g
INNER JOIN student_guardians sg ON sg.guardian_id = g.id
INNER JOIN class_students cs    ON cs.student_id = sg.student_id
WHERE cs.class_id = $1;

-- name: ListTeacherUserIDsByClass :many
-- the form teacher, plus every subject teacher assigned to this class
SELECT tp.user_id FROM teacher_profiles tp
WHERE tp.id IN (
    SELECT c.form_teacher_id FROM classes c WHERE c.id = $1 AND c.form_teacher_id IS NOT NULL
    UNION
    SELECT cst.teacher_id FROM class_subject_teachers cst WHERE cst.class_id = $1
);

-- name: ListClassIDsByGrade :many
SELECT id FROM classes
WHERE grade_id = $1 AND academic_year_id = $2;

-- name: ListTeacherUserIDsBySubject :many
SELECT tp.user_id FROM teacher_profiles tp
INNER JOIN teacher_subjects ts ON ts.teacher_id = tp.id
WHERE ts.subject_id = $1;

-- name: ListStudentIDsByGuardian :many
-- used to authorize a teacher-sent "guardian" rule: allowed only if at
-- least one of the guardian's linked students is in one of the teacher's
-- assigned classes
SELECT sg.student_id FROM student_guardians sg
WHERE sg.guardian_id = $1;

-- name: ListStudentUserIDsBySubject :many
-- students enrolled in the subject as a curriculum elective, plus students
-- in any class where the subject is compulsorily taught
SELECT DISTINCT sp.user_id
FROM student_profiles sp
WHERE sp.id IN (
    SELECT sse.student_id FROM student_subject_enrollments sse
    WHERE sse.subject_id = $1 AND sse.academic_year_id = $2
    UNION
    SELECT cs.student_id
    FROM class_subject_teachers cst
    INNER JOIN class_students cs ON cs.class_id = cst.class_id
    INNER JOIN classes c         ON c.id = cst.class_id
    WHERE cst.subject_id = $1 AND c.academic_year_id = $2
);

-- name: ListStudentUserIDsBySociety :many
-- Active members recorded for the society's own academic year.
SELECT sp.user_id FROM student_profiles sp
INNER JOIN society_members sm ON sm.student_id = sp.id
INNER JOIN societies so       ON so.id = sm.society_id
WHERE sm.society_id = $1 AND sm.academic_year_id = so.academic_year_id AND sm.left_at IS NULL;

-- name: ListGuardianUserIDsBySociety :many
SELECT DISTINCT g.user_id FROM guardians g
INNER JOIN student_guardians sg ON sg.guardian_id = g.id
INNER JOIN society_members sm   ON sm.student_id = sg.student_id
INNER JOIN societies so         ON so.id = sm.society_id
WHERE sm.society_id = $1 AND sm.academic_year_id = so.academic_year_id AND sm.left_at IS NULL;

-- name: IsTeacherInChargeOfSociety :one
SELECT EXISTS (
    SELECT 1 FROM societies WHERE id = sqlc.arg(society_id) AND teacher_in_charge_id = sqlc.arg(teacher_id)
) AS in_charge;

-- name: ListNotifyClassesForTeacher :many
-- Current-year classes a teacher may message: their form class, classes they teach, and classes they lead.
SELECT c.id, c.name, g.name AS grade_name,
       (c.form_teacher_id IS NOT NULL AND c.form_teacher_id = sqlc.arg(teacher_id)::uuid)::bool AS is_form_class
FROM classes c
INNER JOIN grades g          ON g.id = c.grade_id
INNER JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
WHERE c.form_teacher_id = sqlc.arg(teacher_id)::uuid
   OR EXISTS (
       SELECT 1 FROM class_subject_teachers cst
       WHERE cst.class_id = c.id AND cst.teacher_id = sqlc.arg(teacher_id)::uuid
   )
   -- Classes they lead as a grade, stream or grade-section head.
   OR EXISTS (
       SELECT 1 FROM section_heads sh
       WHERE sh.teacher_id = sqlc.arg(teacher_id)::uuid AND sh.academic_year_id = c.academic_year_id
         AND sh.grade_id = c.grade_id AND (sh.stream_id IS NULL OR sh.stream_id = c.stream_id)
   )
   OR EXISTS (
       SELECT 1 FROM grade_section_grades gsg
       INNER JOIN grade_sections gs ON gs.id = gsg.grade_section_id
       WHERE gsg.grade_id = c.grade_id AND gsg.academic_year_id = c.academic_year_id
         AND gs.section_head_teacher_id = sqlc.arg(teacher_id)::uuid
   )
ORDER BY g.sort_order ASC, c.name ASC;

-- name: ListNotifySocieties :many
-- Current-year societies; only those the teacher runs when teacher_id is given.
SELECT so.id, so.name FROM societies so
INNER JOIN academic_years ay ON ay.id = so.academic_year_id AND ay.is_current = TRUE
WHERE sqlc.narg(teacher_id)::uuid IS NULL OR so.teacher_in_charge_id = sqlc.narg(teacher_id)::uuid
ORDER BY so.name ASC;
