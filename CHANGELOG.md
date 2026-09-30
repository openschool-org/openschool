# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-09-30

### Added

- Self-service account activation for students and guardians with
  school-issued codes: printable slips and CSV, reprinting, revoking,
  activation windows and expiry, then an email link and password setup
  ([ADR 0008](docs/adr/0008-self-service-account-activation.md)).
- Transactional email with branded templates, a Resend, SMTP or console
  sender, and a Settings > Email page with previews and test sends
  ([ADR 0009](docs/adr/0009-transactional-email.md)).
- Names with initials and calling names for students, teachers and
  guardians, shown in lists, registers, printouts and emails.
- Guided year-end workflows with editable proposals and revert: year
  rollover, leavers, subject choices (W3), student intake from CSV (W4),
  promotion and class formation (W5), teacher allocation (W6), timetable
  generation (W7) and go live.
- Per-grade promotion rules, class capacity, A/L stream placement and a
  waiting list for new admissions.
- Timetable option blocks for subject choice groups, and a repair pass that
  closes gaps in teachers' schedules.
- School resource map for homerooms, labs, libraries, halls and other
  facilities, with automatic homeroom creation.
- Preset curriculum loading for subjects.
- Teacher and non-academic staff attendance tabs with search and paging.
- Server-side search and paging for students, teachers, guardians,
  notifications and the audit log.
- Sinhala and Tamil for the student and parent portals, saved per user
  (draft translations).
- Teacher and guardian overview dashboards, and grade and class avatars
  coloured by school section.
- Late counts on class attendance session lists.
- Health check endpoint and Prometheus metrics.

### Changed

- Rebuilt the frontend as feature-first modules with shared UI components,
  utility styles, lazy per-portal routes and ESLint layer rules.
- Navigation grouped into five hubs; timetable pages merged into one hub.
- Password reset now updates credentials through the identity provider.
- Background jobs are declared by the backend and listed on the Automation
  page with their checks, alongside the year-end workflows.
- Class labels read "13-M1" instead of "Grade 13 - 13-M1".
- Notification polling cut to one unread-count request every two minutes,
  only while the tab is visible.

### Security

- Teachers can only reach classes and students they teach or lead (class
  teacher, subject teacher, section head, vice principal or principal).
- NIC numbers, used as initial passwords, are hidden from non-admins.
- Database error details are no longer returned to clients.
- JWT audience check, per-account rate limits on reset and activation,
  request IDs, request timeouts and security headers.
- Structured request logs that leave out search terms and personal data.
- Access logging for student profile reads; data retention and erasure
  support with retry of unfinished identity cleanup.
- Enrolment changes recorded in the audit log.

### Fixed

- Activation emails failing silently when the wrong account type was chosen.
- The Assign class teacher picker losing the selected teacher.
- Guardian NIC numbers missing on the Admin Guardians page.
- Enrolling a student already in another class reported success but did
  nothing.
- Creating a current academic year left two current years.
- The teacher dashboard always showing a pending attendance session.
- Removed attendance marks not being saved, and old notes being saved on
  present records.
- Dates shown in US format; staff attendance totals missing some staff.
- Findings from SonarQube and CodeRabbit reviews.

### Database

- Migrations `000041` to `000054`: trigram search indexes, retention and
  erasure, preferred language, workflow runs, promotion policies, student
  intakes, option blocks, account activation, names with initials,
  encrypted activation codes, a `display_name()` function, and integrity
  rules and indexes.
- The database now allows only one current academic year and one current
  term (see [ADR 0003](docs/adr/0003-single-current-academic-year.md)).
  Check your data has exactly one of each before upgrading.

### Testing

- Integration tests for year-end workflows, account activation, teacher
  access by role, late attendance and the new constraints.
- Frontend component and hook tests, and a blocking dependency audit in CI.

### Documentation

- Added ADR 0008 (self-service activation) and ADR 0009 (transactional
  email); updated ADR 0003 and ADR 0005.
- Updated `docs/FEATURES.md`, `docs/ARCHITECTURE.md`, `docs/SETUP.md` and
  `docs/THUNDERID.md`.
- Updated the PR template.

## [0.2.0] - 2026-09-15

### Added

- NIC-based default passwords for teacher/guardian accounts and index-number
  defaults for students, plus a universal self-service password reset and
  forced first-login password change.
- Class medium (language of instruction) support, wired into the setup
  wizard and promotion's auto-distribution logic.
- Analytics dashboard (student/staff/academic/school-wide aggregates) and
  PDF report export (attendance, marks).
- Staff management: non-academic staff records, staff attendance, and an
  expanded student profile portfolio (progress reports, activities,
  leadership roles, awards, disciplinary records).
- In-app position/leadership hierarchy (Principal, Vice Principal, Section
  Head, Class Teacher, Subject Teacher) layered on top of the base
  ThunderID roles, with position-scoped notification permissions and a
  role-differentiated teacher dashboard.
- Academic year promotion and class reassignment, including marks-based and
  random auto-distribution assist tools.
- Full timetable module: settings, grade sections, classrooms, subject
  period requirements, teacher availability, and a
  draft → validate → submit → review → approve/publish workflow.
- In-app notification system with role/position-scoped recipient targeting
  and a per-user notification center.
- Guardian directory with search, shared-guardian linking, and orphan
  filtering.
- House colors and a self-balancing (least-populated-house) assignment
  algorithm for students and staff.
- Audit log for sensitive changes (house reassignment, attendance-lock
  overrides).
- Attendance session locking (24h) with admin override, and guardian
  absence notifications.
- First-run onboarding: one-time admin registration and a guided School
  Setup wizard (school profile, houses, grades, classes, mediums).
- Switched identity provider integration to ThunderID (previously
  Asgardeo), behind a provider-neutral `internal/identity.Provider` seam.

### Changed

- Completed the backend modular-monolith refactor. Each feature now owns its
  HTTP routes, business logic, database adapter, and API contracts. The old
  shared handler, service, repository, model, and route layers were removed.
- API-wide per-IP rate limiting (previously limited to the first-run admin
  registration endpoint only).
- Database connection pool sizing tuned for expected load.

### Fixed

- Broken access control on attendance and term-marks endpoints.
- Two N+1 query patterns in list endpoints, batched.
- Swagger UI no longer served outside development builds.
- Restored the snake_case JSON API fields used by class and curriculum screens.

### Testing

- Added isolated PostgreSQL integration coverage for every backend module and
  added the suite to backend CI.

### Documentation

- Added [`docs/FEATURES.md`](docs/FEATURES.md), the current as-built
  feature reference.
- Added [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
  [`docs/adr/`](docs/adr/) (Architecture Decision Records) for
  significant, easy-to-relitigate design decisions.
- Added [`audit.md`](audit.md), a standing code-quality and security audit
  with tracked severity/status.
- Added `SECURITY.md`, `CODE_OF_CONDUCT.md`, and this changelog.
- Corrected stale claims in `docs/SETUP.md` (teacher dashboard mock-data
  note; the "starting over" `TRUNCATE TABLE` table list, which was missing
  ~20 tables added by later migrations).
- Added backend and frontend README files, refreshed the root README and
  contributor guide, and simplified environment example files.

## [0.1.0] - 2026-08-11

### Added

- First tagged OpenSchool release.

---

Earlier history predates this changelog's introduction and is only
reflected in `git log`.
