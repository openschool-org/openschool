-- Sri Lankan names don't split into first and last names. Keep the full name, plus the
-- name with initials used on registers and reports (e.g. H.A.H.E. Wickramasinghe) and an
-- optional calling name used in greetings (e.g. Hasitha).

ALTER TABLE student_profiles
    ADD COLUMN name_with_initials VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN calling_name       VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE teacher_profiles
    ADD COLUMN name_with_initials VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN calling_name       VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE guardians
    ADD COLUMN name_with_initials VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN calling_name       VARCHAR(100) NOT NULL DEFAULT '';

-- Same rule as internal/names.WithInitials: an initial for every word but the last, then the last word.
CREATE FUNCTION os_tmp_name_with_initials(full_name TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    WITH w AS (
        SELECT word, ord, COUNT(*) OVER () AS n
        FROM regexp_split_to_table(btrim(replace(full_name, '.', '. ')), '\s+') WITH ORDINALITY AS t(word, ord)
        WHERE word <> ''
    )
    SELECT CASE
        WHEN MAX(n) IS NULL THEN ''
        WHEN MAX(n) = 1 THEN MAX(word)
        ELSE COALESCE(NULLIF(STRING_AGG(
                 CASE WHEN ord < n AND regexp_replace(word, '[^[:alpha:]]', '', 'g') <> ''
                      THEN upper(left(regexp_replace(word, '[^[:alpha:]]', '', 'g'), 1)) || '.' END,
                 '' ORDER BY ord), '') || ' ', '')
             || rtrim(MAX(CASE WHEN ord = n THEN word END), '.')
    END
    FROM w
$$;

UPDATE student_profiles SET name_with_initials = os_tmp_name_with_initials(full_name);
UPDATE teacher_profiles SET name_with_initials = os_tmp_name_with_initials(full_name);
UPDATE guardians        SET name_with_initials = os_tmp_name_with_initials(full_name);

DROP FUNCTION os_tmp_name_with_initials(TEXT);
