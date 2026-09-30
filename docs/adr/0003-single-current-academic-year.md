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
- This same flag doubles as promotion's "publish switch" - see
  [`FEATURES.md`'s promotion section](../FEATURES.md#promotion--class-reassignment):
  promotion and class-shuffle write into a **not-yet-current** year, which
  stays fully editable and invisible to the rest of the app until an
  admin flips it current. No separate "draft" schema was needed because
  this invariant already provides one.

## Consequences

- **Not multi-tenant.** Running more than one school on one OpenSchool
  deployment isn't supported; each school needs its own deployment
  (database + backend + frontend).
- **The invariant is enforced by the database** since migration 000054:
  a deferred exclusion constraint allows only one current academic year
  and one current term. `SetCurrentAcademicYear` and `SetCurrentTerm`
  flip the old and new rows in one statement, which the deferred check
  permits. Creating a year as current goes through the same toggle.
- **Promotion's preview-then-commit flow gets a "draft" concept for
  free.** This was a deliberate reuse, not an oversight - see
  `docs/plan.md` Phase 5 for the original reasoning.
