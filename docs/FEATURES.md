# OpenSchool - Feature Guide

This is the current, as-built feature list - what exists in the codebase today,
organized by module. For the reasoning behind key decisions, see the
[ADRs](./adr/), and for release history the [changelog](../CHANGELOG.md). For how to stand up an
instance and walk through these features hands-on, see the [server](./setup/server.md) and
[school](./setup/school.md) setup guides.

Every feature below is scoped by **academic year**: almost all academic data
(classes, enrollments, attendance, marks, timetables, section heads, prefects)
carries an `academic_year_id` and is filtered by the single `academic_years`
row with `is_current = true`. There is no separate "draft year" concept -
promotion and class-shuffle write into a not-yet-current year, which stays
fully editable until an admin flips it current.

## Modules

| Guide | Covers |
| --- | --- |
| [Roles and accounts](./features/roles-and-accounts.md) | Roles & positions, Identity, accounts & password lifecycle |
| [School structure and curriculum](./features/school-and-curriculum.md) | School setup & academic structure, Curriculum |
| [People](./features/people.md) | People |
| [Attendance and academic records](./features/attendance-and-records.md) | Attendance, Academic records |
| [Year-end workflows and promotion](./features/year-end.md) | Year-end workflows, Promotion & class reassignment |
| [Timetable](./features/timetable.md) | Timetable |
| [Notifications, reports and automation](./features/communication-and-reports.md) | Notifications, Reports & analytics, Audit log, Automation |

## Portals at a glance

There is one sign-in page; which portal a user lands on is decided entirely
by the `roles` claim on their token (never a separate URL per role):

| Role | Landing experience |
| --- | --- |
| **Admin** | Full dashboard: everything above |
| **Teacher** | Own dashboard (today's attendance with progress, stat tiles, recent sessions with present/absent/late, quick actions, rank badge), classes with class and qualified subjects, attendance marking, My Timetable, Review Timetables (if Section Head+), My Leave (and Teacher Leave approvals for the Principal and Vice Principals), Notifications scoped to their own classes/grades/subjects |
| **Student** | Own profile, attendance history, term marks, timetable (once published), Notification Center |
| **Parent** | Overview with attendance this month across children, each child's attendance and latest average, and recent notices; per child, attendance/marks/timetable; own Notification Center |

A parent or student can only ever see their own (or their own child's) data
- enforced server-side.

## Cross-cutting / non-functional

- **RBAC** - Gin route groups gated by `RequireRole`, checked against the
  JWT's `roles` claim; teacher-side actions are further scoped by the
  position/assignment checks described above (`RequireClassAccess`) rather
  than by role alone.
- **Error responses** - database error details never reach the browser;
  known cases get a plain message and anything else a generic error with a
  request id for the logs.
- **Rate limiting** - a per-client-IP token-bucket limiter applies API-wide
  (default 30 rps, burst 60, tunable via env), plus a matching per-account
  limiter for signed-in requests, on top of a stricter limiter on the
  one-time admin-registration endpoint and per-account limits on password
  reset and activation. Behind a proxy, `TRUSTED_PROXIES` must name it.
  Idle limiter entries are swept after 30 minutes.
- **Security headers** - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  and `Referrer-Policy: same-origin` are set on every API response; the
  frontend's nginx adds `frame-ancestors 'none'`, and the reference proxy
  config in `deploy/` sets the full CSP.
- **CORS** - explicit allow-list via `CORS_ORIGINS`, credentials enabled.
- **Swagger/OpenAPI** - dev-only docs at `http://localhost:8080/swagger/index.html#/`
  (`APP_ENV=development`), not exposed in production. It is a frozen snapshot
  that misses newer endpoints ([ADR 0007](./adr/0007-plain-comments-over-swaggo.md)).
- **Migrations** - versioned, numbered SQL migrations (`golang-migrate`),
  applied automatically on backend startup; schema is the single source of
  truth for the generated `sqlc` query layer.
