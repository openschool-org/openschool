-- The name shown in the interface: the name with initials, or the full name for records without one.
-- NULL in, NULL out, so it is safe on LEFT JOINed rows (e.g. a class with no teacher).
CREATE FUNCTION display_name(full_name TEXT, name_with_initials TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT COALESCE(NULLIF(name_with_initials, ''), full_name)
$$;
