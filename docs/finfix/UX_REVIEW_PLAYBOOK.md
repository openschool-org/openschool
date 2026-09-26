# UX Review Playbook

Status: **updated 26 Sep 2026.** Every finding has a Status column: ✅ Done · 🚧 Started ·
⏸ Paused · ⬜ Not started. Open items are listed in section 4. New work the user asked
for on 26 Sep (automation agents, promotion, homerooms, staff attendance paging, Settings
search) is planned in `docs/finfix/AUTOMATION_AND_FIXES_PLAN.md`, awaiting approval.
Reviewer stance: senior product designer and frontend engineer, reviewing what a
school admin, a teacher on a phone in class, a student and a parent actually see.
Evidence comes from the current `frontend/src` after the refactor.

---

## 1. Score

| Area | Now | After | What changes |
|------|-----|-------|--------------|
| Navigation and information architecture | 4 | 8 | 27 admin items in 8 groups become 5 hubs; timetable and settings get one home each |
| Task efficiency (top tasks) | 5 | 8 | Attendance marking on a phone, bulk enrolment, sorting and export on lists |
| Feedback and system status | 4 | 8 | One toast system, idle-logout warning, no blank loading screens, page titles |
| Forms and input | 6 | 8 | Every control labelled, human error messages, unsaved-change guard |
| Content and copy | 4 | 8 | One spelling, one date format, sentence case, plain error text |
| Accessibility | 5 | 9 | Labels, focus styles, skip link, 12 px minimum text, axe in CI |
| Mobile | 3 | 8 | Responsive shell for all portals, touch-first attendance and marks |
| Localisation | 1 | 7 | Sinhala and Tamil for student and parent portals, en-LK dates everywhere |
| Onboarding | 6 | 8 | Setup checklist after the wizard; empty states that lead somewhere |
| Consistency | 6 | 9 | Design tokens and shared components already in place; copy guide added |
| **Overall** | **4.5** | **8** | |

---

## 2. Who uses it and what they need first

| Persona | Device | Top three tasks | Where it hurts today |
|---------|--------|-----------------|----------------------|
| Admin clerk | Desktop, all day | Enrol students, keep classes and teachers current, run reports | 27 sidebar items, 10-row pages on 7,000 students, no bulk actions, no export |
| Teacher | Phone in class, laptop in staffroom | Mark attendance, enter marks, see today's timetable | Sidebar is fixed-width on phones, roster rows are small targets, save bar scrolls away |
| Student | Low-end Android, mobile data | Today's timetable, my marks, notices | English only, heavy first load, no offline timetable |
| Parent | Phone, occasional | Child's attendance and marks, notices | English only, tabs hide the key numbers, no summary on the first screen |
| Principal / Vice Principal | Laptop | Attendance today, who has not marked, timetable status | Data is spread across Analytics, Attendance and Timetables |

---

## 3. Findings and fixes

Impact: H / M / L. Effort: S (under a day), M (days), L (a week or more).

