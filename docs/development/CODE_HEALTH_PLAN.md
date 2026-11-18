# Code Health Plan

What is still to do. Finished work is in git history (branch `release/v0.4.0`, November 2026).

## Rules

- No behaviour change, no feature work mixed in.
- Tests before the refactor, never after.
- Intake behaviour stays exactly as it is.
- New shared code follows the layer rules in `CLAUDE.md`.
- Every commit keeps these green: `go build`, `go vet`, `staticcheck`, `go test -tags integration`, `pnpm lint`, `pnpm test`, `pnpm build`.

## 1. Guardrails in CI (Phase 6)

| Item | Note |
|---|---|
| ESLint `complexity` rule | Add as a warning at 20 (built-in rule, cyclomatic). Raise to an error once the list in section 2 is cleared |
| `gocognit` in backend CI | Informational first, threshold 25, route registration excluded |
| Coverage output | `go test -cover` and `vitest --coverage` in CI, numbers in the job summary |
| Re-run AURA | Confirm the route-handler split below lifted the readability cap |

## AURA run, 18 Nov 2026

Maintainability 70 / 100.

- **Readable functions: 70.** 146 of 3118 functions over cognitive 15. The score is capped at 70 while any function is over 50; only the inline-closure `Register*Routes` functions were. They now register named handler methods (the pattern in `attendance/routes.go`), so the cap should lift on the next run. The remaining list overlaps sections 2 and 3.
- **Test reach: 23%.** 152 test files reach 23% of code files. This is a static link, not coverage: a Go file counts only when a test in the same package names it, so files exercised by package-level integration tests still show as unlinked. Tests now cover the five top-ranked key files (`useInvalidate`, `Field`, `apierror`, `useT`, `i18nContext`). Next: `lib/` helpers and `hooks/` with logic (for example `school/lib/*`, `timetable/lib/*`, `usePromotionPlan`, `useMarksDraft`), then backend `service.go` files with no unit test (`leave`, `leadership`, `studentleadership`). Do not write tests for `models.go`, `keys.ts`, `constants.ts` or route tables just to raise the number.

## 2. Frontend functions over 20 (ESLint cyclomatic, 17 Nov 2026)

Split the same way as the finished pages: logic into `features/<name>/hooks/` or `lib/` with tests, markup into `components/`.

| Score | Function |
|---|---|
| 50 | `reports/pages/admin/Dashboard` |
| 32 | `marks/pages/teacher/TeacherMarks` |
| 30 | `teachers/pages/self/TeacherDashboard` |
| 27 | `timetable/pages/admin/TimetableEditor`, `teachers/pages/self/TeacherClasses` |
| 24 | `guardians/components/GuardianDetail`, `academics/pages/admin/ClassDetail` |
| 23 | `workflows/pages/admin/WorkflowPage`, `school/hooks/useSchoolSetupState`, `reports/pages/admin/Reports`, `academics/components/ClassFormModal` |
| 22 | `timetable/pages/admin/GradeSections`, `portfolio/pages/admin/Societies`, `academics/pages/admin/AddClass` |
| 21 | `timetable/pages/admin/Timetables` |

Also from the old priority 11 list: `school/pages/admin/SchoolSetup` (18).

## 3. Backend functions over 25 (gocognit, 17 Nov 2026)

All are under 50, so these are optional. Route registration (`Register*Routes`) is skipped on purpose.

| Score | Function |
|---|---|
| 32 | `attendance (*Service).MarkAttendance` |
| 30 | `academics (*enrollmentService).validate` |
| 29 | `workflows (Timetable).build`, `dashboard (*Service).Analytics` |
| 28 | `workflows (Timetable).Check` |
| 27 | `workflows parseStudentCSV`, `automation (*IdentityErasureRetryAgent).Run` |
| 26 | `workflows (YearRollover).Apply`, `workflows (Timetable).planBlocks`, `timetable (*validationService).validate` |

## 4. Open decisions

| Item | Note |
|---|---|
| F2 | `AddStudent` uses an antd `Form`, `AddTeacher` uses controlled state. Sharing their email and phone fields means moving `AddTeacher` to antd `Form`, which changes its behaviour (Save is disabled until valid today). Do it only if `AddTeacher` is reworked for another reason |
| Shared UUID helper | `httpx.ParamUUID` / `QueryUUID` exist but about 80 handlers still parse UUIDs by hand. Move them over module by module if wanted |
| Page headers | 11 pages keep hand-written `os-page__header` markup because their subtitle is a `div` or holds extra content. `PageHeader` could take a `subtitleTip` prop to cover them |
