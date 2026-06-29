-- Drop name uniqueness so the same subject name can exist at different levels
-- (e.g. "Mathematics" exists as GEN-M01, OL-M04, AL-07, PRI-03)
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_name_key;

-- ============================================================
-- Grades 1–5: Primary Education subjects
-- ============================================================
INSERT INTO subjects (name, code) VALUES
    ('First Language (Sinhala or Tamil)',     'PRI-01'),
    ('Second Language (English)',              'PRI-02'),
    ('Mathematics',                            'PRI-03'),
    ('Environmental Related Activities',       'PRI-04'),
    ('Religion',                               'PRI-05'),
    ('Aesthetic Education',                    'PRI-06'),
    ('Health & Physical Education',            'PRI-07')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Grades 6–9: General (lower secondary) subjects
-- ============================================================
INSERT INTO subjects (name, code) VALUES
    ('First Language (Sinhala)',                   'GEN-L01'),
    ('First Language (Tamil)',                     'GEN-L02'),
    ('Second National Language (Tamil)',           'GEN-L03'),
    ('Second National Language (Sinhala)',         'GEN-L04'),
    ('English',                                    'GEN-L05'),
    ('Mathematics',                                'GEN-M01'),
    ('Science',                                    'GEN-S01'),
    ('History',                                    'GEN-SS01'),
    ('Geography',                                  'GEN-SS02'),
    ('Civic Education',                            'GEN-SS03'),
    ('Religion (Buddhism)',                        'GEN-R01'),
    ('Religion (Hinduism)',                        'GEN-R02'),
    ('Religion (Islam)',                           'GEN-R03'),
    ('Religion (Christianity)',                    'GEN-R04'),
    ('Health & Physical Education',                'GEN-P01'),
    ('Art',                                        'GEN-AE01'),
    ('Music',                                      'GEN-AE02'),
    ('Dancing',                                    'GEN-AE03'),
    ('Practical & Technical Skills',               'GEN-T01'),
    ('Information & Communication Technology',     'GEN-T02')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Grades 10–11: O/L subjects
-- ============================================================

-- Compulsory
INSERT INTO subjects (name, code) VALUES
    ('First Language (Sinhala)',  'OL-M01'),
    ('First Language (Tamil)',    'OL-M02'),
    ('English',                   'OL-M03'),
    ('Mathematics',               'OL-M04'),
    ('Science',                   'OL-M05'),
    ('History',                   'OL-M06'),
    ('Buddhism',                  'OL-M07'),
    ('Catholicism',               'OL-M08'),
    ('Christianity',              'OL-M09'),
    ('Islam',                     'OL-M10'),
    ('Shaivism',                  'OL-M11')
ON CONFLICT (code) DO NOTHING;

-- Basket 1: Academic & Languages
INSERT INTO subjects (name, code) VALUES
    ('Business & Accounting Studies', 'OL-B1-01'),
    ('Geography',                     'OL-B1-02'),
    ('Civic Education',               'OL-B1-03'),
    ('Entrepreneurship Studies',      'OL-B1-04'),
    ('Sinhala (Second Language)',     'OL-B1-L01'),
    ('Tamil (Second Language)',       'OL-B1-L02'),
    ('French',                        'OL-B1-L03'),
    ('German',                        'OL-B1-L04'),
    ('Hindi',                         'OL-B1-L05'),
    ('Japanese',                      'OL-B1-L06'),
    ('Arabic',                        'OL-B1-L07'),
    ('Korean',                        'OL-B1-L08'),
    ('Chinese',                       'OL-B1-L09'),
    ('Russian',                       'OL-B1-L10'),
    ('Pali',                          'OL-B1-L11'),
    ('Sanskrit',                      'OL-B1-L12')
ON CONFLICT (code) DO NOTHING;

