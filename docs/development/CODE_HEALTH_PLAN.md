# Code Health Plan

Status: approved 16 Oct 2026. Phase 0 done. Updated 16 Nov 2026 with the AURA report; the new items (marked "new") still need approval. Phases 2 and 3 mostly done, 4 and 5 started on 16 Nov 2026; see section 9.

Sources:

- Code-health report of 16 Oct 2026 (hardest functions, duplicated blocks, module balance).
- AURA Engineering Score v3 of 16 Nov 2026: 72, grade C, "Needs work" (734 code files, 12 of 16 checks measured).

## 1. Goals

- Every function is readable in one sitting. Target: cognitive complexity under 25 for new code, under 50 for any existing function after this plan.
- A rule or form lives in one place, so a bug is fixed once.
- The risky files have tests that link to them.
- Behaviour does not change. This is a refactor only.

## 2. What the reports say

### 16 Oct report

| Section | Finding | Action |
|---|---|---|
| Hardest functions | 26 functions over the limit; 9 have no tests | Phases 1, 3, 5 |
| Duplicated blocks | 51 pairs; about 30 are real, the rest are normal boilerplate | Phases 2, 4 |
| Module balance | "No modules with classes" | Nothing to do. The metric is for class-based code; Go and React here do not use classes |
| Unused exports | 7 candidates | Done in Phase 0, see section 3a |
| HTTP timeouts | JWKS client in `middleware/auth.go` had no timeout | Done in Phase 0: 10s timeout |

### 16 Nov AURA report (new)

| Check | Score | Finding | Action |
|---|---|---|---|
| Test reach (static links) | 20, at risk | 20% of code files linked to a test (118 test files: 96 Go, 22 frontend) | Section 4a, Phases 1 and 6 |
| Readable functions | 50, at risk | 165 of 2909 functions over cognitive 15; 22 over 50; worst 159. Score is capped at 50 while any function is over 100, and at 70 while any is over 50 | Section 4, Phases 3 and 5 |
| Little duplication | 78, needs work | 5.2% of lines duplicated (3656 lines). Full marks at 3% or less | Section 3, Phases 2 and 4 |
| Risk hotspots | 2 high | `notifications/service.go` (59), `timetable/repository.go` (51) | Priorities 8 and 12 |
| Unused exports | 2 candidates | Names not in the shared report | Check on the next run |
| Everything else | 88-100, good | Queries in loops, accessible controls, timeouts, file size, cycles, hosts, config | Nothing to do |
| Security, compatibility, functional suitability | Not measured | Static analysis cannot score these | Covered by `docs/development/issue.md` and the security audit |

## 3. Duplicates: real vs ignore

Checked by reading each pair.

### Fix (real duplication)

| ID | Where | What to share |
|---|---|---|
| B1 | `workflows/intake.go` and `student_import.go` (23, 14, 13 lines) | One helper that loads taken index numbers and known guardians by NIC, then creates the students. Intake behaviour must stay identical |
| B2 | `workflows/choices.go`, `intake.go`, `teacher_allocation.go`, `promotion.go` (11-12 lines) | One `defaultYearFields(years)` helper for "current year, next year" defaults |
| B3 | `people/repository.go` (4 copies, 13 lines) | One `pageTotal` helper for the "offset past last page" re-probe |
| B4 | `selfservice/teacher.go` (2 copies), `selfservice/parent.go` (2 copies) | One `resolveTeacher(c)` / `resolveParent(c)` that returns caller, profile id and year, or writes the error |
| B5 | `people/student_portfolio_routes.go` (4 copies) | One parse-and-respond helper for the delete handlers |
| B6 | `timetable/repository.go` 387 and 763 | Keep one reviewer lookup |
| B7 | `academics/classes.go`, `attendance/staff_routes.go`, `curriculum/repository.go`, `automation/structural_integrity.go`, `timetable/subject_period_requirement.go` vs `teacher_availability.go` | Small local helpers, low priority |
| B8 (new) | `automation/people_compliance.go` 82 and `structural_integrity.go` 81, 150 | One helper: run a student check, wrap the error, return empty or a name list |
| F1 | `EditGuardianModal` and `AddGuardianModal` (38 lines) | `GuardianFields` component in `features/guardians/components` |
| F2 | `AddStudent` and `AddTeacher` (24 + 11 lines) | `ContactFields` component (names, email, phone with validation) in `shared/ui` |
| F3 | `ErrorBoundary` and `RouteErrorBoundary` (18 lines) | One boundary with a `variant` prop |
| F4 | `ForgotPassword`, `ResetPassword`, `SignIn` | `AuthCard` layout in `features/auth/components` |
| F5 | `GuardiansDirectory` and `NonAcademicStaff` (3 pairs) | Move both onto the standard list-page template (`FilterBar`, `useListFilters`, `ListState`, `DataGrid`) |
| F6 | `os-page__header` markup repeated across pages | `PageHeader` component in `shared/ui` |
| F7 | `GradeSections` and `TimetableSettings` | `NoCurrentYear` empty state component |
| F8 | `CreateLevelModal` and `EditLevelModal` | `LevelFormFields` component |
| F9 | `StudentMarks` and `ChildAcademicTabs` | `TermMarksPanel` component in `features/marks/components` |
| F10 | `Classrooms` and `Resources` | Check, then share the room form if it is the same |
| F11 (new) | Edit/delete action cell in `SubjectsPanel`, `Students` and other grids (17 lines) | `RowActions` component in `shared/ui` (edit and delete buttons with tooltips) |
| F12 (new) | Year picker and archive subtitle in `Prefects` and `Societies` (17 lines) | `ArchiveYearSelect` component plus a `useArchiveYear` hook in `features/portfolio` |

