-- name: CreateStudentProfile :one
INSERT INTO student_profiles (
    user_id,
    full_name,
    index_number,
    address,
    phone,
    whatsapp,
    special_remarks,
    gender,
    house_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetStudentByID :one
SELECT * FROM student_profiles
WHERE id = $1;

-- name: UpdateStudentEnrollmentStatus :one
-- left_at is set the moment status becomes 'left' and cleared on any other
-- status, so a re-enrolled student's retention clock (S11) starts fresh
-- rather than counting from a stale prior departure.
UPDATE student_profiles
SET
    enrollment_status = $2,
    left_at           = CASE WHEN $2 = 'left' THEN NOW() ELSE NULL END,
    updated_at        = NOW()
WHERE id = $1
RETURNING *;

-- name: GetStudentByIndexNumber :one
SELECT * FROM student_profiles
WHERE index_number = $1;

-- name: GetStudentByUserID :one
SELECT * FROM student_profiles
WHERE user_id = $1;

-- name: ListStudents :many
SELECT
    sp.*,
    c.name AS class_name,
    g.name AS grade_name,
    h.name AS house_name
FROM student_profiles sp
LEFT JOIN class_students cs
    ON cs.student_id = sp.id
   AND cs.academic_year_id = (
       SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1
   )
LEFT JOIN classes c ON c.id = cs.class_id
LEFT JOIN grades  g ON g.id = c.grade_id
LEFT JOIN houses  h ON h.id = sp.house_id
ORDER BY sp.full_name ASC;

-- name: ListStudentsPage :many
-- Server-paginated replacement for ListStudents (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
-- section 4): the caller-supplied search term is escaped by the service layer
-- before it reaches here (see search.escapeLikeTerm's sibling in this
-- module), so '%'/'_' can't widen the match. COUNT(*) OVER () returns the
-- total for the whole filtered set alongside the page in one round trip.
SELECT
    sp.*,
    c.name AS class_name,
    g.name AS grade_name,
    h.name AS house_name,
    COUNT(*) OVER () AS total
FROM student_profiles sp
LEFT JOIN class_students cs
    ON cs.student_id = sp.id
   AND cs.academic_year_id = (
       SELECT id FROM academic_years WHERE is_current = TRUE LIMIT 1
   )
LEFT JOIN classes c ON c.id = cs.class_id
LEFT JOIN grades  g ON g.id = c.grade_id
LEFT JOIN houses  h ON h.id = sp.house_id
WHERE (sqlc.narg(search)::text IS NULL OR sp.full_name ILIKE '%' || sqlc.narg(search)::text || '%' OR sp.index_number ILIKE '%' || sqlc.narg(search)::text || '%')
  AND (sqlc.narg(grade)::text IS NULL OR g.name = sqlc.narg(grade)::text)
  AND (sqlc.narg(class)::text IS NULL OR c.name = sqlc.narg(class)::text)
  AND (sqlc.narg(gender)::text IS NULL OR sp.gender = sqlc.narg(gender)::text)
  AND (sqlc.narg(house)::text IS NULL OR h.name = sqlc.narg(house)::text)
ORDER BY
    -- Whitelisted by httpx.ParseSort; an empty key keeps the default name order.
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND NOT sqlc.arg(sort_desc)::bool THEN sp.full_name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'name' AND sqlc.arg(sort_desc)::bool THEN sp.full_name END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'index' AND NOT sqlc.arg(sort_desc)::bool THEN sp.index_number END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'index' AND sqlc.arg(sort_desc)::bool THEN sp.index_number END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'grade' AND NOT sqlc.arg(sort_desc)::bool THEN g.sort_order END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'grade' AND sqlc.arg(sort_desc)::bool THEN g.sort_order END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'class' AND NOT sqlc.arg(sort_desc)::bool THEN c.name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'class' AND sqlc.arg(sort_desc)::bool THEN c.name END DESC,
    CASE WHEN sqlc.arg(sort_key)::text = 'house' AND NOT sqlc.arg(sort_desc)::bool THEN h.name END ASC,
    CASE WHEN sqlc.arg(sort_key)::text = 'house' AND sqlc.arg(sort_desc)::bool THEN h.name END DESC,
    sp.full_name ASC, sp.id ASC
LIMIT sqlc.arg(page_limit)::int OFFSET sqlc.arg(page_offset)::int;

-- name: UpdateStudentProfile :one
UPDATE student_profiles
SET
    full_name       = $2,
    address         = $3,
    phone           = $4,
    whatsapp        = $5,
    special_remarks = $6,
    gender          = $7,
    updated_at      = NOW()
WHERE id = $1
RETURNING *;

-- name: GetStudentWithClass :one
SELECT
    sp.*,
    u.email       AS email,
    c.name        AS class_name,
    g.name        AS grade_name,
    h.name        AS house_name,
    ay.label      AS academic_year
FROM student_profiles sp
LEFT JOIN users u            ON u.id = sp.user_id
LEFT JOIN class_students cs ON cs.student_id = sp.id
LEFT JOIN classes c         ON c.id = cs.class_id
LEFT JOIN grades g          ON g.id = c.grade_id
LEFT JOIN houses h          ON h.id = sp.house_id
LEFT JOIN academic_years ay ON ay.id = c.academic_year_id AND ay.is_current = TRUE
WHERE sp.id = $1;

-- name: ListStudentsByClass :many
SELECT
    sp.*
FROM student_profiles sp
INNER JOIN class_students cs ON cs.student_id = sp.id
WHERE cs.class_id = $1
ORDER BY sp.full_name ASC;


-- name: DeleteStudentProfile :exec
DELETE FROM student_profiles
WHERE id = $1;

-- name: ListStudentsPastRetention :many
-- Left students whose retention window (S11) has elapsed and who haven't
-- already been anonymised — the nightly retention agent's purge candidates.
SELECT id, user_id, full_name, left_at
FROM student_profiles
WHERE enrollment_status = 'left'
  AND erased_at IS NULL
  AND left_at IS NOT NULL
  AND left_at < NOW() - make_interval(years => sqlc.arg(retention_years)::int)
ORDER BY left_at;

-- name: AnonymizeStudentProfile :exec
-- Scrubs personal data from a profile without deleting the row, so
-- historical marks/attendance stay attributable in aggregate without
-- retaining the identifying details (S11's "erase person" flow and the
-- nightly retention purge both call this). index_number is kept: it's
-- already printed on physical records the school retains regardless, and
-- removing it would break the FK-based historical reports it anchors.
UPDATE student_profiles
SET
    full_name       = 'Erased Student',
    address         = NULL,
    phone           = NULL,
    whatsapp        = NULL,
    special_remarks = NULL,
    gender          = NULL,
    erased_at       = NOW(),
    updated_at      = NOW()
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;