-- name: CreateTimetable :one
INSERT INTO timetables (academic_year_id, class_id, version, status, parent_timetable_id, created_by)
VALUES ($1, $2, $3, 'draft', $4, $5)
RETURNING *;

-- name: GetTimetableByID :one
SELECT * FROM timetables
WHERE id = $1;

-- name: GetMaxVersionForClass :one
SELECT COALESCE(MAX(version), 0)::int FROM timetables
WHERE class_id = $1 AND academic_year_id = $2;

-- name: ListTimetablesByClass :many
SELECT
    t.*,
    c.name  AS class_name,
    g.name  AS grade_name
FROM timetables t
INNER JOIN classes c ON c.id = t.class_id
INNER JOIN grades g  ON g.id = c.grade_id
WHERE t.class_id = $1 AND t.academic_year_id = $2
ORDER BY t.version DESC;

-- name: ListTimetablesByAcademicYear :many
SELECT
    t.*,
    c.name  AS class_name,
    g.name  AS grade_name
FROM timetables t
INNER JOIN classes c ON c.id = t.class_id
INNER JOIN grades g  ON g.id = c.grade_id
WHERE t.academic_year_id = $1
ORDER BY g.sort_order ASC, c.name ASC, t.version DESC;

-- name: GetPublishedTimetableForClass :one
SELECT * FROM timetables
WHERE class_id = $1 AND academic_year_id = $2 AND status = 'published';

-- name: ListPublishedTimetablesForTeacher :many
-- every published timetable (any class) the teacher has at least one entry in, for the given year
SELECT DISTINCT t.*
FROM timetables t
INNER JOIN timetable_entries te ON te.timetable_id = t.id
WHERE t.academic_year_id = $1 AND t.status = 'published' AND te.teacher_id = $2;

-- name: ListUnderReviewTimetablesForGrades :many
SELECT
    t.*,
    c.name  AS class_name,
    g.name  AS grade_name
FROM timetables t
INNER JOIN classes c ON c.id = t.class_id
INNER JOIN grades g  ON g.id = c.grade_id
WHERE t.academic_year_id = $1
  AND t.status = 'under_review'
  AND c.grade_id = ANY($2::uuid[])
ORDER BY g.sort_order ASC, c.name ASC;

-- name: SubmitTimetableForReview :one
UPDATE timetables
SET status = 'under_review', submitted_at = NOW(), submitted_by = $2, updated_at = NOW()
WHERE id = $1 AND status = 'draft'
RETURNING *;

-- name: ApproveTimetable :one
UPDATE timetables
SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_comments = $3, updated_at = NOW()
WHERE id = $1 AND status = 'under_review'
RETURNING *;

-- name: RejectTimetable :one
UPDATE timetables
SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_comments = $3, updated_at = NOW()
WHERE id = $1 AND status = 'under_review'
RETURNING *;

-- name: PublishTimetable :one
UPDATE timetables
SET status = 'published', published_at = NOW(), published_by = $2, updated_at = NOW()
WHERE id = $1 AND status = 'approved'
RETURNING *;

-- name: ArchivePublishedForClass :exec
UPDATE timetables
SET status = 'archived', updated_at = NOW()
WHERE class_id = $1 AND academic_year_id = $2 AND status = 'published';

-- name: ArchiveTimetable :one
UPDATE timetables
SET status = 'archived', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteDraftTimetable :execrows
DELETE FROM timetables
WHERE id = $1 AND status = 'draft';
