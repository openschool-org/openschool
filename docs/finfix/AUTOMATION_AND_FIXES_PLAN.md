# Automation and Fixes Plan

Status: **Part A done (26 Sep 2026). Part B awaits approval and the answers in Part C.**

---

## Score: where the system really stands

Scored out of 10 by what a school would experience today, not by how much code exists.

| Area | Before Part A | After Part A | Why this number |
|------|---------------|--------------|-----------------|
| Navigation and layout | 7 | 7 | Hubs, breadcrumbs, page titles and a phone drawer exist. None of it has been looked at in a browser. |
| Daily tasks (attendance, marks) | 6 | 7 | Student attendance and marks entry are solid. Staff attendance was one long unpaged list; now paged with "mark all present". |
| Admin data work (find, filter, export) | 3 | 5 | Audit log, orphaned accounts and notifications had no search; now they do. Still no real export and no reports beyond two class PDFs (T8 paused). List sorting works in the API but is not wired into the pages. |
| Year-end work (promotion, classes, timetable) | 3 | 3 | Promotion is one grade at a time with no rules. No subject-choice step, no intake, no teacher allocation, no option blocks in the timetable. Homerooms are now automatic, which is small. This is the biggest gap and Part B. |
| Feedback and errors | 7 | 7 | Toasts, skeletons, offline banner, error summary. About 58 error messages are still unaudited. |
| Forms and copy | 7 | 7 | Lint enforces sentence case, British spelling, no em-dashes, calendar-only dates. |
| Accessibility | 6 | 6 | Labels, focus ring, skip link, named dialogs, axe on a few components. No page-level audit, never tried with a screen reader. |
| Mobile | 5 | 5 | Drawer, bottom tabs and stacked tables are CSS only. Never opened on a real phone. |
| Sinhala and Tamil | 3 | 3 | Student and parent portals only, machine-drafted, not reviewed by a native speaker. Teachers and admins see English. |
| Evidence it works | 3 | 4 | Good Go integration tests (Part A added four, all against real Postgres). 20 frontend unit tests. Zero end-to-end tests, zero browser checks, zero sessions with real clerks, teachers or parents. |
| **Overall** | **5.0** | **5.4** | |

The plain truth:

1. **None of the 26 Sep frontend work has been seen in a browser.** It compiles, lints and passes unit tests. That proves it builds, not that it looks or works right. Someone must click through every changed page before release.
2. **The UX playbook's "After: 8" is not reached.** Realistically the product is a 5 today. The code is cleaner than the score suggests; the score is held down by missing workflows and missing proof.
3. **The job schools will judge us on is year-end, and it is still mostly manual.** A clerk forming grade 10 classes from basket choices, or building A/L classes with intake, does it by hand here, the same as on paper. Until Part B ships, OpenSchool is a good record-keeping system, not a time saver for the hardest weeks of the year.
4. **Sinhala and Tamil are drafts.** Shipping them unreviewed to parents risks embarrassing wording.
5. **Scale is unmeasured.** Pagination is in place, but nobody has loaded 7,000 students and timed the pages.
6. **A regression in sign-in, attendance marking or marks entry would ship unnoticed.** There is no end-to-end test covering them.

What would move the score most, in order: Part B phases 1 to 3 (year-end workflows), one day of browser testing on every page, native review of the translations, then a Playwright smoke test for sign-in, attendance and marks.

---

## Part A. Quick fixes (done 26 Sep 2026)

All five are built and tested with integration tests against real Postgres. None has been checked in a browser.