### 3.1 Navigation and structure

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| N1 | ✅ Done | H | The admin sidebar has 27 links in 8 groups. Timetable alone has 6 entries. New admins scan the whole list to find anything. | `layouts/nav/admin.ts` | Five hubs: Overview, People, Academics, Timetable, Operations. Timetable becomes one page with tabs (Timetables, Generate, Classrooms, Requirements, Settings). Audit Log and Orphaned Accounts were already under Settings; Automation now joins them. Ctrl+K search extended to actions ("Add student", "Mark attendance", ...). | M |
| N2 | ✅ Done | M | Two routes for the same page: `/subjects` and `/curriculum` both render `SubjectsCurriculum`. `/grades` redirects. | `admin.routes.tsx` | One canonical route per page; redirect the others. | S |
| N3 | ✅ Done | M | Breadcrumbs appear on one page only (`AddClass`). Detail pages rely on a Back button. | `AddClass.tsx`, detail pages | Done 26 Sep: `PortalShell` builds the breadcrumb from the nav config (`layouts/navMatch.ts`) for every nested route; each portal passes `navAliases` for routes outside the nav (hub tabs, `/curriculum/:id`, `/p/children/:id`). Detail and add pages name the last crumb with `usePageTitle` (student, teacher, class name). The four hand-written breadcrumbs were removed. | S |
| N4 | ✅ Done | M | Students, teachers and parents cannot collapse the sidebar; it takes 15 rem of a phone screen. | `PortalShell` `collapsible` only for admin | Done 26 Sep: every portal has the menu button. Under 66 rem the sidebar is a drawer with a scrim; it closes on Esc, on scrim tap and on navigation. Under 42 rem students and parents also get a bottom tab bar with their first four pages. | M |
| N5 | ✅ Done | L | The page title in the browser tab is always "OpenSchool". Tabs and history are unreadable. | `index.html` | Done 26 Sep: the shell sets `<Page> · OpenSchool` from the active nav item; `usePageTitle` overrides it on detail pages. | S |

### 3.2 Dashboards and first screens

| # | Status | Impact | Finding | Fix | Effort |
|---|--------|--------|---------|-----|--------|
| D1 | ✅ Done | H | Parent and student first screens do not answer "what matters today". Key numbers sit behind tabs. | Done 26 Sep. Student side as before. Parent side: new `GET /me/children/summary` returns attendance this month and the latest term average for every linked child in one SQL query (no N+1). Each child card on the parent dashboard now shows both numbers. Not verified in a browser. | M |
| D2 | ✅ Done | M | After the setup wizard the admin lands on a dashboard with no next step. | `SetupChecklistCard` on `Dashboard.tsx`: academic year current, grade/subject/teacher/class/student each present, each item linking to where to fix it, a progress bar, and the whole card returns `null` once every item is done. Un-verified visually (no browser access this session), but the underlying data conditions match what each admin nav page actually creates. | M |
| D3 | ⬜ Not started | M | Principal view is split across three pages. | One leadership overview: classes not marked today, timetables awaiting review, absence spikes, with links into each. Most data already exists in `LeadershipOverviewPanel`. | M |