### Ignore (normal boilerplate)

- Option lists such as `CATEGORIES`, `NON_ACADEMIC_DESIGNATIONS`, `RULE_TYPES`: same shape, different data.
- `Repository` struct and `NewRepository` in each module (now also flagged across `automation`, `leave`, `setup`, `attendance`): standard Go module setup.
- `ListState` + `DataGrid` blocks (`DailyReliefTable`, `MyReliefDuties`, `StaffMonthlyTable`, `NotificationHistory`, `LevelsList`, `YearsList`): this is the required list template.
- Workflow `Sections` column lists (`promotion.go` 429 vs `teacher_allocation.go` 344): same shape, different columns.
- `StudentProfileTab` vs `TeacherProfileSections`, `StudentPortfolio` vs `StudentDashboard`: check during Phase 4; leave alone if only markup shape matches.

## 3a. Unused exports

| Export | Result |
|---|---|
| `useNotificationStats` | Removed with its api call, query key and type. Nothing used it. The backend `/notifications/:id/stats` route stays for now |
| `getDateLocale` | Removed, unused |
| `formatNumber` | Now file-private; only `formatPercent` uses it |
| `MusicRoomIcon`, `DanceRoomIcon`, `HallIcon` | False positive, used in `timetable/lib/roomKind.ts` and `Resources.tsx` |
| `tokenFromHash` | False positive, used in `Activate.tsx` and `ResetPassword.tsx` |

## 4. Complexity hotspots

| Priority | Function | Cognitive | Tests | Plan |
|---|---|---|---|---|
| 1 | `useSchoolSetupSubmit` | 159 | Yes (32 tests, added 16 Oct) | Split into one function per step (school, houses, grades, mediums, year, classes, A/L streams, rooms). Move rate-limit and 429 retry into `setupRequest.ts`. Brings the file (309 lines) under 250 |
| 2 | `TeacherAllocation.Propose` / `Apply` | 104 / 56 | None | Unit tests, then extract loops into named helpers |
| 3 | `SubjectChoices.Propose` / `Apply` | 144 / 58 | Yes | Extract per-student logic; early `continue` to cut nesting from 6 |
| 4 | `PresetService.run` | 124 | Indirect | Split by preset section |
| 5 | `StudentImport.Propose` / `Apply`, `StudentIntake.Propose` | 118 / 43 / 70 | Yes | Shrinks with B1; then split row checks |
| 6 | `Promotion.Propose` / `Apply` | 108 / 66 | Indirect | Split per grade step; shares B2 |
| 7 | Timetable `generate`, `placeOptionBlocks`, `placeTask`, `repair`, `validate`, `planBlocks` | 53-101 | Yes, except `planBlocks` | Split carefully; the solver is order-sensitive, so tests must cover output before and after |
| 8 | Notifications `resolveRecipientUserIDs`, `authorizeSender` | 97 / 60 | Yes | One function per rule type (grade, class, subject, ...) via a map. Also the top risk hotspot (59, high) |
| 9 | Frontend `Promotion`, `LevelDetail` (335 lines), `ClassMarks`, `RecipientPicker`, `Attendance`, `DataGrid` | 42-67 | None | Move logic into `features/<name>/hooks/`, test the hooks |
| 10 (new) | Backend 34-43: `placementState.place`, `Allocate`, `guardianChecker.check`, `promotionService.Preview`, `YearRollover.Apply` (no tests) | 34-43 | Mostly yes | Early returns and named helpers; tests for `YearRollover.Apply` first |
| 11 (new) | Frontend 35-47: `Societies`, `AttendanceMark`, `TimetableEditor`, `Classes`, `useLeaveForm`, `PortalShell`, `SchoolSetup`, `validateNewPassword`, `Resources`, `SubjectRequirements`, `PromotionGroup`, `LeaveReviewModal`, `useEnrollmentPicker`, `SectionHeadsPanel` (nesting 8) | 35-47 | None | Same as priority 9. `validateNewPassword` becomes a list of rule functions |
| 12 (new) | `timetable/repository.go` as a file (risk 51, high, 16 dependents) | - | Linked | After B6, split the file by area (periods, requirements, reviews) |
| Skip | `RegisterRoutes` (studentleadership, leadership), `RegisterStudentRoutes`, `RegisterTeacherWriteRoutes`, `RegisterGuardianWriteRoutes` | 40-66 | - | Long route lists. Normal, leave alone |

