# Design migration: Carbon to Ant Design

Tracks the move of the frontend from IBM Carbon (`@carbon/react`,
`@carbon/icons-react`) to Ant Design (`antd`, `@ant-design/icons`).

Branch: `ui-migration-to-antd`. Inventory taken on 8 Nov 2026.

## How to use this file

- Every file under `frontend/src` that imports Carbon or Ant Design is listed below, grouped by folder.
- Status keys: ⬜ todo, 🟡 partial (uses antd but still imports Carbon), ✅ done.
- When a file is done, change its status to ✅ and update the counts in the progress table.
- A file is ✅ only when it passes the [definition of done](#definition-of-done).
- Re-check the list with the [audit commands](#audit-commands). The goal is zero Carbon imports.

## Progress

| Area | Files | Done |
| --- | --- | --- |
| `shared/ui/` | 32 | 32 |
| `shared/auth/` | 1 | 1 |
| `shared/i18n/` | 1 | 1 |
| `layouts/` | 7 | 7 |
| `app/` | 3 | 3 |
| `features/academics/` | 16 | 0 |
| `features/activation/` | 8 | 0 |
| `features/attendance/` | 9 | 0 |
| `features/auth/` | 5 | 1 |
| `features/curriculum/` | 16 | 0 |
| `features/email/` | 2 | 0 |
| `features/guardians/` | 3 | 3 |
| `features/leave/` | 8 | 0 |
| `features/marks/` | 5 | 0 |
| `features/notifications/` | 7 | 2 |
| `features/parent/` | 4 | 2 |
| `features/portfolio/` | 12 | 5 |
| `features/positions/` | 2 | 2 |
| `features/reports/` | 8 | 6 |
| `features/school/` | 22 | 0 |
| `features/staff/` | 3 | 3 |
| `features/students/` | 10 | 10 |
| `features/system/` | 4 | 1 |
| `features/teachers/` | 16 | 0 |
| `features/timetable/` | 21 | 0 |
| `features/workflows/` | 10 | 0 |
| **Total** | **235** | **79 (34%)** |

Not counted above: [UI/UX issues](#uiux-issues), [SCSS cleanup](#scss-cleanup) and [build and docs cleanup](#build-and-docs-cleanup).

## Already done

| Commit | What |
| --- | --- |
| `620f2e9` | antd + `@ant-design/icons` installed, `shared/theme/antdTheme.ts` reads `--os-*` tokens, `ConfigProvider` in `main.tsx`, Google Sans font, `LinkButton` |
| `0dea978` | App shell: `PortalShell`, `AppHeaderChrome`, `SidebarNav` (antd `Menu`), `NotificationsBell`, `GlobalSearch`, `LanguageSwitcher`, `ChangePasswordModal` |
| `9f6fed2` | Admin dashboard (all `reports/components/dashboard/*`), `AddStudent` form, `PersonNameItems` |
| `5e65fbf` | Screenshots in `docs/screenshots/antd-migration/` |
| Not committed yet | Phase 3 (all of `shared/ui`, `shared/auth`, `app/pages`, nav icons, dashboard icons), plus `students`, `guardians`, `staff`, `positions`, parent `ChildDetail`, and the portfolio tabs and findings banner shown inside those pages |
| Not committed yet | Page style aligned with the dashboard: rounded cards, softer table headers, no rule under page titles, profile banner as a card. `DataGrid` now renders antd `Table` |

## Shared building blocks

Use these when migrating a page instead of raw antd, so every page looks and behaves the same.

| Need | Use | Notes |
| --- | --- | --- |
| Labelled input outside an antd `Form` | `shared/ui/TextField`, `TextAreaField`, `SelectField` | Same props idea as Carbon: `label`, `invalid`, `invalidText`, `helperText`. `onChange` gets the value, not an event |
| Any other labelled control | `shared/ui/Field` | Wraps a control with label, error and helper text |
| Date input | `shared/ui/DateField` | ISO `YYYY-MM-DD` in and out, shows `DD/MM/YYYY` |
| Searchable person picker | `shared/ui/EntityCombobox` | antd `Select` with client or server search |
| Loading lines and blocks | `shared/ui/Skeleton` (`SkeletonText`, `SkeletonPlaceholder`) | Same props as Carbon, so only the import changes |
| Modal sizes | `shared/ui/modalWidth` | `xs` 400, `sm` 520, `md` 720, `lg` 960 px |
| Tables | `shared/ui/DataGrid` | antd `Table`; rows stack into cards under 42rem |
| Cards | `.os-section` / `SectionCard` | Rounded card that matches the dashboard `Card` |
| Tag colours for enums | `shared/lib/constants/tags.ts` | `SEVERITY_COLOR` is the antd version; add antd maps beside the Carbon ones as pages move |

## Visual style

The admin dashboard is the reference. Every migrated page should match it:

- Cards: white, 1px `--os-border-subtle` border, `$os-radius` (0.625rem) corners, no shadow.
- Card header: 1rem, weight 500, 3.5rem tall, one divider line.
- Page title: 1.75rem, weight 500. Subtitle 1rem in `--os-text-tertiary`. No line under the header.
- Tables: header in `--os-layer-hover`, normal case, weight 500. Row hover in `--os-layer-hover`.
- Controls: 36px tall by default (`controlHeight` in `antdTheme.ts`), 40px for main form fields (`size="large"`).
- No square boxes: plain bordered boxes use `.os-border`, which is rounded.

## Rules while migrating

- Follow `CLAUDE.md`: files under 250 lines, no inline `style={{}}` except runtime values, no hex colours outside `_tokens.scss`.
- Colours reach antd only through `antdTheme.ts`. Do not set colours in component `style` or `token` props.
- Keep the list page template (`FilterBar` + `ActiveFilterTags` + `useListFilters` + `ListState` + `DataGrid`). Migrate the shared pieces, not each page.
- Grids holding form controls (marks entry, attendance marking, period editor) stay as plain `<table className="os-table">`. Only swap the inputs inside them.
- Use antd `Form` with `rules` for new forms (see `AddStudent.tsx`). Keep the existing validation helpers in `shared/lib`.
- Import icons by name from `@ant-design/icons`. Do not import the whole package.
- One feature folder per PR where possible. Attach before and after screenshots.

## Definition of done

A file is ✅ when all of these hold:

- [ ] No import from `@carbon/react` or `@carbon/icons-react`.
- [ ] No `cds--` class in its markup or in the SCSS that styles it.
- [ ] Uses theme tokens only (the app has no dark mode yet, see UX-06).
- [ ] Works at phone width (no horizontal scroll, modals fit).
- [ ] Keyboard: tab order, focus ring, Esc closes modals, Enter submits forms.
- [ ] Loading, empty and error states still render (`ListState`, skeletons, `ErrorMessage`).
- [ ] `pnpm lint`, `pnpm test` and `pnpm build` pass.

## Component mapping

Counts are files that still import the Carbon component.

| Carbon | Files | Ant Design | Notes |
| --- | --- | --- | --- |
| `Button` | 121 | `Button` | `kind="primary"` to `type="primary"`, `kind="ghost"` to `type="text"`, `kind="danger"` to `danger`, `renderIcon` to `icon`. Links use `LinkButton` |
| `IconButton` | 7 | `Button` + `Tooltip` | `shape="circle"` or `type="text"`, put the label in `aria-label` and `Tooltip` |
| `Tag` | 69 | `Tag` | Carbon `type="blue"` etc. to antd `color`. Prefer status presets (`success`, `warning`, `error`, `processing`) |
| `Select` + `SelectItem` | 51 | `Select` | `options` array instead of children; `onChange` gets the value, not an event |
| `TextInput` | 45 | `Input` | `labelText` moves to `Form.Item label`; `invalid`/`invalidText` to `Form.Item validateStatus`/`help` |
| `PasswordInput` | 2 | `Input.Password` | Also `shared/ui/PasswordFields.tsx` |
| `TextArea` | 9 | `Input.TextArea` | `autoSize` instead of `rows` where useful |
| `NumberInput` | 18 | `InputNumber` | `onChange` gets the number or `null` |
| `Checkbox` | 15 | `Checkbox` | `labelText` becomes children; `onChange` gets an event |
| `RadioButtonGroup` + `RadioButton` | 4 | `Radio.Group` + `Radio` | |
| `Toggle` | 3 | `Switch` | Label goes beside it or in `Form.Item` |
| `Dropdown` | 4 | `Select` | |
| `ComboBox` | 1 | `Select showSearch` | `shared/ui/EntityCombobox.tsx` |
| `MultiSelect` / `FilterableMultiSelect` | 3 | `Select mode="multiple"` | Add `showSearch` for the filterable one |
| `DatePicker` + `DatePickerInput` | 1 | `DatePicker` | Uses dayjs; convert to and from ISO strings in `shared/ui/DateField.tsx` only |
| `FileUploaderButton` | 1 | `Upload` + `Button` | `beforeUpload` returning `false` to keep it client side |
| `ComposedModal` + `ModalHeader/Body/Footer` | 21 | `Modal` | `open`, `title`, `footer`, `onCancel`, `confirmLoading`. Migrate `shared/ui/*Modal.tsx` first |
| `InlineNotification` | 41 | `Alert` | `kind` to `type`, `subtitle` to `description`, `hideCloseButton` to no `closable` |
| `ActionableNotification` | 3 | `Alert` with `action` | |
| `ToastNotification` | 1 | `App.useApp().notification` or `message` | Replaces `shared/ui/toast/ToastStack.tsx`; keep the `useToast` API so callers do not change |
| `Tabs` + `TabList/Tab/TabPanels/TabPanel` | 10 | `Tabs` with `items` | `shared/ui/TabSection.tsx` wraps `TabPanel`; replace or delete it |
| `Pagination` | 10 | `Pagination` | `pageSizes` to `pageSizeOptions`; `onChange` gets `(page, pageSize)` |
| `DataTable` parts (`Table`, `TableRow`, ...) | 1 | `Table` | Only in `shared/ui/DataGrid.tsx`. Keep the `DataGrid` props the same |
| `TableToolbarSearch` | 3 | `Input.Search` or `Input` with `prefix` | `shared/ui/FilterBar.tsx` plus two directory pages |
| `Tile` / `ClickableTile` | 3 / 3 | `Card` / `Card hoverable` | Wrap clickable cards in `Link`, not `onClick` |
| `SkeletonText` / `SkeletonPlaceholder` / `SkeletonIcon` | 38 / 1 / 1 | `Skeleton` / `Skeleton.Node` / `Skeleton.Avatar` | Rebuild `shared/ui/SkeletonShell.tsx` and friends first |
| `InlineLoading` | 3 | `Spin size="small"` + text | |
| `OverflowMenu` + `OverflowMenuItem` | 1 | `Dropdown` with `menu.items` + `Button icon={<MoreOutlined />}` | |
| `Toggletip` parts | 1 | `Popover trigger="click"` | `shared/ui/InfoTip.tsx` |

## Icon mapping

Suggested `@ant-design/icons` replacement for every Carbon icon in use. Count is the number of files.

| Carbon | Files | antd icon |
| --- | --- | --- |
| `Add` | 37 | `PlusOutlined` |
| `AddAlt` | 1 | `PlusCircleOutlined` |
| `Archive` | 1 | `InboxOutlined` |
| `ArrowDown` / `ArrowUp` | 1 / 1 | `ArrowDownOutlined` / `ArrowUpOutlined` |
| `ArrowLeft` | 13 | `ArrowLeftOutlined` |
| `ArrowRight` | 6 | `ArrowRightOutlined` |
| `ArrowUpRight` | 1 | `ExportOutlined` |
| `Book` | 7 | `BookOutlined` |
| `Building` | 9 | `BankOutlined` |
| `Calendar` | 4 | `CalendarOutlined` |
| `Certificate` | 1 | `SafetyCertificateOutlined` |
| `ChartLine` | 2 | `LineChartOutlined` |
| `Chat` | 1 | `MessageOutlined` |
| `Checkmark` | 5 | `CheckOutlined` |
| `CheckmarkFilled` | 13 | `CheckCircleFilled` |
| `CheckmarkOutline` | 1 | `CheckCircleOutlined` |
| `Chemistry` / `Microscope` | 1 / 1 | `ExperimentOutlined` |
| `ChevronLeft` / `ChevronRight` | 1 / 4 | `LeftOutlined` / `RightOutlined` |
| `Close` | 4 | `CloseOutlined` |
| `CloseFilled` / `ErrorFilled` | 4 / 1 | `CloseCircleFilled` |
| `Compass` | 1 | `CompassOutlined` |
| `Copy` | 1 | `CopyOutlined` |
| `Departure` | 2 | `CarryOutOutlined` (leave) |
| `Document` | 1 | `FileTextOutlined` |
| `DocumentBlank` | 1 | `FileOutlined` |
| `DocumentPdf` | 2 | `FilePdfOutlined` |
| `Download` | 2 | `DownloadOutlined` |
| `Edit` | 15 | `EditOutlined` |
| `Education` | 4 | `ReadOutlined` |
| `Email` | 1 | `MailOutlined` |
| `Enterprise` | 1 | `ShopOutlined` |
| `EventSchedule` | 12 | `ScheduleOutlined` |
| `Group` | 1 | `ClusterOutlined` |
| `Home` | 8 | `HomeOutlined` |
| `HospitalBed` | 1 | `MedicineBoxOutlined` |
| `Idea` | 5 | `BulbOutlined` |
| `Identification` | 1 | `IdcardOutlined` |
| `Information` | 5 | `InfoCircleOutlined` |
| `Language` / `Translate` | 3 / 1 | `GlobalOutlined` / `TranslationOutlined` |
| `Laptop` | 1 | `LaptopOutlined` |
| `Layers` | 3 | `AppstoreOutlined` |
| `Location` / `Map` | 1 / 1 | `EnvironmentOutlined` |
| `Locked` | 3 | `LockOutlined` |
| `Notification` | 8 | `BellOutlined` |
| `PaintBrush` | 1 | `BgColorsOutlined` |
| `Phone` | 1 | `PhoneOutlined` |
| `Play` | 1 | `PlayCircleOutlined` |
| `Printer` | 1 | `PrinterOutlined` |
| `Renew` | 7 | `ReloadOutlined` |
| `Report` | 4 | `FileDoneOutlined` |
| `Restaurant` | 1 | `CoffeeOutlined` |
| `Rocket` | 3 | `RocketOutlined` |
| `Save` | 14 | `SaveOutlined` |
| `Search` | 5 | `SearchOutlined` |
| `Security` | 1 | `SafetyOutlined` |
| `Send` | 3 | `SendOutlined` |
| `Settings` | 3 | `SettingOutlined` |
| `Table` | 4 | `TableOutlined` |
| `TaskApproved` | 1 | `AuditOutlined` |
| `Theater` | 1 | `SoundOutlined` |
| `Time` | 7 | `ClockCircleOutlined` |
| `Tools` | 1 | `ToolOutlined` |
| `TrashCan` | 15 | `DeleteOutlined` |
| `Trophy` | 2 | `TrophyOutlined` |
| `Undo` | 1 | `UndoOutlined` |
| `Upload` | 2 | `UploadOutlined` |
| `UserAdmin` | 1 | `CrownOutlined` |
| `UserFollow` | 4 | `UserAddOutlined` |
| `UserMultiple` | 14 | `TeamOutlined` |
| `UserRole` | 3 | `SolutionOutlined` |
| `View` | 1 | `EyeOutlined` |
| `Warning` / `WarningAlt` | 3 / 1 | `WarningOutlined` |
| `WarningFilled` / `WarningAltFilled` | 1 / 3 | `WarningFilled` / `ExclamationCircleFilled` |

## Order of work

Shared pieces first, because most pages render through them.

| Phase | Scope | Why first |
| --- | --- | --- |
| 0 | Foundation, theme, font | ✅ Done |
| 1 | App shell | ✅ Done |
| 2 | Pilot screens (dashboard, enrol student) | ✅ Done |
| 3 | `shared/ui`, `shared/auth`, `app/pages`, `layouts/nav` | ✅ Done. Every list page, modal, toast and skeleton comes from here |
| 4 | Admin core: `students`, `teachers`, `guardians`, `staff`, `academics`, `curriculum` | 🟡 `students`, `guardians`, `staff`, `positions` done. Highest traffic admin screens |
| 5 | Daily use: `attendance`, `marks`, `leave`, `timetable`, `notifications` | Teacher portal relies on these |
| 6 | Portals: `parent`, `students/pages/self`, `teachers/pages/self`, `teachers/components/dashboard` | |
| 7 | Admin settings: `school`, `system`, `positions`, `portfolio`, `reports`, `email`, `workflows` | |
| 8 | Sign in and activation: `auth`, `activation` | Public screens; test with ThunderID flows |
| 9 | SCSS, build and docs cleanup, remove Carbon packages | Only after the file list is all ✅ |

Phase 3 order inside `shared/ui`: modals (`FormModal`, `ConfirmDeleteModal`, `ConfirmActionModal`, `ConfirmEditModal`, `UnsavedChangesModal`), then `DataGrid`, `FilterBar`, `ActiveFilterTags`, then notifications (`ErrorMessage`, `MutationErrorNotification`, `toast/ToastStack`, `OfflineBanner`), then skeletons, then the small rest.

## UI/UX issues

Found by reading the migrated screens (shell, admin dashboard, enrol student) and the setup they rely on. Severity: **High** blocks or misleads users, **Med** slows them down or looks broken, **Low** polish.

Mark each one ✅ when fixed, like the file list.

### Migration-wide

| Status | ID | Sev | Where | Issue | Fix |
| --- | --- | --- | --- | --- | --- |
| 🟡 | UX-01 | High | All screens | Two design systems live side by side. Migrated screens have 8px radius, Google Sans, antd inputs; the rest are square Carbon controls. Users see the style change on almost every click | Finish phase 3 (`shared/ui`) early so most pages change together. Until then, align Carbon radius and input height in `_carbon-overrides.scss`. **Progress:** phase 3 done and shared cards, tables and headers restyled for every page; Carbon inputs on unmigrated pages are still square |
| ⬜ | UX-02 | High | `antdTheme.ts` | `controlOutline: "transparent"` and `controlOutlineWidth: 0` remove the focus ring on inputs and selects. Focus only shows as a border colour change, which is hard to see for keyboard users (WCAG 2.4.7) | Restore a visible ring, e.g. `controlOutlineWidth: 2` with an accent tint from `_tokens.scss` |
| ⬜ | UX-03 | Med | `antdTheme.ts` | `boxShadowSecondary: "none"` removes the only edge on dropdowns, popovers, select menus and the search panel. They blend into white cards behind them | Keep a soft shadow, or add a `--os-border-subtle` border to `.ant-dropdown`, `.ant-popover`, `.ant-select-dropdown` |
| ⬜ | UX-04 | Med | `main.tsx` | No antd `<App>` wrapper. `Modal.confirm`, `message` and `notification` called later will not get the theme | Wrap the router in antd `App` and use `App.useApp()` |
| ⬜ | UX-05 | Med | `main.tsx`, `i18n` | antd `locale` is never set. Student and parent portals switch to Sinhala or Tamil, but antd built-in text (pagination, date picker, empty states, "OK"/"Cancel") stays English | Pass a locale to `ConfigProvider` from `I18nProvider`. antd has no `si`/`ta` locale, so add small custom locale objects |
| ⬜ | UX-06 | Low | `_tokens.scss` | There is no dark mode. Fine for now, but `antdTheme.ts` reads tokens once at start, so adding one later needs a rebuild of the theme on change | Note only. If dark mode is added, rebuild the theme when the scheme changes |
| ✅ | UX-07 | Med | Toasts | Toasts are still Carbon (`shared/ui/toast/ToastStack.tsx`) and appear on antd screens | Move to antd `notification` behind the same `useToast` API (phase 3) |
| 🟡 | UX-08 | Med | Icons | Carbon and antd icons are mixed on the same screen: sidebar (`layouts/nav/*.ts`) and dashboard stat cards use Carbon, buttons next to them use antd. Stroke weight and size differ | Swap using the icon mapping table. **Progress:** sidebar, bottom tabs and dashboard done; unmigrated pages still use Carbon icons |

### App shell

| Status | ID | Sev | Where | Issue | Fix |
| --- | --- | --- | --- | --- | --- |
| ⬜ | UX-09 | Med | `AppHeaderChrome.tsx` | Account actions are split: change password is its own key icon in the top bar, profile and sign out are in the user menu. The key icon is hard to recognise | Move "Change password" into the user dropdown |
| ⬜ | UX-10 | Med | `AppHeaderChrome.tsx` | The user button is a generic icon. Nobody can see who is signed in or in which role, which matters on shared staff room computers | Show name (or initials avatar) and role in the button or at the top of the dropdown |
| ⬜ | UX-11 | Low | Top bar | Icon-only buttons (search, language, password, bell, profile) have no tooltips. Only screen readers get a name | Wrap them in antd `Tooltip` |
| ⬜ | UX-12 | Med | `GlobalSearch.tsx` | Picking a guardian or non-academic staff result opens the list page, not that person. The user has to search again | Route to the record, or open the list with the search pre-filled |
| ⬜ | UX-13 | Low | `GlobalSearch.tsx` | All text is hard-coded English ("Search", "Actions", "No matches") while the rest of the shell uses `t()` | Move strings to i18n messages |
| ⬜ | UX-14 | Low | `GlobalSearch.tsx`, `AppHeaderChrome.tsx` | Ctrl+K is handled by two separate listeners | Keep one listener in `AppHeaderActions` |
| ⬜ | UX-15 | Med | `NotificationsBell.tsx` | Clicking a notification only marks it read. It does not open it or go anywhere, and long messages stay cut off | Open the item in the notification center, or expand it in place |
| ⬜ | UX-16 | Low | `NotificationsBell.tsx` | The badge is a dot only. The unread count is given to screen readers but not shown | Use `Badge count` with `overflowCount={9}` |
| ⬜ | UX-17 | Low | `PortalShell.tsx` | Collapsing the sidebar on desktop hides it fully (no icon rail) and the choice resets on reload | Use an icon-only rail when collapsed and remember the state in `localStorage` |

### Admin dashboard

| Status | ID | Sev | Where | Issue | Fix |
| --- | --- | --- | --- | --- | --- |
| ⬜ | UX-18 | High | `Dashboard.tsx` | No error states. If the students, teachers, classes or subjects query fails, the stat cards show `0`, and the setup checklist says "Add a student" etc. This tells the admin their data is gone | Show an error state per card, and hide the checklist when any of its queries fails |
| ⬜ | UX-19 | Med | `Dashboard.tsx` | The setup checklist is not rendered while loading, then appears and pushes the page down | Render a skeleton of the same height while loading |
| ⬜ | UX-20 | Med | `AttendanceByClassSection.tsx` | Getting to a class's attendance takes three steps: grade row, modal, class card, then the class page tab | Link grade rows straight to `/attendance` filtered by grade, keep the modal as a quick view only |
| ⬜ | UX-21 | Med | `AttendanceByClassSection.tsx` | Classes with no session today count as neither marked nor pending, so a grade can show "0 marked, 0 pending" with an empty bar | Add a "not started" count, or count them as pending |
| ⬜ | UX-22 | Low | `RecentActivitySection.tsx` | "View all" goes to `/students`, but the feed also lists teachers | Point to the audit log, or label it "All students" |
| ⬜ | UX-23 | Low | Dashboard | Quick actions say "Add student", the empty state says "Enrol a student", the form says "Enrol new student" | Pick one verb (see UX-27) |

### Enrol student form

| Status | ID | Sev | Where | Issue | Fix |
| --- | --- | --- | --- | --- | --- |
| ⬜ | UX-24 | High | `AddStudent.tsx` | After saving, the page goes to `/students` with no success message. The list is sorted by name, so the new student is often not on the first page. Users cannot tell it worked | Show a success toast and go to the new student's detail page, or offer "Enrol another" |
| ⬜ | UX-25 | Med | `AddStudent.tsx` | Server errors show in an `Alert` at the top of the page, while the user is at the Save button at the bottom. The error is easy to miss. Field errors also do not scroll into view | Scroll to the alert on error, and set `scrollToFirstError` on the `Form` |
| ⬜ | UX-26 | Med | `AddStudent.tsx` | No unsaved-changes guard. Back, Cancel or a sidebar click drops a half-filled form. `useUnsavedChangesGuard` exists and is used on other pages | Use `useUnsavedChangesGuard` with `form.isFieldsTouched()` |
| ⬜ | UX-27 | Med | App-wide copy | "Enrol student" means two things: creating a student in the school (Students page) and adding a student to a class (`EnrolStudentModal`, `StudentsTab`). Both "enrol" and "enroll" spellings are used | Use "Add student" for the school, "Enrol in class" for classes, and one spelling (British "enrol") |
| ⬜ | UX-28 | Med | `AddStudent.tsx` | The flow stops after the account is created. Class, guardians and subjects must be found and added later from another page | After save, land on student detail with a short "Next: add guardian, enrol in class" checklist |
| ⬜ | UX-29 | Low | `PersonNameItems.tsx` | The full-name help text uses a real person's full name as the example | Use a made-up example name |
| ⬜ | UX-30 | Low | `AddStudent.tsx` | Error alert title is just "Error" | Use "Could not enrol student" |

## File inventory

Paths are relative to `frontend/src/<area>/`.

### `shared/ui/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `ActiveFilterTags.tsx` | Button, Tag | Close |
| ✅ | `ConfirmActionModal.tsx` | Button, ComposedModal, ModalBody, ModalFooter, ModalHeader | - |
| ✅ | `ConfirmDeleteModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ✅ | `ConfirmEditModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ✅ | `DataGrid.tsx` | Pagination, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TableSelectAll, TableSelectRow, TableToolbar, TableToolbarContent | - |
| ✅ | `DateField.tsx` | DatePicker, DatePickerInput | - |
| ✅ | `EmptyState.tsx` | - | DocumentBlank |
| ✅ | `EntityCombobox.tsx` | ComboBox | - |
| ✅ | `ErrorBoundary.tsx` | Button | WarningAltFilled |
| ✅ | `ErrorMessage.tsx` | InlineNotification, Button | - |
| ✅ | `FilterBar.tsx` | TableToolbarSearch | - |
| ✅ | `FormModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter, InlineNotification | - |
| ✅ | `InfoTip.tsx` | Toggletip, ToggletipButton, ToggletipContent | Information |
| ✅ | `LinkButton.tsx` | - | - |
| ✅ | `ListRowSkeleton.tsx` | SkeletonText | - |
| ✅ | `MediumTag.tsx` | Tag | - |
| ✅ | `MutationErrorNotification.tsx` | InlineNotification | - |
| ✅ | `OfflineBanner.tsx` | ActionableNotification | - |
| ✅ | `PasswordFields.tsx` | PasswordInput | - |
| ✅ | `PasswordRequirements.tsx` | - | CheckmarkFilled, Information |
| ✅ | `PersonNameFields.tsx` | TextInput | - |
| ✅ | `PersonNameItems.tsx` | - | - |
| ✅ | `RemoveIconButton.tsx` | Button | TrashCan |
| ✅ | `RouteErrorBoundary.tsx` | Button | WarningAltFilled |
| ✅ | `SkeletonShell.tsx` | SkeletonText, SkeletonPlaceholder | - |
| ✅ | `StatCardSkeleton.tsx` | SkeletonText | - |
| ✅ | `StreamTag.tsx` | Tag | - |
| ✅ | `TabSection.tsx` | TabPanel | - |
| ✅ | `TableSkeleton.tsx` | SkeletonText | - |
| ✅ | `TodayStatCard.tsx` | SkeletonText | - |
| ✅ | `UnsavedChangesModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ✅ | `toast/ToastStack.tsx` | ToastNotification, ActionableNotification | - |

### `shared/auth/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `IdleWarningModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |

### `shared/i18n/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `LanguageSwitcher.tsx` | - | - |

### `layouts/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `AppHeaderChrome.tsx` | - | - |
| ✅ | `PortalShell.tsx` | - | - |
| ✅ | `SidebarNav.tsx` | - | - |
| ✅ | `nav/admin.ts` | - | Home, ChartLine, UserMultiple, Education, Building, Book, Language, EventSchedule, Settings, Calendar, Notification, UserFollow, UserAdmin, UserRole, Trophy, Renew, Table, Group, DocumentPdf, Idea, Departure |
| ✅ | `nav/parent.ts` | - | Home, Notification |
| ✅ | `nav/student.ts` | - | Home, Notification, EventSchedule, Report, Table, UserMultiple, Document, Idea |
| ✅ | `nav/teacher.ts` | - | Home, Building, Table, Renew, Idea, EventSchedule, Calendar, Notification, Settings, Report, ChartLine, Departure, TaskApproved |

### `app/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `pages/AccessRestricted.tsx` | Button | Locked |
| ✅ | `pages/ComingSoon.tsx` | Button | Rocket, ArrowLeft |
| ✅ | `pages/NotFound.tsx` | Button | Compass, ArrowLeft, Home |

### `features/academics/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AssignClassSubjectTeacherModal.tsx` | InlineNotification | - |
| ⬜ | `components/AttendanceTab.tsx` | Button | Add |
| ⬜ | `components/ClassFormModal.tsx` | Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, NumberInput, Select, SelectItem, TextInput | Save |
| ⬜ | `components/EditClassModal.tsx` | TextInput, Select, SelectItem | - |
| ⬜ | `components/GradeFormModal.tsx` | TextInput | - |
| ⬜ | `components/GradeGroup.tsx` | Button, IconButton, SkeletonIcon, SkeletonText, Tag | Add, ArrowDown, ArrowUp, Edit, TrashCan, Warning |
| ⬜ | `components/PromotionGroup.tsx` | Button, Checkbox, Tag | ArrowRight |
| ⬜ | `components/SectionHeadsPanel.tsx` | Button, Tag, InlineNotification | - |
| ⬜ | `components/StreamGroups.tsx` | Button, SkeletonText, Tag, TextInput | Add |
| ⬜ | `components/StudentsTab.tsx` | Button, Tag | Add, UserMultiple |
| ⬜ | `components/SubjectsTab.tsx` | Button, Tag | UserFollow |
| ⬜ | `pages/admin/AddClass.tsx` | Button, Select, SelectItem, TextInput, InlineNotification | ArrowLeft, Save |
| ⬜ | `pages/admin/ClassDetail.tsx` | Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel | ArrowLeft, Edit, UserMultiple, EventSchedule, UserFollow |
| ⬜ | `pages/admin/Classes.tsx` | Button, InlineNotification | Add |
| ⬜ | `pages/admin/Promotion.tsx` | Button, Select, SelectItem, Checkbox, InlineNotification, SkeletonText | Renew |
| ⬜ | `pages/admin/Streams.tsx` | Button, TextInput, InlineNotification | Layers, Add |

### `features/activation/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/ActivateCompleteForm.tsx` | Button | - |
| ⬜ | `components/ActivateStartForm.tsx` | Button, Select, SelectItem, TextInput | - |
| ⬜ | `components/ActivationBatches.tsx` | Button, Tag | View |
| ⬜ | `components/ActivationSettingsCard.tsx` | Button, NumberInput, Toggle | Save |
| ⬜ | `components/AuthShell.tsx` | - | CheckmarkFilled |
| ⬜ | `components/BatchCodesModal.tsx` | ComposedModal, InlineNotification, ModalBody, ModalHeader | - |
| ⬜ | `components/GenerateCodesCard.tsx` | Button, Select, SelectItem | - |
| ⬜ | `components/IssuedBatchPanel.tsx` | Button, Checkbox, InlineNotification | Download, Printer |

### `features/attendance/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AttendanceHistoryTable.tsx` | Tag | - |
| ⬜ | `components/StatusButton.tsx` | - | CheckmarkFilled, CloseFilled, Time, Certificate |
| ⬜ | `components/staff/StaffRosterTable.tsx` | Button, Pagination, Tag | CloseFilled |
| ⬜ | `components/staff/StaffStatusButton.tsx` | - | CheckmarkFilled, CloseFilled, Time, Renew |
| ⬜ | `pages/admin/Attendance.tsx` | Button, Tag | EventSchedule, CheckmarkFilled, WarningFilled, AddAlt |
| ⬜ | `pages/admin/AttendanceMark.tsx` | Button, Tag, InlineNotification, TextInput, Pagination | ArrowLeft, Save, Search, UserMultiple, Warning |
| ⬜ | `pages/admin/StaffAttendance.tsx` | Tab, TabList, Tabs, Tag, Toggle | - |
| ⬜ | `pages/teacher/TeacherAttendance.tsx` | Tag | EventSchedule, Search, Time |
| ⬜ | `pages/teacher/TeacherMyAttendance.tsx` | Button, Tag | ChevronLeft, ChevronRight, CheckmarkFilled, CloseFilled, Time, Renew |

### `features/auth/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/ChangePasswordModal.tsx` | - | - |
| ⬜ | `pages/ForgotPassword.tsx` | Button, TextInput, Select, SelectItem, InlineNotification | CheckmarkFilled |
| ⬜ | `pages/PasswordInterstitial.tsx` | Button | Security |
| ⬜ | `pages/ResetPassword.tsx` | Button, InlineNotification | CheckmarkFilled |
| ⬜ | `pages/SignIn.tsx` | Button | - |

### `features/curriculum/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AddSubjectModal.tsx` | Select, SelectItem, TextArea, SkeletonText | - |
| ⬜ | `components/CreateLevelModal.tsx` | TextInput, Select, SelectItem, NumberInput | - |
| ⬜ | `components/CreateSubjectModal.tsx` | NumberInput, TextInput | - |
| ⬜ | `components/CurriculumPanel.tsx` | Button, InlineNotification | Add, Rocket |
| ⬜ | `components/DuplicateLevelModal.tsx` | TextInput, Select, SelectItem, NumberInput | - |
| ⬜ | `components/EditLevelModal.tsx` | TextInput, Select, SelectItem, NumberInput | - |
| ⬜ | `components/EditSubjectModal.tsx` | NumberInput, TextInput | - |
| ⬜ | `components/GroupFormModal.tsx` | TextInput, NumberInput | - |
| ⬜ | `components/GroupsList.tsx` | Button, Tag, InlineNotification | Add |
| ⬜ | `components/LevelsList.tsx` | Button, Tag | Add, ChevronRight, Copy, Edit, Layers |
| ⬜ | `components/SubjectCard.tsx` | Tag | Book, Warning |
| ⬜ | `components/SubjectsPanel.tsx` | Button, IconButton, Tag | Add, Edit, TrashCan |
| ⬜ | `pages/admin/AddSubject.tsx` | Button, TextInput, NumberInput, InlineNotification | ArrowLeft, Save |
| ⬜ | `pages/admin/LevelDetail.tsx` | Button, InlineNotification | Add, ArrowLeft |
| ⬜ | `pages/admin/Mediums.tsx` | Button, TextInput, ComposedModal, ModalHeader, ModalBody, ModalFooter | Add, Language |
| ⬜ | `pages/admin/SubjectsCurriculum.tsx` | Tabs, TabList, Tab, TabPanels, TabPanel | - |

### `features/email/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/EmailPreviewCard.tsx` | Button, InlineNotification, Select, SelectItem | Send |
| ⬜ | `components/EmailStatusCard.tsx` | InlineNotification, Tag | - |

### `features/guardians/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/EditGuardianModal.tsx` | TextInput, Select, SelectItem | - |
| ✅ | `components/GuardianDetail.tsx` | Tag, SkeletonText, Button, Pagination | Locked, UserMultiple, Edit, TrashCan, Phone, Email, Identification, Notification |
| ✅ | `pages/admin/GuardiansDirectory.tsx` | Checkbox, Pagination, Tile, Tag, TableToolbarSearch, ClickableTile, Button | Close |

### `features/leave/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/ApplyLeaveModal.tsx` | Select, SelectItem, TextArea, TextInput | - |
| ⬜ | `components/LeaveBalanceCards.tsx` | SkeletonText | - |
| ⬜ | `components/LeaveRequestsTable.tsx` | Button | - |
| ⬜ | `components/LeaveReviewModal.tsx` | Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, SkeletonText, TextArea | - |
| ⬜ | `components/LeaveStatusTag.tsx` | Tag | - |
| ⬜ | `components/ReliefPeriodsTable.tsx` | InlineNotification, Select, SelectItem, SkeletonText | - |
| ⬜ | `pages/admin/LeaveRegister.tsx` | Select, SelectItem, Tab, TabList, Tabs | - |
| ⬜ | `pages/teacher/MyLeave.tsx` | Button, Select, SelectItem | Add |

### `features/marks/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/ClassMarks.tsx` | Select, SelectItem, NumberInput, Button, InlineNotification, Checkbox, Tag | Save |
| ⬜ | `components/ClassSubjectCard.tsx` | ClickableTile | CheckmarkFilled |
| ⬜ | `components/MarksEntryTable.tsx` | Checkbox, NumberInput, Tag | - |
| ⬜ | `pages/student/StudentMarks.tsx` | Select, SelectItem | - |
| ⬜ | `pages/teacher/TeacherMarks.tsx` | Select, SelectItem, Button, InlineNotification | Save, ArrowLeft |

### `features/notifications/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/AgentFindingsBanner.tsx` | ActionableNotification, Tag | - |
| ⬜ | `components/DraftRow.tsx` | Button, InlineNotification | Send, TrashCan |
| ⬜ | `components/NotificationHistory.tsx` | Select, SelectItem, Tag | - |
| ✅ | `components/NotificationsBell.tsx` | - | - |
| ⬜ | `components/RecipientPicker.tsx` | Button, Dropdown | Add |
| ⬜ | `pages/NotificationCenter.tsx` | Tag, Dropdown, Button, Pagination | Archive, ArrowUpRight, Search |
| ⬜ | `pages/NotificationComposer.tsx` | Button, TextInput, TextArea, Dropdown, Tag, InlineNotification, ComposedModal, ModalBody, ModalHeader | Send, Save |

### `features/parent/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/ChildAcademicTabs.tsx` | Select, SelectItem | - |
| ⬜ | `components/ChildCard.tsx` | SkeletonText | ChevronRight, EventSchedule, Report |
| ✅ | `pages/ChildDetail.tsx` | Tabs, TabList, Tab, TabPanels | ArrowLeft |
| ⬜ | `pages/ParentDashboard.tsx` | Tag | EventSchedule, Notification, UserMultiple |

### `features/portfolio/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AppointPrefectModal.tsx` | Select, SelectItem | - |
| ⬜ | `components/PortfolioTables.tsx` | Tag | - |
| ⬜ | `components/SocietyFormModal.tsx` | TextInput | - |
| ⬜ | `components/SocietyRoster.tsx` | Button, Select, SelectItem, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText | Add |
| ✅ | `components/StudentActivities.tsx` | Button, Select, SelectItem, TextInput, Tag | Add |
| ✅ | `components/StudentDisciplinary.tsx` | Button, Select, SelectItem, TextArea, Tag | Add |
| ✅ | `components/StudentLeadershipAwards.tsx` | Button, TextInput | Add |
| ✅ | `components/StudentProgressReports.tsx` | Button, Select, SelectItem, TextArea | Add |
| ✅ | `components/StudentRecordsRollup.tsx` | Select, SelectItem, SkeletonText | - |
| ⬜ | `pages/admin/Prefects.tsx` | Button, Select, SelectItem, InlineNotification | Trophy, Add |
| ⬜ | `pages/admin/Societies.tsx` | Button, Select, SelectItem, InlineNotification, SkeletonText, Tag | Idea, Add, Edit, UserMultiple |
| ⬜ | `pages/teacher/MySociety.tsx` | SkeletonText | Idea |

### `features/positions/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/PositionModals.tsx` | Checkbox, MultiSelect | - |
| ✅ | `pages/admin/Positions.tsx` | Button, Tag | UserRole, Add |

### `features/reports/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/dashboard/AttendanceByClassSection.tsx` | - | - |
| ✅ | `components/dashboard/DashboardSnapshotSection.tsx` | - | - |
| ✅ | `components/dashboard/RecentActivitySection.tsx` | - | - |
| ✅ | `components/dashboard/SetupChecklistCard.tsx` | - | - |
| ✅ | `components/dashboard/StatCard.tsx` | - | - |
| ⬜ | `pages/admin/Analytics.tsx` | SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel, Button, Tag | - |
| ✅ | `pages/admin/Dashboard.tsx` | - | UserMultiple, Education, Building, Book |
| ⬜ | `pages/admin/Reports.tsx` | Button, Select, SelectItem, Checkbox, InlineNotification, Tile | DocumentPdf |

### `features/school/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AcademicSettingsCard.tsx` | NumberInput, Select, SelectItem | - |
| ⬜ | `components/GeneralSettingsTab.tsx` | Button, InlineNotification | Save, Edit |
| ⬜ | `components/HouseFormModal.tsx` | TextInput | - |
| ⬜ | `components/HousesPanel.tsx` | Button, Tag, InlineNotification, SkeletonText | Add |
| ⬜ | `components/LogoUpload.tsx` | Button | Upload, TrashCan, Building |
| ⬜ | `components/SchoolInfoCard.tsx` | TextInput, Select, SelectItem | Building |
| ⬜ | `components/SystemInfoCards.tsx` | - | Settings |
| ⬜ | `components/academic-years/CreateYearModal.tsx` | TextInput, Checkbox | - |
| ⬜ | `components/academic-years/TermForm.tsx` | Button, TextInput | Checkmark, Add |
| ⬜ | `components/academic-years/TermsModal.tsx` | Button, Tag, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText | Calendar, Checkmark, Edit |
| ⬜ | `components/academic-years/YearsList.tsx` | Button, Tag | Calendar, Checkmark |
| ⬜ | `components/setup/ClassesStep.tsx` | Checkbox, NumberInput, Select, SelectItem, TextInput | Building, Information |
| ⬜ | `components/setup/DoneStep.tsx` | Button, InlineNotification, InlineLoading | CheckmarkFilled, ArrowRight, Layers, Book, UserMultiple, EventSchedule, ChevronRight |
| ⬜ | `components/setup/GradesStep.tsx` | Checkbox | Education |
| ⬜ | `components/setup/HousesStep.tsx` | Button, TextInput | Home, Add |
| ⬜ | `components/setup/MediumsStep.tsx` | Button, Checkbox, TextInput | Language, Add |
| ⬜ | `components/setup/RoomsStep.tsx` | Button, NumberInput, TextInput | Add, Building |
| ⬜ | `components/setup/SchoolStep.tsx` | TextInput, NumberInput, Select, SelectItem | Enterprise |
| ⬜ | `pages/FirstRunSetup.tsx` | Button, TextInput, PasswordInput, InlineLoading | CheckmarkFilled, Information, UserMultiple |
| ⬜ | `pages/admin/AcademicYears.tsx` | Button | Add |
| ⬜ | `pages/admin/SchoolSetup.tsx` | Button, InlineNotification | - |
| ⬜ | `pages/admin/Settings.tsx` | Tabs, TabList, Tab, TabPanels, TabPanel | - |

### `features/staff/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/StaffDetail.tsx` | Tag, Select, SelectItem, Button | Edit, TrashCan |
| ✅ | `components/StaffFormModal.tsx` | Button, TextInput, Select, SelectItem, RadioButtonGroup, RadioButton, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ✅ | `pages/admin/NonAcademicStaff.tsx` | Button, Select, SelectItem, Pagination, Tile, Tag, TableToolbarSearch, ClickableTile | Add, Close |

### `features/students/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ✅ | `components/AddGuardianModal.tsx` | Button, TextInput, Select, SelectItem, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter | Search |
| ✅ | `components/GuardianRow.tsx` | Button, Tag | UserFollow, Locked |
| ✅ | `components/ProvisionLoginModal.tsx` | TextInput, InlineNotification | - |
| ✅ | `components/StudentGuardians.tsx` | Button | Add |
| ✅ | `components/StudentProfileTab.tsx` | TextInput, TextArea, Select, SelectItem, RadioButtonGroup, RadioButton, Tag | - |
| ✅ | `components/SubjectEnrollment.tsx` | Button, Select, SelectItem, Checkbox, Tag, InlineNotification, InlineLoading | Save |
| ✅ | `pages/admin/AddStudent.tsx` | - | - |
| ✅ | `pages/admin/StudentDetail.tsx` | Button, Tabs, TabList, Tab, TabPanels, TabPanel | ArrowLeft, TrashCan, Edit, Save |
| ✅ | `pages/admin/Students.tsx` | Button, IconButton, Select, SelectItem, Tag | Add, Edit, TrashCan, Upload |
| ✅ | `pages/self/StudentDashboard.tsx` | Tag | EventSchedule, Report, Table, Notification |

### `features/system/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/AuditLog.tsx` | Pagination, SkeletonText, Tag, Select, SelectItem | - |
| ⬜ | `components/Automation.tsx` | Toggle, Tag, Button, SkeletonText | Play |
| ✅ | `components/GlobalSearch.tsx` | - | - |
| ⬜ | `components/OrphanedAccounts.tsx` | Button, SkeletonText | TrashCan |

### `features/teachers/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/TeacherProfileSections.tsx` | TextInput, Select, SelectItem, RadioButtonGroup, RadioButton | - |
| ⬜ | `components/TeacherSubjectsSection.tsx` | Button, Select, SelectItem, Tag | Book |
| ⬜ | `components/dashboard/LeadershipOverviewPanel.tsx` | - | Location |
| ⬜ | `components/dashboard/LeadershipPanel.tsx` | - | UserRole |
| ⬜ | `components/dashboard/QuickActions.tsx` | - | EventSchedule, UserMultiple, Notification, ArrowRight |
| ⬜ | `components/dashboard/RoleBadge.tsx` | Tag | - |
| ⬜ | `components/dashboard/TimetableReviewPanel.tsx` | SkeletonText, Button | Renew |
| ⬜ | `components/dashboard/TodaysClasses.tsx` | Button, Tag | ArrowRight |
| ⬜ | `components/dashboard/WelcomeBanner.tsx` | - | CheckmarkFilled, Time |
| ⬜ | `pages/admin/AddTeacher.tsx` | Button, TextInput, Select, SelectItem, RadioButtonGroup, RadioButton, InlineNotification | ArrowLeft, Save |
| ⬜ | `pages/admin/TeacherDetail.tsx` | Button | ArrowLeft, TrashCan, Edit, Save |
| ⬜ | `pages/admin/TeacherSubjects.tsx` | Tag, SkeletonText, Pagination, Button, IconButton, InlineNotification | Add, Close |
| ⬜ | `pages/admin/Teachers.tsx` | Button, IconButton, Select, SelectItem, Tag | Add, Edit, TrashCan |
| ⬜ | `pages/self/TeacherClasses.tsx` | Button | Search, EventSchedule |
| ⬜ | `pages/self/TeacherDashboard.tsx` | - | Building, UserMultiple, CheckmarkOutline, Time |
| ⬜ | `pages/self/TeacherProfile.tsx` | Tag | Book |

### `features/timetable/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/BackfillHomeroomsButton.tsx` | Button | Home |
| ⬜ | `components/ClassroomFormModal.tsx` | TextInput, NumberInput, Select, SelectItem | - |
| ⬜ | `components/PeriodsEditor.tsx` | Button, TextInput, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText | - |
| ⬜ | `components/SectionFormModal.tsx` | Button, TextInput, MultiSelect, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ⬜ | `components/SectionRow.tsx` | Button, Tag | Time |
| ⬜ | `components/TimetableCellModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ⬜ | `components/TimetableReviewRow.tsx` | Button, Tag, TextArea, ComposedModal, ModalHeader, ModalBody, ModalFooter | - |
| ⬜ | `components/TimetableValidationModal.tsx` | Button, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText | Checkmark, WarningAlt |
| ⬜ | `lib/roomKind.ts` | - | Book, Building, Chat, Chemistry, HospitalBed, Laptop, Microscope, PaintBrush, Restaurant, Theater, Tools, Translate, UserMultiple |
| ⬜ | `pages/admin/Classrooms.tsx` | Button, IconButton, Tag | Add, Edit, TrashCan |
| ⬜ | `pages/admin/GenerateTimetable.tsx` | Button, Select, SelectItem, Tag, SkeletonText | Rocket |
| ⬜ | `pages/admin/GradeSections.tsx` | Button, SkeletonText | Add |
| ⬜ | `pages/admin/Resources.tsx` | Button, IconButton, Tag | Education, Home, Map, Information, Add, Edit, TrashCan |
| ⬜ | `pages/admin/SubjectRequirements.tsx` | NumberInput, SkeletonText, Dropdown | - |
| ⬜ | `pages/admin/TimetableEditor.tsx` | Button, Tag, SkeletonText | - |
| ⬜ | `pages/admin/TimetableHub.tsx` | Tabs, TabList, Tab, TabPanels, TabPanel | - |
| ⬜ | `pages/admin/TimetableSettings.tsx` | Button, TextInput, NumberInput, InlineNotification, SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel | Save |
| ⬜ | `pages/admin/Timetables.tsx` | Button, Tag, SkeletonText, OverflowMenu, OverflowMenuItem | Add |
| ⬜ | `pages/teacher/TeacherTimetable.tsx` | SkeletonText | - |
| ⬜ | `pages/teacher/TeacherTimetables.tsx` | Tag, SkeletonText | - |
| ⬜ | `pages/teacher/TimetableReview.tsx` | SkeletonText | - |

### `features/workflows/`

| Status | File | Carbon components | Carbon icons |
| --- | --- | --- | --- |
| ⬜ | `components/ChecksList.tsx` | - | CheckmarkFilled, WarningAltFilled, ErrorFilled |
| ⬜ | `components/ConfirmActionModal.tsx` | Button, ComposedModal, ModalBody, ModalFooter, ModalHeader | - |
| ⬜ | `components/CsvInput.tsx` | Button, FileUploaderButton, TextArea | Download |
| ⬜ | `components/ProposalSection.tsx` | Checkbox, Pagination, Select, SelectItem | - |
| ⬜ | `components/ProposalView.tsx` | InlineNotification | - |
| ⬜ | `components/RunHistory.tsx` | Tag | - |
| ⬜ | `components/WorkflowAgents.tsx` | Button, SkeletonText, Tag | ArrowRight |
| ⬜ | `components/WorkflowInputs.tsx` | Checkbox, FilterableMultiSelect, Select, SelectItem, TextInput | - |
| ⬜ | `pages/admin/WorkflowPage.tsx` | Button, Tag | ArrowLeft, Checkmark, Renew, TrashCan, Undo |
| ⬜ | `pages/admin/YearEnd.tsx` | Button, Tag | ArrowRight |

## SCSS cleanup

Files in `frontend/src/shared/styles/`. Do each once the components it styles are migrated.

| Status | File | What to do |
| --- | --- | --- |
| ⬜ | `index.scss` | Remove every `@forward`/`@use "@carbon/react/..."` line (config, spacing, colors, motion, type, themes, theme, reset, grid, layer, layout, zone and 39 component imports). Keep a small reset of our own if needed |
| ⬜ | `_carbon-overrides.scss` | Delete the file and its `@use` once no Carbon component is left |
| 🟡 | `_page.scss` | 2 `cds--` selectors left (society and resource-map tags). Skeleton, infotip and notification ones are gone |
| ⬜ | `_setup.scss` | 6 `cds--` selectors (progress step, text/select/number inputs) |
| 🟡 | `_layout.scss` | 1 `cds--` selector left (society tag). Skeleton and notification ones are gone |
| ⬜ | `_forms.scss` | 4 `cds--` selectors (date picker) |
| ⬜ | `_auth.scss` | 4 `cds--` selectors (input wrappers, OTP button) |
| ✅ | `_table.scss` | No `cds--` selectors left |
| ⬜ | `_print.scss` | 1 `cds--` selector |
| ⬜ | `_base.scss` | 1 `cds--` selector |
| ⬜ | `_tokens.scss` | Added `$os-radius` / `$os-radius-sm`. Confirm every token `antdTheme.ts` reads still exists and dark mode values are set |

## Build and docs cleanup

| Status | Item | What to do |
| --- | --- | --- |
| ⬜ | `frontend/package.json` | Remove `@carbon/react` and `@carbon/icons-react`, run `pnpm install` |
| ⬜ | `frontend/pnpm-workspace.yaml` | Remove the 12 `@carbon/*` entries |
| ⬜ | `frontend/vite.config.ts` | Replace the `carbon-icons` vendor group with `antd` and `ant-icons` groups if bundle size needs it. Fix the comment |
| ⬜ | `frontend/eslint.config.js` | In the `api/` import rule, replace `@carbon/*` with `antd` and `@ant-design/*` |
| ⬜ | `frontend/eslint.config.js` | Add a `no-restricted-imports` rule banning `@carbon/*` so it cannot come back |
| ⬜ | `CLAUDE.md` | Lines 10 and 126: Carbon to Ant Design |
| ⬜ | `docs/ARCHITECTURE.md` | Lines 33, 301, 325: Carbon to Ant Design |
| ⬜ | `docs/FEATURES.md`, `frontend/README.md` | Check for Carbon mentions |
| ⬜ | Bundle check | Compare `pnpm build` output size before and after |
| ⬜ | Screenshots | Add final screenshots to `docs/screenshots/antd-migration/` |

## Audit commands

Run from `frontend/`.

```bash
# Files still importing Carbon (target: 0)
grep -rlE "@carbon/(react|icons-react)" src | wc -l

# List them
grep -rlE "@carbon/(react|icons-react)" src | sort

# Carbon class names left in markup or styles (target: 0)
grep -rn "cds--" src

# Files already on antd
grep -rlE "from \"antd\"|@ant-design" src | sort

pnpm lint && pnpm test && pnpm build
```
