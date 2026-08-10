# 0003. Single school, single current academic year per deployment

**Status:** Accepted

## Context

Almost every academic query (class rosters, attendance, marks, timetables,
section heads, prefects) needs to know "which academic year are we
talking about right now" without every caller having to pass a year
explicitly. Similarly, the system needed exactly one school profile per
deployment rather than a multi-tenant model.

## Decision

- Exactly one `school` row exists per deployment (a convention, not a DB
  constraint beyond application logic).
- Exactly one `academic_years` row has `is_current = true` at a time,
  toggled via `SetCurrentAcademicYear`. Nearly every academic-data query
  implicitly filters by this flag rather than taking an explicit year
  parameter.
- This same flag doubles as promotion's "publish switch" — see
  [`FEATURES.md`'s promotion section](../FEATURES.md#promotion--class-reassignment):
  promotion and class-shuffle write into a **not-yet-current** year, which
  stays fully editable and invisible to the rest of the app until an
  admin flips it current. No separate "draft" schema was needed because
  this invariant already provides one.

## Consequences

- **Not multi-tenant.** Running more than one school on one OpenSchool
  deployment isn't supported; each school needs its own deployment
  (database + backend + frontend).
- **The invariant is application-level, not DB-enforced.** Nothing stops
  two `academic_years` rows from both having `is_current = true` at the
  database level; behavior if that happens is undefined and untested.
  `SetCurrentAcademicYear` is the only sanctioned way to change it.
- **Promotion's preview-then-commit flow gets a "draft" concept for
  free.** This was a deliberate reuse, not an oversight — see
  `docs/plan.md` Phase 5 for the original reasoning.
