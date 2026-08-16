-- name: SearchStudents :many
-- Top 5 students matching a name/index-number fragment, for the admin
-- header's global search — not a full paginated list endpoint.
SELECT id, full_name, index_number
FROM student_profiles
WHERE full_name ILIKE '%' || $1 || '%'
   OR index_number ILIKE '%' || $1 || '%'
ORDER BY full_name ASC
LIMIT 5;

-- name: SearchTeachers :many
-- Top 5 teachers matching a name/employee-number fragment, for the admin
-- header's global search.
SELECT id, full_name, employee_number
FROM teacher_profiles
WHERE full_name ILIKE '%' || $1 || '%'
   OR employee_number ILIKE '%' || $1 || '%'
ORDER BY full_name ASC
LIMIT 5;

-- name: SearchGuardians :many
-- Top 5 guardians matching a name/phone fragment, for the admin header's
-- global search.
SELECT id, full_name, phone
FROM guardians
WHERE full_name ILIKE '%' || $1 || '%'
   OR phone ILIKE '%' || $1 || '%'
ORDER BY full_name ASC
LIMIT 5;

-- name: SearchNonAcademicStaff :many
-- Top 5 non-academic staff matching a name/employee-number fragment, for
-- the admin header's global search.
SELECT id, full_name, employee_number
FROM non_academic_staff
WHERE full_name ILIKE '%' || $1 || '%'
   OR employee_number ILIKE '%' || $1 || '%'
ORDER BY full_name ASC
LIMIT 5;