## 4a. Test reach (new)

The AURA number counts files with a static link to a test. It is not line or branch coverage. Raise it by testing the files with the most dependents first.

| Priority | File | Why |
|---|---|---|
| 1 | `shared/ui/DataGrid.tsx`, `shared/ui/SelectField.tsx` | 46 and 51 dependents, no test |
| 2 | `shared/lib/date.ts`, `shared/auth/password.ts` | 53 dependents (indirect only); password rules have no test |
| 3 | `features/teachers/queries/useTeachers.ts`, `layouts/PortalShell.tsx` | 24 dependents; shell renders every page |
| 4 | `leadership/service.go`, `workflows/teacher_allocation.go`, `workflows/timetable_workflow.go`, `workflows/rollover.go` | Medium risk, no test |
| 5 | Every hook extracted in Phase 5 | Comes with the split |

## 5. Phases

One PR per phase. `go build`, `go vet`, `go test`, `staticcheck`, `pnpm lint`, `pnpm test`, `pnpm build` stay green on every commit.

| Phase | Work | Size |
|---|---|---|
| 0 | Baseline (section 8), unused exports, JWKS timeout | Done |
| 1 | Tests first: `TeacherAllocation` and `YearRollover` unit tests, frontend hooks named in priority 9, test reach priorities 1-4. (`useSchoolSetupSubmit` tests already exist) | Medium |
| 2 | Backend duplicates B1-B6, B8 (shrinks priorities 3, 5, 6 as a side effect) | Medium |
| 3 | Backend hotspots, priorities 2-8, 10, 12 | Large, may split into 2 PRs (workflows, then timetable + notifications) |
| 4 | Frontend duplicates F1-F12 | Medium |
| 5 | Frontend hotspots, priorities 1, 9, 11 | Medium, may split into 2 PRs |
| 6 | Guardrails: ESLint `complexity` rule as a warning, `gocognit` in backend CI as informational, real coverage output (`go test -cover`, `vitest --coverage`) in CI. Re-run both reports and record the new numbers | Small |

## 6. Rules

- No behaviour change, no feature work mixed in.
- Tests before the refactor, never after.
- Intake behaviour stays exactly as it is (B1 shares code only).
- New shared components follow the layer rules in `CLAUDE.md`.
- Short one-line comments only where the code is not obvious.

## 7. Done when

- No function over 50 cognitive complexity, except route registration.
- Every function in section 4 has tests.
- Real duplicated blocks in section 3 are gone.
- Guardrails in CI stop new hotspots.
- AURA targets: readable functions 70 or more, duplication 3% or less, test reach 40% or more, no high-risk hotspot.

## 8. Baseline

| Metric | 16 Oct 2026 | 16 Nov 2026 (AURA) |
|---|---|---|
| AURA score | - | 72, grade C |
| Functions over cognitive 15 | - | 165 of 2909 |
| Functions over cognitive 25 | 26 | 81 (59 at 26-50, 22 over 50) |
| Worst function | `useSchoolSetupSubmit`, 159, nesting 8 | Same |
| Hardest functions with no tests | 9 | 26 of the top 50 (`useSchoolSetupSubmit` now tested) |
| Duplicated lines | - | 3656 of 70086 (5.2%) |
| Duplicated block pairs | 51 (about 30 real) | 137 findings |
| Largest duplicate | 38 lines, guardian modals | Same |
| Test reach (static) | - | 20% |
| High-risk files | - | 2 |
| HTTP clients without timeout | 1 of 3, now 0 | 0 |
| Unused exports | 7 flagged, 3 real, now 0 | 2 candidates |