| # | What was built |
|---|----------------|
| A1 | `CreateClass` links a homeroom in the same transaction: it reuses a regular room with the same name (case-insensitive) or creates one; a lab or ECA room with that name is never used. The setup wizard, Add class and any future workflow get it for free; the browser no longer creates rooms. `POST /academic-years/:id/classes/homerooms` backfills existing classes, exposed as "Add missing homerooms" on the Classrooms tab. |
| A2 | `GET /staff-attendance/roster` and `/staff-attendance/monthly` (kind, search, limit, offset) with day totals for the whole filtered set; `POST /staff-attendance/mark-unmarked` marks everyone without a record as present and never overwrites a mark. The page has Teachers and Non-academic staff tabs, search, paging (25/50/100, remembered), status tags and 44 px buttons on phones. The old unpaged endpoints stay for the dashboard. |
| A3 | `GET /audit-logs` takes `search` (person, action, record type, reason), `from`, `to`; `GET /audit-logs/entity-types` feeds the record-type filter so the list is never typed by hand. Filters live in the URL. |
| A4 | Client-side search over username, email and ID on Orphaned accounts. |
| A5 | `GET /notifications/history` (admin: whole school, teacher: own; search, category, priority, dates, paging, read counts) shown as "Sent history" under the composer. `GET /me/notifications/inbox` (box, search, category, paging, counts per box) now drives the Notification centre. The dead "Recently sent" list and archived-list code were removed. |

Original plan for reference:

| # | Problem today | Fix | Effort |
|---|---------------|-----|--------|
| A1 | The setup wizard creates classes with no home classroom. `AddClass` creates one, but in the browser, so any other path (wizard, API, a future agent) skips it. | Move the rule into the backend `CreateClass`: if no `home_classroom_id` is given, reuse a regular classroom with the same name (case-insensitive), else create one, in the same transaction. Remove the client-side room creation from `useCreateClassForm` (keep the suggestion text). Add a one-off "Create missing homerooms" action on the Classrooms tab for classes that already exist without one. | S |
| A2 | Staff attendance loads every teacher and staff member in one list. 100+ teachers is one long scroll. | Backend: `GET /staff-attendance` and `/monthly-summary` take `limit`, `offset`, `search` and `type` (teacher or staff), returning the standard `{items, total}` page. Frontend: two tabs (Teachers, Non-academic staff), `FilterBar` search (already added), server pagination, and a "Mark all unmarked as present" button backed by one bulk `POST`, so the clerk only fixes the exceptions. | M |
| A3 | Audit log has no search. | `GET /audit-logs` gains `search` (actor name, action, entity type, reason), `entity_type`, `from`, `to`. Frontend adds `FilterBar` + date range; filters live in the URL like other lists. | S |
| A4 | Orphaned accounts has no search. | The list comes from ThunderID and is small, so a client-side `FilterBar` over name, email and username is enough. | S |
| A5 | Admins cannot see every notification sent in the school, only their own recent 100; the inbox has no server search. | New `GET /notifications` (admin: all senders; teacher: own) with `search`, `category`, `priority`, `sender`, `from`, `to`, server pagination. Frontend: a "History" tab on the Notifications page (`FilterBar` + `DataGrid` + per-row read stats). `GET /me/notifications` gains `search` and pagination so the Notification centre stops filtering in the browser. | M |

---

## Part B. Automation workflows

### B1. What a Sri Lankan government school actually does

These are my working assumptions. Please correct any that are wrong for your schools.

| When | What happens | Pain today |
|------|--------------|------------|
| December | Term 3 tests. Next year's classes, form teachers and timetable are prepared. Teacher transfers are announced. | Done by hand in the week before school opens. |
| January (new year) | Grades 6 to 9 move up. Many schools keep the section letter (6-A becomes 7-A); some reshuffle for balance. Grade 6 takes new Scholarship intake. | Promotion page works one grade at a time with no rules. |
| January, grade 10 | Students pick O/L basket subjects (three baskets) plus religion and language. Classes are formed from basket choice and medium, not from marks (some schools also use marks). Some new students join. | No choice collection before promotion; classes are built by hand. |
| After O/L results (often mid-year) | Grade 12 A/L intake. Many grade 11 students leave; students from other schools join. Streams: Physical Science, Biological Science, Commerce, Arts, Technology, each with subject combinations. Eligibility depends on O/L results. | No intake flow; A/L classes are created by hand; Arts combinations are hard to timetable. |
| After A/L exam | Grade 13 leave. | Marking leavers is manual per student. |
| All year | Timetable: period grid per section, subject hours per grade, qualified teachers, labs, teacher load. Basket and A/L subjects run in parallel "option blocks" across classes. | Generator exists but has no option blocks, no teacher allocation step and no readiness check. |

### B2. Design principles