### 3.3 Top tasks

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| T1 | ✅ Done | H | Marking attendance on a phone: status buttons are small, the roster table scrolls horizontally, the Save button is below 40 rows. | `AttendanceMark.tsx`, `StudentAttendanceRow.tsx` | Card rows under 42rem with `data-label` stacking, 44px-min status buttons, sticky bottom bar showing unmarked count and Save, "Mark all Present" styled as the primary action so present-then-fix-exceptions is the visual default. Tap-to-toggle; swipe not implemented (kept in scope as a later enhancement, not core to the fix). | M |
| T2 | ✅ Done | H | Marks entry: one number input per row, no keyboard flow, absent checkbox separate. | `MarksEntryTable.tsx` | Enter/↓ moves to the next row's marks field, ↑ to the previous, pressing "A" marks absent and advances (typing the full word "AB" isn't practical in a numeric field; single-key "A" is the workable version of that shortcut). Sticky column headers plus a sticky context bar showing subject and max marks (`os-marks-context-bar`, explicit height so the sticky offset isn't a guess). Unsaved-change guard was already wired into this same page by I4. Scoped to `TeacherMarks.tsx`/`MarksEntryTable.tsx` (the evidence file); `ClassMarks.tsx`, the admin-side marks tab with its own separate inline implementation, doesn't have this yet. | M |
| T3 | 🚧 Started | H | Lists default to 10 rows with 7,000 students. No sorting, no bulk actions, no export. | `DataGrid` default `pageSize=10` | Page size 25 and remembered (done earlier). Sorting: backend done 26 Sep, `?sort=&order=` on students, teachers, guardians and staff, keys whitelisted by `httpx.ParseSort`, unit tested. `DataGrid` now supports sortable headers and row selection. Not done: wiring sort and selection into the four list pages, "Export CSV", "Enrol selected". Export is folded into T8 (paused). | M |
| T4 | ✅ Done | M | Pickers load every student to filter in the browser. | `EntityCombobox` | Server search with 2-character minimum and recent choices at the top. Already existed before this pass. | M |
| T5 | ✅ Done | M | Idle logout after 30 minutes with no warning. A teacher mid-marking loses work. | `useIdleLogout.ts` | The 60-second warning modal with "Stay signed in" already existed before this pass. `sessionStorage` draft persistence + restore now lives in `useAttendanceMarking.ts`: marks/notes are written to `sessionStorage` as they're entered, restored (with a toast) if the page remounts with an unsent draft for that session, and cleared on successful save. Scoped to attendance marking, the page T1/T5's evidence names; marks entry (T2, not started) doesn't have this yet. | S |
| T6 | ✅ Done | L | Filters are lost on refresh and cannot be shared. | `useListFilters` | Done 26 Sep: `useListFilters` reads and writes the URL query string (replace, not push), so filters survive refresh and can be shared. Unit tested. | S |
| T7 | ✅ Done | M | *(User-requested, added 20 Sep 2026, not from the original review.)* Staff Attendance has no way to search for a specific teacher - admins scroll the whole roster. | `StaffAttendance.tsx` | Done 26 Sep: search by name or employee number on both the daily and monthly views. Pagination for 100+ staff is in the new plan (see `docs/finfix/AUTOMATION_AND_FIXES_PLAN.md`). | S |
| T8 | ⏸ Paused | H | *(User-requested, added 20 Sep 2026, not from the original review.)* Reports only covers what exists today; there's no way to run a report for a specific entity (Students, Parents, Teachers, Classes, ...), and "export" produces a sample/template file or a raw dump of the current table rather than a meaningful, complete export of the actual data. | `Reports.tsx`, export flow | Design drafted, no code: one backend export endpoint per entity (students, parents, teachers, staff, classes) built from SQL with the list filters, CSV with a UTF-8 BOM so Sinhala and Tamil names open in Excel, audit-logged. Paused on 26 Sep at the user's request. | L |

### 3.4 Feedback and system status

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| F1 | ✅ Done | H | Loading states between routes and during auth are blank divs. Users see a white screen for up to a second. | `App.tsx` `Loading`, `ProtectedRoute.tsx` | `SkeletonShell` (header, sidebar, three grey blocks) for the initial/auth load; a nested `Suspense` around `PortalShell`'s `Outlet` now keeps header/sidebar mounted across route changes so only the content area shows `ContentSkeleton`. | S |
| F2 | ✅ Done | H | Success feedback is inconsistent: "✓ Saved" text that vanishes after 2.5 seconds in two places, inline notifications elsewhere, nothing after most deletes. No toast system exists. | `GeneralSettingsTab.tsx`, `AttendanceMark.tsx`, 0 `ToastNotification` uses | `useToast()` + a Carbon `ToastNotification`/`ActionableNotification` stack (`shared/ui/toast/`), rendered from `PortalShell`. The "nothing after most deletes" half is now solved at the root: `ConfirmDeleteModal` was redesigned to own its mutation's lifecycle directly (toast on success, stays open on failure so the error is visible) instead of every caller hand-rolling `onSettled`/`onSuccess`. Migrated all 37 call sites; this also fixed a real bug where about half of them used `onSettled` and so auto-closed the modal even when the delete failed. Non-delete success feedback (the two "✓ Saved" spots) also wired. No undo action is wired anywhere yet - `ActionableNotification` support exists in the stack for when one's needed. | M |
| F3 | 🚧 Started | M | 62 distinct "Failed to ..." messages, many showing the raw backend error string. | `MutationErrorNotification` fallback strings | "Never show internal text" is done: `getErrorMessage` (`shared/api/errors.ts`, the "one file") now rejects backend text that looks like a leaked Gin-validation or SQL-driver error and falls back to the friendly default instead of showing it raw - this was a real, live gap, not a hypothetical one. Fixed the 14 worst "what happened, what to do" offenders: `MutationErrorNotification` calls with no `title` at all (defaulting to the generic "Error") paired with a bare "Failed to X" fallback, which read as "Error: Failed to X" with no guidance - now "Could not X" + "Please try again." Not done: a literal error-code-to-copy map, because the backend doesn't send codes, only hand-written `err.Error()` strings for domain errors - that's a backend-side change. The other ~58 `MutationErrorNotification` call sites weren't individually audited; most already pass a reasonable custom title/fallback. | M |
| F4 | ✅ Done | M | Delete confirmations are good, but "Saved, redirecting" waits 1.2 seconds on a timer. | `AttendanceMark.tsx` | Redirect immediately and show the toast on the destination page. | S |
| F5 | ✅ Done | L | Notification bell shows eight items with no "mark all read". | `NotificationsBell.tsx` | Done 26 Sep: `POST /me/notifications/read-all` plus a "Mark all read" button; the bell groups items under Today, Yesterday or a date. Items are now buttons, so keyboard users can reach them. | S |

### 3.5 Forms and input

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| I1 | ✅ Done | H | 11 selects render with `labelText=""`. Sighted users lose context in filter bars; screen readers announce nothing. | `grep labelText=""` | Real labels, or `hideLabel` with a visible placeholder and an `aria-label`. All 9 flagged files fixed; `EntityCombobox` gained an `ariaLabel` prop since Carbon's `ComboBox` has no `hideLabel`. `FilterBar` now takes a `controls: { label, node }[]` array instead of bare `children`, so a filter control without a label is a compile error, not a runtime gap; also caught two `EntityCombobox` filters (grade/class on Students) that had no label at all. All 3 call sites migrated. | S |
| I2 | ✅ Done | M | Long helper texts under selects (home classroom, medium) read like documentation. | `AddClass.tsx` | Done 26 Sep: new `InfoTip` (Carbon Toggletip). Medium, home classroom and house helper texts cut to one line; the detail moved into the tip. | S |
| I3 | ✅ Done | M | Validation appears only after blur. Submitting a long wizard step with three errors scrolls nowhere. | `SchoolSetup.tsx`, `FirstRunSetup.tsx` | Done 26 Sep: `useErrorSummary` + `ErrorSummary`. On submit it marks fields touched, lists every invalid field at the top with a link to each, and focuses the first. Wired into the school setup wizard and the first-run admin form. | S |
| I4 | 🚧 Started | M | No unsaved-change guard when leaving marks, attendance or a profile in edit mode. | `useMarksDraft`, `useStudentProfileEditor` | `useBlocker` needs a data router (`createBrowserRouter`/`RouterProvider`); this app uses plain `BrowserRouter` everywhere, so it throws. Built a scoped `useUnsavedChangesGuard` instead: guards the browser's own close/refresh (`beforeunload`) and each page's own Cancel/Back buttons, with a shared `UnsavedChangesModal`. Wired into marks entry (`TeacherMarks.tsx`), attendance marking (`AttendanceMark.tsx`, plus a new `hasUnsaved`/`markSaved` on `useAttendanceMarking`), and student profile edit (`StudentDetail.tsx`, plus a new `hasUnsaved` on `useStudentProfileEditor`). Does not catch clicking a different sidebar link mid-edit - that needs the data-router migration, which is a separate, larger piece of work (flagged, not started). `ClassMarks.tsx` (the admin-side marks tab, which duplicates `useMarksDraft`'s logic inline instead of using the hook) isn't wired either. | S |
| I5 | ✅ Done | L | Date pickers accept free text and the format hint is `YYYY-MM-DD` while the UI shows `en-LK` dates elsewhere. | `TermForm.tsx` | Done 26 Sep: shared `DateField` (calendar only, dd/mm/yyyy shown, ISO sent to the API) replaces all 13 date pickers. ESLint bans importing `DatePicker` elsewhere. Found a real bug on the way: browsers have no `en-LK` data and fell back to US month-first dates; `date.ts` now uses `en-GB` when `en-LK` is not available. | S |

### 3.6 Content and copy

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| C1 | ✅ Done | H | Spelling is mixed: "Enrol" 17 times, "Enroll" 61 times. | `grep` | British spelling throughout (Enrol, Enrolment, Organisation, Colour, Centre, ...) in every user-facing string (nav label, tab, heading, button, toast). Internal identifiers/types (`EnrollmentStatus`, `useEnrollmentPicker`, ...) intentionally left alone - renaming those is a much larger, purely internal refactor with no user-visible payoff. A custom `local/british-spelling` ESLint rule now checks JSXText and a whitelist of copy-bearing props/keys (`label`, `title`, `placeholder`, ...) against an Americanism word list; it caught 5 real violations this sweep had missed (Mediums, SubjectsCurriculum, NotificationCenter, HousesStep, StudentDetail), now fixed. | S |
| C2 | ✅ Done | M | Five date formats in use (`toLocaleString()`, `en-LK` short, weekday long, and more). | `grep toLocale` | `shared/lib/date.ts` now has `formatDate`, `formatDateTime`, `formatMonth`, `formatLongDate`, `formatShortDayMonth`, `formatDayMonthYear`, all `en-LK`, all timezone-safe for bare `YYYY-MM-DD` strings. Every `toLocale*` call site in `src` (18 of them, including one that was hardcoded `en-US`) now goes through these. `no-restricted-properties` in `eslint.config.js` bans calling `toLocale*` directly outside `date.ts`. | S |
| C3 | 🚧 Started | M | Jargon and long labels: "Non-Academic Staff", "Mediums", "Leadership Positions", "Subject Requirements". | `nav/admin.ts` | Nav labels changed to "Staff", "Languages of instruction" (kept "Medium" in data/page titles), "Principal and VPs" (also updated the page's own `h1` to match). "Subject Requirements" no longer has a standalone nav entry - it's the "Requirements" tab inside the new Timetable hub (N1), which already shortens it. Not tested with clerks. | S |
| C4 | ✅ Done | M | Em-dashes as separators in 32 UI strings (between grade and class, for example). They render inconsistently on Android fonts. | grep for the character | Done 26 Sep: all em-dashes replaced (UI strings and comments). `no-restricted-syntax` rejects the character in any string or JSX text. | S |
| C5 | ✅ Done | M | Title Case and sentence case are mixed across headings and buttons. | Various | Done 26 Sep: about 330 headings, labels and buttons moved to sentence case. New `local/sentence-case` lint rule flags Title Case copy in labels, titles and button text, with an allow list for proper nouns and role titles. | S |
| C6 | ✅ Done | L | Subtitles under page titles are two-line explanations on some pages. | `Classes.tsx`, `Positions.tsx` | Done 26 Sep: every subtitle over 80 characters rewritten to one short line; longer explanations moved into an `InfoTip`. | S |

### 3.7 Accessibility

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| A1 | ✅ Done | H | Focus styles are defined in three places only; custom pills and select-rows rely on browser defaults. | `grep :focus` | A shared `:focus-visible` ring (`.os-pill`, `.os-select-card`, `.os-select-row`, `.os-focus-ring`) in `_utilities.scss`. The three existing context-specific `:focus` rules (dark header, search inputs) were left as-is - they're deliberate, not duplicates of this. `DataGrid`'s clickable rows also gained `tabIndex`/`onKeyDown`/the ring class; they were not keyboard-reachable at all before. | S |
| A2 | ✅ Done | M | 11 px text (`os-text-2xs`) used nine times for labels and metadata. | `grep os-text-2xs` | Done 26 Sep: `os-text-2xs` kept only for uppercase labels; the rest moved to 12 px, including two stepper labels. | S |
| A3 | ✅ Done | M | No skip-to-content link; the sidebar is tabbed through on every page. | `PortalShell.tsx` | Done 26 Sep: skip link is the first focusable element in every portal; `<main id="main-content">` takes focus. | S |
| A4 | ✅ Done | M | Colour is the only signal in a few places (house dot, progress bars). | `Houses`, `AttendanceByClassSection` | Done 26 Sep: new `ProgressBar` exposes `role="progressbar"` with its value; the attendance and setup bars use it and show counts as text. House dots already sit next to the house name. | S |
| A5 | 🚧 Started | M | No automated accessibility check. | CI | Playwright-on-six-authenticated-pages + Lighthouse gating isn't buildable or verifiable right now: every real page needs a signed-in ThunderID session, there's no seeded test user, and no way to drive/verify a browser in this environment. Built the piece that is verifiable instead: `axe-core` runs against key shared components (`FilterBar`, `ConfirmDeleteModal`, `UnsavedChangesModal`, `StudentAttendanceRow`) in the existing Vitest suite, which CI already runs via `pnpm test` - no workflow change needed. Doesn't cover color-contrast (jsdom has no CSS layout) or a live page/Lighthouse score. It immediately found a real, app-wide bug: all 32 `ModalHeader` usages passed `title` but not an accessible name, so every modal in the app was an unnamed dialog to screen readers - fixed all 16 files by adding `aria-label` to `ComposedModal` (not `label` on `ModalHeader`, which renders as a second *visible* heading and would have duplicated the title). | M |
| A6 | ✅ Done | L | `lang="en"` only. | `index.html` | Done 26 Sep: `<html lang>` follows the chosen language. | S |

### 3.8 Localisation

| # | Status | Impact | Finding | Fix | Effort |
|---|--------|--------|---------|-----|--------|
| L1 | 🚧 Started | H | The UI is English only. Sinhala and Tamil exist as data (mediums) but not for users. Parents are the group most affected. | Done 26 Sep for the student and parent portals and the shared shell (nav, header, bell, offline banner, pager). No library: a typed catalogue in `shared/i18n` (a missing Sinhala or Tamil key fails the build), Sinhala and Tamil load on demand. Language switch in the student and parent header, saved per user (`users.preferred_language`, migration 045, `PUT /me/language`). Noto Sans Sinhala and Tamil self-hosted, subset to 71 KB and 23 KB, loaded only when those characters appear. Not done: teacher and admin strings. The Sinhala and Tamil text is a draft and needs review by native-speaking teachers before release. | L |
| L2 | 🚧 Started | M | Numbers and dates are not locale-aware. | `shared/lib/number.ts` adds `formatNumber` and `formatPercent`; used on the student dashboard and parent cards. Not swept across every page yet. | S |

### 3.9 Mobile and low bandwidth

| # | Status | Impact | Finding | Evidence | Fix | Effort |
|---|--------|--------|---------|----------|-----|--------|
| M1 | ✅ Done | H | Eight media queries in the whole stylesheet. Tables and the fixed sidebar do not adapt. | `grep @media` | Done 26 Sep: every `DataGrid` stacks into labelled cards under 42 rem (`data-label` on each cell, CSS only). The drawer sidebar is N4. | M |
| M2 | ✅ Done | M | First load is 874 KB of CSS plus 1.2 MB of vendor JS. On 3G that is 8 to 12 seconds. | build report | Carbon trim and font self-hosting were already done before this pass (selective `@use` per component in `index.scss`, self-hosted IBM Plex in `_fonts.scss`). The skeleton shell is now done too (F1). | M |
| M3 | ✅ Done | M | No offline or stale indication. A parent on a train sees a spinner forever. | React Query defaults | Done 26 Sep: `OfflineBanner` in every portal shows "Showing saved data from HH:MM" with Retry when a refetch fails but cache exists, or when the device is offline. The student and child timetables keep a last-good copy in local storage (scoped per user) so they open offline. No service worker yet. | M |
| M4 | 🚧 Started | L | Teachers print class registers. No print stylesheet. | none | `@media print` (new `_print.scss`) hides chrome (header, sidebar, toast stack, all buttons, search/filter bars, pagination) and forces `--os-text-*`/`--os-border-*` to black/gray via the existing CSS custom properties, so it applies to every page built from the shared `.os-page`/`.os-table`/`.os-section` classes at once - no page-specific work needed. `page-break-inside: avoid` on table rows. Not done: page breaks *per class* for a multi-class print run - there's no "print all rosters" feature to hook that into yet, and un-verified visually (no browser access this session). | S |

---

## 4. Prioritised backlog

Done: N1, N2, N3, N4, N5, D1, D2, T1, T2, T4, T5, T6, T7, F1, F2, F4, F5, I1, I2, I3, I5,
C1, C2, C4, C5, C6, A1, A2, A3, A4, A6, M1, M2, M3.

Still open:

| # | State | What is left |
|---|-------|--------------|
| T3 | 🚧 | Wire sort and row selection into the four list pages; "Enrol selected". Export moves to T8. |
| T8 | ⏸ | Paused by the user on 26 Sep. Design is in its row above. |
| L1 | 🚧 | Teacher and admin strings; native review of the Sinhala and Tamil drafts. |
| L2 | 🚧 | Use `formatNumber` on the remaining stat cards and tables. |
| F3 | 🚧 | Audit the ~58 remaining error sites; an error-code map needs backend codes. |
| I4 | 🚧 | Sidebar links still skip the unsaved guard; needs the data-router migration. `ClassMarks.tsx` not wired. |
| A5 | 🚧 | Playwright and Lighthouse on real pages need a seeded test login. |
| M4 | 🚧 | Per-class page breaks need a "print all rosters" feature first. |
| D3 | ⬜ | Leadership overview. Will reuse the Automation findings (see the new plan). |
| C3 | 🚧 | Test the new labels with two clerks. |

Not from the original backlog, added ad hoc: ✅ a global "Create sessions for all classes"
button on the admin Attendance page (`Attendance.tsx`). It creates a session for every
current class without one on the selected date; the `UNIQUE (class_id, date)` constraint is
the safety net.

Every item ships with its own before-and-after screenshot in the PR. None of the 26 Sep
work was checked in a browser; it passed `tsc`, ESLint, Vitest, `go vet` and `go test`.

---

## 5. Rules going forward

Copy: sentence case, active voice, British spelling, no jargon a clerk would not
use, no em-dashes, errors as "What happened. What to do." in one sentence, buttons
as verb plus object ("Add student"), no exclamation marks.

Layout: one page header pattern (title, one-line subtitle, primary action on the
right), one card pattern (`SectionCard`), one list pattern (`FilterBar`,
`ActiveFilterTags`, `DataGrid`), one confirm pattern, one toast pattern.

Type and spacing: 12 px minimum body text, 14 px default, the 0.25 rem spacing
scale from `_utilities.scss`, colours only from `_tokens.scss`.

Touch: 44 px minimum target on phones, primary action reachable with the thumb
(sticky bottom bar on long forms and rosters).

States: every list has loading, empty, error and "filtered to nothing" states, and
every empty state leads to the action that fills it.

---

## 6. How to measure

| Metric | Target |
|--------|--------|
| Time to mark attendance for a class of 40 on a phone | under 90 seconds |
| Time to enrol a new student including guardian | under 3 minutes |
| Lighthouse accessibility on the six main pages | 95 or higher |
| Lighthouse performance on a mid-range Android profile | 90 or higher |
| Support questions about "where is X" in the first month after N1 | half of today |
| Parents who open the portal twice in a term after L1 | double |

Test with two clerks, three teachers and three parents before and after each
"Now" item. Ten minutes each, watching them do the top tasks, is enough.
