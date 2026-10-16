# Code Health Plan

Status: approved 16 Oct 2026. Phase 0 done.

Source: the code-health report of 16 Oct 2026 (hardest functions, duplicated blocks, module balance).

## 1. Goals

- Every function is readable in one sitting. Target: cognitive complexity under 25 for new code, under 50 for any existing function after this plan.
- A rule or form lives in one place, so a bug is fixed once.
- Behaviour does not change. This is a refactor only.

## 2. What the report says

| Section | Finding | Action |
|---|---|---|
| Hardest functions | 26 functions over the limit; 9 have no tests | Phases 1, 3, 5 |
| Duplicated blocks | 51 pairs; about 30 are real, the rest are normal boilerplate | Phases 2, 4 |
| Module balance | "No modules with classes" | Nothing to do. The metric is for class-based code; Go and React here do not use classes |
| Unused exports | 7 candidates | Done in Phase 0, see section 3a |
| HTTP timeouts | JWKS client in `middleware/auth.go` had no timeout | Done in Phase 0: 10s timeout |

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

### Ignore (normal boilerplate)

- Option lists such as `CATEGORIES`, `NON_ACADEMIC_DESIGNATIONS`, `RULE_TYPES`: same shape, different data.
- `Repository` struct and `NewRepository` in each module: standard Go module setup.
- `ListState` + `DataGrid` blocks (`DailyReliefTable`, `MyReliefDuties`, `StaffMonthlyTable`, `NotificationHistory`, `LevelsList`, `YearsList`): this is the required list template.
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
| 1 | `useSchoolSetupSubmit` | 159 | None | Split into one function per step (school, houses, grades, mediums, year, classes, A/L streams, rooms). Move rate-limit and 429 retry into `setupRequest.ts`. Brings the file under 250 lines |
| 2 | `TeacherAllocation.Propose` / `Apply` | 104 / 56 | Integration only | Unit tests, then extract loops into named helpers |
| 3 | `SubjectChoices.Propose` / `Apply` | 144 / 58 | Yes | Extract per-student logic; early `continue` to cut nesting from 6 |
| 4 | `PresetService.run` | 124 | Indirect | Split by preset section |
| 5 | `StudentImport.Propose`, `StudentIntake.Propose` | 118 / 70 | Yes | Shrinks with B1; then split row checks |
| 6 | `Promotion.Propose` / `Apply` | 108 / 66 | Indirect | Split per grade step; shares B2 |
| 7 | Timetable `generate`, `placeOptionBlocks`, `placeTask`, `repair`, `validate`, `planBlocks` | 53-101 | Yes | Split carefully; the solver is order-sensitive, so tests must cover output before and after |
| 8 | Notifications `resolveRecipientUserIDs`, `authorizeSender` | 97 / 60 | Yes | One function per rule type (grade, class, subject, ...) via a map |
| 9 | Frontend `Promotion`, `LevelDetail` (300 lines), `ClassMarks`, `RecipientPicker`, `Attendance`, `DataGrid` | 48-68 | None | Move logic into `features/<name>/hooks/`, test the hooks |
| Skip | `RegisterRoutes`, `RegisterStudentRoutes` | 57-66 | - | Long route lists. Normal, leave alone |

## 5. Phases

One PR per phase. `go build`, `go vet`, `go test`, `staticcheck`, `pnpm lint`, `pnpm test`, `pnpm build` stay green on every commit.

| Phase | Work | Size |
|---|---|---|
| 0 | Baseline (section 8), unused exports, JWKS timeout | Done |
| 1 | Tests first: `useSchoolSetupSubmit` (incl. retry after failure), `TeacherAllocation` unit tests, frontend hooks named in priority 9 | Medium |
| 2 | Backend duplicates B1-B6 (shrinks priorities 3, 5, 6 as a side effect) | Medium |
| 3 | Backend hotspots, priorities 2-8 | Large, may split into 2 PRs (workflows, then timetable + notifications) |
| 4 | Frontend duplicates F1-F10 | Medium |
| 5 | Frontend hotspots, priorities 1 and 9 | Medium |
| 6 | Guardrails: ESLint `complexity` rule as a warning, `gocognit` in backend CI as informational. Re-run the report and record the new numbers | Small |

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

## 8. Baseline (16 Oct 2026)

| Metric | Value |
|---|---|
| Functions over cognitive 25 in the report | 26 |
| Worst function | `useSchoolSetupSubmit`, cognitive 159, nesting 8 |
| Hotspots with no tests | 9 |
| Duplicated block pairs | 51 (about 30 real) |
| Largest duplicate | 38 lines, guardian modals |
| HTTP clients without timeout | 1 of 3, now 0 |
| Unused exports | 7 flagged, 3 real, now 0 |