1. **Deterministic, no LLM.** Same inputs and the same seed always give the same result. Every decision carries a plain reason ("placed in 10-B: Basket 2 = Music, Sinhala medium").
2. **Propose, review, apply.** An agent never writes directly. It produces a proposal (a dry run). A person reviews and edits it, approves it, then it is applied in one transaction.
3. **Preconditions are checked, not assumed.** Each agent lists what must be true before it can run. The UI shows a checklist with a link to fix each item. The Run button stays disabled until all pass.
4. **Same tools for people and agents.** Each step calls a named backend tool. The manual pages (Promotion, Classes, Timetable editor) call the same tools. The agent is a shortcut, never the only way.
5. **Backend is the source of truth.** Agent names, descriptions, steps, tools, preconditions, inputs and schedules come from the backend catalogue. The frontend renders them generically; nothing about an agent is hard-coded in React.
6. **Auditable and reversible.** Every run, proposal edit, approval and apply is in the audit log. Apply stores a snapshot so a run can be reverted until real data (attendance, marks) is recorded against the new classes.

### B3. Architecture

| Piece | What it is |
|-------|------------|
| Tool registry (`internal/automation/tools`) | Named Go functions with a typed input, typed output, a `mutates` flag and a one-line description. Examples: `list_students_by_grade`, `create_class`, `assign_students`, `create_homeroom`, `allocate_teachers`, `generate_timetable`, `mark_leavers`. |
| Workflow definition | Key, title, description, inputs schema, preconditions (each is a read-only tool returning pass or fail with a fix link), ordered steps (each names its tool and which earlier outputs it needs). |
| Run engine | States: `draft → checking → proposed → approved → applying → applied`, plus `failed` and `reverted`. One active run per workflow per academic year (DB lock). |
| Storage (new migration) | `workflow_runs` (inputs, proposal JSON, state, actor, timestamps), `workflow_run_steps` (per-step status, output, duration), `automation_findings` (code, severity, entity refs, fix path, run id). |
| API | `GET /automation/catalog` (workflows, monitors, tools, preconditions with live status). `POST /automation/workflows/:key/runs` (dry run). `GET/PATCH /automation/runs/:id` (view, edit proposal). `POST .../approve`, `.../apply`, `.../revert`. |
| UI | One "Automation" hub: a card per workflow in pipeline order, preconditions checklist, "Run dry run", a review table (sortable, editable, with reasons), Approve and Apply, run history. |
| Existing 7 check agents | Become "monitors" in the same catalogue. Findings are stored with a stable `code` in `automation_findings` instead of matching notification titles. `AgentFindingsBanner` asks the backend for findings by page instead of the hard-coded title list. `NON_DISABLEABLE_JOBS` moves to a backend `can_disable` field. |

### B4. The workflows, in sequence

Each workflow can run alone; the hub shows them in this order because each one's output is
the next one's precondition.

| # | Workflow | Preconditions | What it proposes |
|---|----------|---------------|------------------|
| W1 | **Year rollover** | Current year exists; next year label and dates entered; terms defined. | Create the next academic year with terms; copy grades, sections, streams, mediums, homerooms, grade sections, period grids and subject hours. Form teachers copied as a suggestion. |
| W2 | **Leavers** | W1 done. | Mark grade 13 (and grade 11 students not continuing) as left, with leaving date. Starts the PDPA retention clock. Lists students whose status is unclear for a person to decide. |
| W3 | **Subject choices** | Next-year classes exist for grades 10 and 12; basket and stream rules set up in Curriculum. | Opens a choice window for students and parents (portal) with a deadline, reminders through notifications, and an admin view of who has not chosen. Enforces basket rules and A/L eligibility. Output: each student's choice for next year. |
| W4 | **Intake** | W1 done. | Import new students from a backend-provided CSV template (grade 6, 10, 12). Checks duplicates by index number and NIC, creates accounts and guardians. New students then flow into W5 like everyone else. |
| W5 | **Promotion and class formation** | W1, W2 done; W3 closed for grades 10 and 12; class capacity set. | One placement engine with a policy per grade move (set in the backend, editable in Settings): `keep_section` (6 to 9 by default), `balanced_reshuffle` (by gender, house, medium, optional marks spread), `by_subject_choice` (9 to 10: group by basket combination and medium, then balance class sizes), `by_stream` (11 to 12: stream and combination), `graduate`. Creates missing classes and their homerooms (A1). Every student row shows the reason for its placement. |
| W6 | **Teacher allocation** | W5 applied; teacher qualifications (Teacher subjects) complete. | Assign a teacher to every class and subject from qualifications, keeping continuity (the 10 teacher follows the class to 11, 12 to 13) and a weekly period limit per teacher. Suggest form teachers. Lists anything it could not fill. |
| W7 | **Timetable** | W6 applied; grade sections with period grids; subject hours per grade; labs tagged; teacher availability entered. | Validate, then generate every class with the existing generator plus **option blocks**: basket and A/L option subjects run at the same period across the classes that share them. A repair pass swaps periods to close gaps. Output goes to the existing section-head review, then publish. |
| W8 | **Go live** | W7 published. | Set the new year as current (ADR 0003 invariant kept), notify teachers, students and parents, and archive last year's timetables. |