-- Basket 2: Arts & Literature
INSERT INTO subjects (name, code) VALUES
    ('Music (Oriental)',                         'OL-B2-01'),
    ('Music (Western)',                          'OL-B2-02'),
    ('Music (Carnatic)',                         'OL-B2-03'),
    ('Dancing (Indigenous)',                     'OL-B2-04'),
    ('Dancing (Bharatha)',                       'OL-B2-05'),
    ('Art',                                      'OL-B2-06'),
    ('Drama & Theatre',                          'OL-B2-07'),
    ('Appreciation of English Literary Texts',   'OL-B2-08'),
    ('Appreciation of Sinhala Literary Texts',   'OL-B2-09'),
    ('Appreciation of Tamil Literary Texts',     'OL-B2-10'),
    ('Appreciation of Arabic Literary Texts',    'OL-B2-11')
ON CONFLICT (code) DO NOTHING;

-- Basket 3: Technology & Practical Studies
INSERT INTO subjects (name, code) VALUES
    ('Information & Communication Technology',     'OL-B3-01'),
    ('Agriculture & Food Technology',              'OL-B3-02'),
    ('Aquatic Bio-resources Technology',           'OL-B3-03'),
    ('Design & Construction Technology',           'OL-B3-04'),
    ('Design & Mechanical Technology',             'OL-B3-05'),
    ('Design, Electrical & Electronic Technology', 'OL-B3-06'),
    ('Arts & Crafts',                              'OL-B3-07'),
    ('Home Economics',                             'OL-B3-08'),
    ('Health & Physical Education',                'OL-B3-09'),
    ('Communication & Media Studies',              'OL-B3-10'),
    ('Electronic Writing & Shorthand',             'OL-B3-11')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Grades 12–13: A/L subjects — official examination codes
-- ============================================================
INSERT INTO subjects (name, code) VALUES
    ('Physics',                                    'AL-01'),
    ('Chemistry',                                  'AL-02'),
    ('Mathematics',                                'AL-07'),
    ('Agricultural Science',                       'AL-08'),
    ('Biology',                                    'AL-09'),
    ('Combined Mathematics',                       'AL-10'),
    ('Higher Mathematics',                         'AL-11'),
    ('Common General Test',                        'AL-12'),
    ('General English',                            'AL-13'),
    ('Civil Technology',                           'AL-14'),
    ('Mechanical Technology',                      'AL-15'),
    ('Electrical, Electronic & IT',                'AL-16'),
    ('Food Technology',                            'AL-17'),
    ('Agriculture Technology',                     'AL-18'),
    ('BioResource Technology',                     'AL-19'),
    ('Information & Communication Technology',     'AL-20'),
    ('Economics',                                  'AL-21'),
    ('Geography',                                  'AL-22'),
    ('Political Science',                          'AL-23'),
    ('Logic and Scientific Method',                'AL-24'),
    ('History of Sri Lanka',                       'AL-25'),
    ('History of India',                           'AL-25A'),
    ('History of Europe',                          'AL-25B'),
    ('Modern World History',                       'AL-25C'),
    ('Home Economics',                             'AL-28'),
    ('Communication & Media Studies',              'AL-29'),
    ('Business Statistics',                        'AL-31'),
    ('Business Studies',                           'AL-32'),
    ('Accountancy',                                'AL-33'),
    ('Buddhism',                                   'AL-41'),
    ('Hinduism',                                   'AL-42'),
    ('Christianity',                               'AL-43'),
    ('Islam',                                      'AL-44'),
    ('Buddhist Civilization',                      'AL-45'),
    ('Hindu Civilization',                         'AL-46'),
    ('Islam Civilization',                         'AL-47'),
    ('Greek and Roman Civilization',               'AL-48'),
    ('Christian Civilization',                     'AL-49'),
    ('Art',                                        'AL-51'),
    ('Dancing (Indigenous)',                       'AL-52'),
    ('Dancing (Bharatha)',                         'AL-53'),
    ('Music (Oriental)',                           'AL-54'),
    ('Music (Carnatic)',                           'AL-55'),
    ('Music (Western)',                            'AL-56'),
    ('Drama and Theatre (Sinhala)',                'AL-57'),
    ('Drama and Theatre (Tamil)',                  'AL-58'),
    ('Drama and Theatre (English)',                'AL-59'),
    ('Engineering Technology',                     'AL-65'),
    ('Biosystems Technology',                      'AL-66'),
    ('Science for Technology',                     'AL-67'),
    ('Sinhala',                                    'AL-71'),
    ('Tamil',                                      'AL-72'),
    ('English',                                    'AL-73'),
    ('Pali',                                       'AL-74'),
    ('Sanskrit',                                   'AL-75'),
    ('Arabic',                                     'AL-78'),
    ('Malay',                                      'AL-79'),
    ('French',                                     'AL-81'),
    ('German',                                     'AL-82'),
    ('Russian',                                    'AL-83'),
    ('Hindi',                                      'AL-84'),
    ('Chinese',                                    'AL-86'),
    ('Japanese',                                   'AL-87')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Seed grades 1–13 (idempotent)
