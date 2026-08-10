# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project intends to adopt [Semantic Versioning](https://semver.org/)
once the first tagged release is cut. No versioned releases exist yet — this
file currently tracks development history on `main`/`development` under
`[Unreleased]`.

## [Unreleased]

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

- API-wide per-IP rate limiting (previously limited to the first-run admin
  registration endpoint only).
- Database connection pool sizing tuned for expected load.

### Fixed

- Broken access control on attendance and term-marks endpoints.
- Two N+1 query patterns in list endpoints, batched.
- Swagger UI no longer served outside development builds.

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

---

Earlier history predates this changelog's introduction and is only
reflected in `git log`; see [`docs/plan.md`](docs/plan.md) for the
phase-by-phase narrative of how the feature set above was built.
