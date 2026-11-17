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
| Re-run AURA | Record the new score, duplication and test reach here |

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
