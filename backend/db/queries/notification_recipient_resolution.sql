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