Manual route: every workflow's result can be built or corrected on the existing pages. The
hub also shows "Done by hand" for a step if its postconditions already hold.

### B5. Data changes

| Change | Why |
|--------|-----|
| `classes.capacity` (default 40) | Class formation must balance sizes. |
| `promotion_policies` (from grade, policy, options JSON) | Policy per grade move, school-configurable. |
| `student_subject_choices` (student, academic year, selection group, subject, status) | W3 output, reused by W5 and W6. Can reuse `student_subject_enrollments` if you prefer; see questions. |
| `intake_batches` and rows | W4 import with per-row errors and dedupe results. |
| `timetable_option_blocks` (grade section, subjects, classes) | Parallel option subjects in W7. |
| `workflow_runs`, `workflow_run_steps`, `automation_findings` | Run engine and monitor findings. |

### B6. Build order

Each phase is one PR, tested with a fixture school (grades 6 to 13, about 1,800 students,
three mediums, five A/L streams) and golden-file tests that fail if a placement changes.

| Phase | Scope | Rough effort |
|-------|-------|--------------|
| 0 | Part A fixes | 3 to 4 days |
| 1 | Run engine, tool registry, catalogue API, generic Automation hub UI; move the 7 monitors onto it (findings by code) | 1 to 1.5 weeks |
| 2 | W1 Year rollover and W2 Leavers | 4 to 5 days |
| 3 | W5 Promotion engine with policies and class formation (6 to 9 and 9 to 10 first, then A/L) | 1.5 to 2 weeks |
| 4 | W3 Subject choices and W4 Intake | 1.5 weeks |
| 5 | W6 Teacher allocation | 1 week |
| 6 | W7 Timetable: option blocks, repair pass, readiness checks | 2 weeks |
| 7 | W8 Go live and end-to-end rehearsal on the fixture school | 3 days |

### B7. Time it should save

Estimates for a 1,800-student school, to be checked with real admins:

| Task | By hand today | With the workflow |
|------|---------------|-------------------|
| Promote grades 6 to 9 | half a day | 10 minutes review |
| Form grade 10 classes from basket choices | 2 to 3 days | 1 hour review |
| Form A/L classes with intake | 3 to 5 days | half a day review |
| Build the school timetable | 1 to 2 weeks | 1 to 2 days review and fixes |

---

## Part C. Questions before Part B starts

1. Grades 6 to 9: keep the section letter by default, or reshuffle every year? Do any of your schools stream by marks here?
2. Grade 10: are classes formed by basket combination, by medium, or both? Is a marks rule needed as an option?
3. A/L intake: at the start of the year, or after O/L results mid-year? Should the system hold O/L results, or just an "eligible for stream X" flag entered by staff?
4. Class capacity: one default (40), or per grade?
5. Who approves a run: any admin, or only the Principal (and VPs)?
6. Revert window: until the first attendance session in the new classes, or a fixed number of days?
7. Subject choices: a new table, or reuse the existing enrolment tables and locks?
8. Should students and parents make O/L and A/L choices in the portal, or does staff enter them from paper forms? (Both is possible; portal adds a phase.)