-- ============================================================
INSERT INTO grades (name, sort_order) VALUES
    ('Grade 1',  1),
    ('Grade 2',  2),
    ('Grade 3',  3),
    ('Grade 4',  4),
    ('Grade 5',  5),
    ('Grade 6',  6),
    ('Grade 7',  7),
    ('Grade 8',  8),
    ('Grade 9',  9),
    ('Grade 10', 10),
    ('Grade 11', 11),
    ('Grade 12', 12),
    ('Grade 13', 13)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Grade-subject assignments
-- ============================================================

-- Grades 1–5: all PRI- subjects
INSERT INTO grade_subjects (grade_id, subject_id)
SELECT g.id, s.id
FROM grades g CROSS JOIN subjects s
WHERE g.name IN ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5')
  AND s.code LIKE 'PRI-%'
ON CONFLICT DO NOTHING;

-- Grades 6–9: all GEN- subjects
INSERT INTO grade_subjects (grade_id, subject_id)
SELECT g.id, s.id
FROM grades g CROSS JOIN subjects s
WHERE g.name IN ('Grade 6','Grade 7','Grade 8','Grade 9')
  AND s.code LIKE 'GEN-%'
ON CONFLICT DO NOTHING;

-- Grades 10–11: all OL- subjects
INSERT INTO grade_subjects (grade_id, subject_id)
SELECT g.id, s.id
FROM grades g CROSS JOIN subjects s
WHERE g.name IN ('Grade 10','Grade 11')
  AND s.code LIKE 'OL-%'
ON CONFLICT DO NOTHING;

-- Grades 12–13: all AL- subjects
INSERT INTO grade_subjects (grade_id, subject_id)
SELECT g.id, s.id
FROM grades g CROSS JOIN subjects s
WHERE g.name IN ('Grade 12','Grade 13')
  AND s.code LIKE 'AL-%'
ON CONFLICT DO NOTHING;

-- ============================================================
-- O/L elective baskets — grades 10 & 11
-- ============================================================
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, b.name
FROM grades g
CROSS JOIN (VALUES
    ('Basket 1: Academic & Languages'),
    ('Basket 2: Arts & Literature'),
    ('Basket 3: Technology & Practical')
) AS b(name)
WHERE g.name IN ('Grade 10','Grade 11')
ON CONFLICT (grade_id, name) DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Basket 1: Academic & Languages'
  AND g.name IN ('Grade 10','Grade 11')
  AND s.code LIKE 'OL-B1-%'
ON CONFLICT DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Basket 2: Arts & Literature'
  AND g.name IN ('Grade 10','Grade 11')
  AND s.code LIKE 'OL-B2-%'
ON CONFLICT DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Basket 3: Technology & Practical'
  AND g.name IN ('Grade 10','Grade 11')
  AND s.code LIKE 'OL-B3-%'
