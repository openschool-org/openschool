# UI/UX issues

Open items left over from the Carbon to Ant Design migration, which finished on 16 Nov 2026 (no Carbon code or styles remain; ESLint blocks `@carbon/*`).

Severity: **High** blocks or misleads users, **Med** slows them down or looks broken, **Low** polish. Delete a row when it is fixed, and delete this file when it is empty.

### Migration-wide

| Status | ID | Sev | Where | Issue | Fix |
| --- | --- | --- | --- | --- | --- |
| ⬜ | UX-02 | High | `antdTheme.ts` | `controlOutline: "transparent"` and `controlOutlineWidth: 0` remove the focus ring on inputs and selects. Focus only shows as a border colour change, which is hard to see for keyboard users (WCAG 2.4.7) | Restore a visible ring, e.g. `controlOutlineWidth: 2` with an accent tint from `_tokens.scss` |
| ⬜ | UX-03 | Med | `antdTheme.ts` | `boxShadowSecondary: "none"` removes the only edge on dropdowns, popovers, select menus and the search panel. They blend into white cards behind them | Keep a soft shadow, or add a `--os-border-subtle` border to `.ant-dropdown`, `.ant-popover`, `.ant-select-dropdown` |
| ⬜ | UX-04 | Med | `main.tsx` | No antd `<App>` wrapper. `Modal.confirm`, `message` and `notification` called later will not get the theme | Wrap the router in antd `App` and use `App.useApp()` |
| ⬜ | UX-05 | Med | `main.tsx`, `i18n` | antd `locale` is never set. Student and parent portals switch to Sinhala or Tamil, but antd built-in text (pagination, date picker, empty states, "OK"/"Cancel") stays English | Pass a locale to `ConfigProvider` from `I18nProvider`. antd has no `si`/`ta` locale, so add small custom locale objects |
| ⬜ | UX-06 | Low | `_tokens.scss` | There is no dark mode. Fine for now, but `antdTheme.ts` reads tokens once at start, so adding one later needs a rebuild of the theme on change | Note only. If dark mode is added, rebuild the theme when the scheme changes |

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
