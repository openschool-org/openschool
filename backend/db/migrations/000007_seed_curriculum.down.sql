-- Remove all buckets (cascade removes bucket_options)
DELETE FROM subject_buckets
WHERE grade_id IN (
    SELECT id FROM grades
    WHERE name IN (
        'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
        'Grade 6','Grade 7','Grade 8','Grade 9',
        'Grade 10','Grade 11','Grade 12','Grade 13'
    )
);

-- Remove grade-subject assignments
DELETE FROM grade_subjects
WHERE grade_id IN (
    SELECT id FROM grades
    WHERE name IN (
        'Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
        'Grade 6','Grade 7','Grade 8','Grade 9',
        'Grade 10','Grade 11','Grade 12','Grade 13'
    )
);

-- Remove all seeded subjects
DELETE FROM subjects
WHERE code LIKE 'PRI-%'
   OR code LIKE 'GEN-%'
   OR code LIKE 'OL-%'
   OR code LIKE 'AL-%';