ON CONFLICT DO NOTHING;

-- ============================================================
-- A/L stream buckets — grades 12 & 13
-- ============================================================
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, b.name
FROM grades g
CROSS JOIN (VALUES
    ('Physical Science'),
    ('Biological Science'),
    ('Technology'),
    ('Commerce'),
    ('Arts')
) AS b(name)
WHERE g.name IN ('Grade 12','Grade 13')
ON CONFLICT (grade_id, name) DO NOTHING;

-- Physical Science: Physics, Combined Maths, Chemistry / ICT
INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN ('AL-01','AL-02','AL-10','AL-20')
WHERE sb.name = 'Physical Science'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;

-- Biological Science: Biology, Chemistry, Physics / Agricultural Science
INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN ('AL-09','AL-02','AL-01','AL-08')
WHERE sb.name = 'Biological Science'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;

-- Technology: Engineering Tech / Biosystems Tech, Science for Technology, ICT
INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN ('AL-65','AL-66','AL-67','AL-20')
WHERE sb.name = 'Technology'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;

-- Commerce: Accountancy, Business Studies, Economics
INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN ('AL-21','AL-32','AL-33')
WHERE sb.name = 'Commerce'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;

-- Arts: any 3 from the approved list
INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN (
    'AL-21','AL-22','AL-23','AL-24',
    'AL-25','AL-25A','AL-25B','AL-25C',
    'AL-28','AL-29',
    'AL-41','AL-42','AL-43','AL-44',
    'AL-45','AL-46','AL-47','AL-48','AL-49',
    'AL-51','AL-52','AL-53','AL-54','AL-55','AL-56',
    'AL-57','AL-58','AL-59',
    'AL-71','AL-72','AL-73','AL-74','AL-75',
    'AL-78','AL-79',
    'AL-81','AL-82','AL-83','AL-84','AL-86','AL-87'
)
WHERE sb.name = 'Arts'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Compulsory buckets for all grades 1–13
-- ============================================================

-- Grades 1–5
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, 'Compulsory' FROM grades g
WHERE g.name IN ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5')
ON CONFLICT (grade_id, name) DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Compulsory'
  AND g.name IN ('Grade 1','Grade 2','Grade 3','Grade 4','Grade 5')
  AND s.code LIKE 'PRI-%'
ON CONFLICT DO NOTHING;

-- Grades 6–9
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, 'Compulsory' FROM grades g
WHERE g.name IN ('Grade 6','Grade 7','Grade 8','Grade 9')
ON CONFLICT (grade_id, name) DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Compulsory'
  AND g.name IN ('Grade 6','Grade 7','Grade 8','Grade 9')
  AND s.code LIKE 'GEN-%'
ON CONFLICT DO NOTHING;

-- Grades 10–11
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, 'Compulsory' FROM grades g
WHERE g.name IN ('Grade 10','Grade 11')
ON CONFLICT (grade_id, name) DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
CROSS JOIN subjects s
WHERE sb.name = 'Compulsory'
  AND g.name IN ('Grade 10','Grade 11')
  AND s.code LIKE 'OL-M%'
ON CONFLICT DO NOTHING;

-- Grades 12–13
INSERT INTO subject_buckets (grade_id, name)
SELECT g.id, 'Compulsory' FROM grades g
WHERE g.name IN ('Grade 12','Grade 13')
ON CONFLICT (grade_id, name) DO NOTHING;

INSERT INTO subject_bucket_options (bucket_id, subject_id)
SELECT sb.id, s.id
FROM subject_buckets sb
JOIN grades g ON sb.grade_id = g.id
JOIN subjects s ON s.code IN ('AL-12','AL-13')
WHERE sb.name = 'Compulsory'
  AND g.name IN ('Grade 12','Grade 13')
ON CONFLICT DO NOTHING;