## 9. Progress (16 Nov 2026)

All checks green: `go build`, `go vet`, `staticcheck`, `go test` (with `-tags integration` against Postgres), `pnpm lint`, `pnpm test` (101 tests), `pnpm build`.

### Done

| Item | Result |
|---|---|
| B1 | `existingForRecords` and `createTickedStudents` shared by intake and import; `indexProblem` shared row check. Intake behaviour unchanged |
| B2 | `yearDefaults` in `workflows/tools.go`, used by choices, intake, teacher allocation. `promotion.go` keeps its own loop on purpose: it picks the nearest later year, the helper picks the first listed, so sharing would change behaviour |
| B3 | `httpx.ListPage` replaces the four "offset past last page" copies |
| B4 | `currentTeacher` / `ownChild` helpers in `selfservice` |
| B5 | One parse-and-respond helper for portfolio deletes, with a test |
| B6 | `gradeReviewers` shared by both timetable repositories |
| B8 | Shared student-check helper in `automation/checks.go` |
| F3 | One `ErrorBoundary` with a `variant` prop, with a test |
| F11 | `RowActions` in `shared/ui`, used by 5 grids |
| F12 | `useArchiveYear` hook in `features/portfolio`, with a test |
| Priority 1 | `useSchoolSetupSubmit` split into `lib/setupRequest.ts` (rate limit and 429 retry), `lib/setupSteps.ts` and `lib/setupClasses.ts` (one function per step). Hook is now about 65 lines |
| Priority 2 | `TeacherAllocation.Propose` 97 -> under 25 (`allocationPlan`). Already had an integration test |
| Priority 3 | `SubjectChoices.Propose` 112 -> under 25 (`choiceRows`) |
| Priority 4 | `PresetService.run` 122 -> under 15. New golden test pins the summary and every write |
| Priority 5 | `StudentImport.Propose` 90 -> under 25 (`importSheet`); `StudentIntake.Propose` 53 -> 36 |
| Priority 6 | `Promotion.Propose` 97 -> 37 (`promotionPlacer`), `Promotion.Apply` 50 -> 39 |
| Priority 7 | Timetable `generate` 101 -> 22 (`generationRun`), `placeTask` gone from the list, `placeOptionBlocks` 87 -> under 20, `repair` 54 -> 21, `validate` 70 -> 26, `planBlocks` 53 -> under 25. Two new golden tests pin solver output, one forces the repair pass |
| Priority 8 | Notifications `resolveRecipientUserIDs` 94 and `authorizeSender` 60 -> under 15, one handler per rule type via maps. New rule-matrix tests cover every rule type |
| 11 (part) | `validateNewPassword` is now a list of rule functions, with a test |
| 4a 1-2 | Tests for `DataGrid`, `SelectField`, `date.ts`, `password.ts` |
| Phase 1 | `TeacherAllocation` and `YearRollover` already had Postgres integration tests, so no extra unit tests were needed before refactoring |

Backend result: no function over 50 except route registration (see "Skip" in section 4).

### Still to do

| Item | Note |
|---|---|
| B7 | Small local helpers, low priority |
| Priority 10 | `placementState.place` (42), `SubjectChoices.Apply` (44), `TeacherAllocation.Apply` (43) and the other 34-43 functions. All under 50, so optional |
| Priority 12 | Splitting `timetable/repository.go` (858 lines) is blocked by `internal/architecture` test: only a file named exactly `repository.go` may import sqlc. Needs a decision: allow `repository_*.go`, or leave the file as is |
| F1, F2, F4-F10 | Frontend duplicates, not started |
| Priority 9 | Frontend `Promotion`, `LevelDetail`, `ClassMarks`, `RecipientPicker`, `Attendance`, `DataGrid` |
| Priority 11 | Rest of the frontend 35-47 list (`validateNewPassword` done) |
| 4a 3-4 | Tests for `useTeachers`, `PortalShell`, `leadership/service.go`, `timetable_workflow.go`, `rollover.go` |
| Phase 6 | ESLint `complexity` warning, `gocognit` in CI, coverage output, re-run AURA and record new numbers |
