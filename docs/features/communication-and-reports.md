# Notifications, reports and automation

Part of the [feature guide](../FEATURES.md).

## Notifications

- **In-app only** - no email/SMS/WhatsApp channel.
- **Composer** - shared by admins (`/notifications`) and teachers
  (`/t/notifications`); what a sender is allowed to target is enforced
  server-side by role/position, not just hidden in the UI. Title, message,
  a category (General/Academic/Examination/Attendance/Timetable/Events/
  Sports/Meetings/Fee Reminder/Emergency/Discipline/Holidays), and a
  priority (Normal/Important/Urgent).
- **Recipient rules** (combinable) - Everyone (admin only), By Grade, By
  Class, By Grade Section, By Subject (teachers of it, or students taking
  it), or a specific Student/Guardian/Teacher.
- **Send now or save as draft** - drafts are editable and can be sent later
  by hand; there is no scheduled-send yet.
- **Notification Center** - every signed-in user (any role) has one, with
  Unread/Read/Archived tabs, text search, and a category filter.

## Reports & analytics

- **PDF report export** (admin-only) - two fixed templates, Attendance (by
  class + date range) and Marks (by class + term + subject), each with an
  optional column subset, rendered server-side and streamed as a PDF
  download.
- **Analytics dashboard** - one aggregate endpoint composing student counts
  (by grade/class/gender/house), a 14-day attendance trend, staff counts and
  this-month attendance, subject/examination/grade-wise performance,
  student/staff growth by year, notifications-sent count, and timetable
  completion percentage - rendered as stat tiles and lightweight bar/
  sparkline charts (no charting library dependency).

## Audit log

Every house reassignment, attendance-lock override, and other sensitive
change is recorded with actor, before/after state, and an optional reason,
readable admin-only at `/settings` → Audit Log.

## Automation

Seven background agents (`internal/modules/automation`) run scheduled checks that keep
the school's data healthy - no user-facing feature depends on them, so any
can be disabled from **Settings > Automation** (admin-only) except System Health.
Every check is plain SQL and arithmetic (no AI/LLM, no external service),
runs on its own cron schedule via an in-process scheduler, and notifies
admins with a severity (`normal`/`important`/`urgent`) when something
needs attention. Each agent runs its own checks concurrently, so a
five-check agent takes about as long as its slowest check, not the sum.

| Agent | Schedule | What it checks |
| --- | --- | --- |
| **Structural Integrity** | daily 03:00 | Current-academic-year invariant, student gender vs. school type, empty grades/streams, unclassed students |
| **People Compliance** | daily 05:00 | Inactive teachers still assigned, students with no guardian, teacher/student accounts stuck onboarding (severity rises with age) |
| **Academic Delivery** | weekdays 12:00 | Missing or inconsistent attendance sessions, stale incomplete sessions, term-marks deadline and pace-behind-schedule |
| **Security Audit** | hourly | Statistical audit-log anomaly detection (per-actor baseline, not one fixed number), off-hours activity, sweep of expired password-reset and activation links |
| **System Health** | daily 02:00 | Nightly `pg_dump`, migration-drift check, backup retention pruning, backup size-anomaly detection - the one agent that **cannot be disabled** |
| **Data Retention** | daily 03:00 | Anonymises students' personal data a set number of years after they leave, keeping marks and attendance attributable |
| **Identity Erasure Retry** | hourly | Retries identity cleanup (local user scrub, identity-provider account deletion) that failed after a profile was anonymised |

The Automation tab also lists the **year-end workflows** and the **setup
tools** (§ Year-end workflows). These run only when an admin proposes and
applies them, so they have no schedule or switch.

Findings go out as in-app notifications to every admin. Where a finding is
relevant to a specific admin page (e.g. no-guardian students on the
Students page), a small dismissible banner shows it right there - it
clears once the notification is read, independent of the agent's own
enabled/disabled state.
