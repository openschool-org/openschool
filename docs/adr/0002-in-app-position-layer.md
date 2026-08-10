# 0002. In-app position/hierarchy layer instead of new IDP roles

**Status:** Accepted

## Context

Sri Lankan government schools have a leadership hierarchy beyond the flat
`teacher` role: Principal, Vice Principal, Section Head, Class Teacher,
Subject Teacher. This hierarchy needed to affect notification permissions
and dashboard framing. The obvious options were (a) add new roles in
ThunderID and carry them in the `roles` JWT claim, matching the pattern
already used for the four base roles, or (b) model the hierarchy entirely
inside OpenSchool's own schema, on top of the base `teacher` role.

## Decision

Model the position hierarchy as an **in-app layer**
(`teacher_positions`, `vice_principal_grade_scopes`, plus the pre-existing
`section_heads` and `classes.form_teacher_id`/`class_subject_teachers`),
computed on demand (`PositionService.RankForTeacher`) rather than stored
as a new IDP role or a single stored rank column.

## Consequences

- **Avoids repeating a known failure mode.** Per
  [ADR 0001](./0001-thunderid-as-sole-identity-provider.md), hand-typed
  IDP-side strings have already caused two silent production failures.
  Adding new IDP roles for five more position types would multiply that
  exact risk across every environment's out-of-repo ThunderID console
  configuration.
- **Section Head, Class Teacher, and Subject Teacher already existed**
  under different names/tables before this decision (`section_heads`,
  `classes.form_teacher_id`, `class_subject_teachers`) — only Principal
  and Vice Principal needed new schema, reusing the same "in-app overlay
  on a base role" pattern that already proved out.
- **Rank is computed, not stored.** `RankForTeacher` checks each
  mechanism in order (Principal/Vice Principal directly, since they're
  permanent; Section Head/Class Teacher/Subject Teacher against a given
  academic year, since those are legitimately year-scoped) rather than
  maintaining a denormalized rank column that could drift out of sync.
- **Only Principal and Vice Principal are permanent (not year-scoped).**
  Section Head, Class Teacher, and Subject Teacher assignments correctly
  expire at academic-year boundaries, matching how those roles actually
  work in practice (a TIC assignment is renewed yearly; a Principal
  appointment isn't).
