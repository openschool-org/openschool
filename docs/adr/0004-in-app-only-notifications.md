# 0004. In-app-only notifications (no email/SMS channel)

**Status:** Accepted

## Context

OpenSchool needs to notify students, guardians, and staff about
attendance, timetable changes, and administrative announcements. Adding
a real delivery channel (email/SMS/WhatsApp) requires an external
provider, credentials, deliverability handling, and a retry/failure
story — a meaningfully larger scope than the rest of the notification
feature.

## Decision

Notifications are delivered entirely in-app: every notification is
composed once (`notifications` table) and fanned out to resolved
recipients (`notification_recipients`, one row per recipient, carrying
that recipient's own read state). Recipients see them via the header bell
icon and a per-user Notification Center. There is no email/SMS/push
channel.

## Consequences

- **A recipient who doesn't check the app misses the notification
  entirely.** There is no fallback delivery channel and no read receipt
  guarantee beyond what the app itself shows.
- **Recipient lists are resolved at send time and are not retroactive** —
  someone added to a class/grade after a notification was sent does not
  retroactively become a recipient of it. This is documented, expected
  behavior, not a bug.
- **A failed recipient-lookup during fan-out is currently silent** (see
  `audit.md`'s notes on `notification.go`/`timetable.go`'s `_, _ := ...`
  recipient-resolution calls) — delivery is deliberately best-effort, but
  failures during that best-effort resolution aren't logged anywhere
  today, making a "why didn't I get notified" report hard to investigate.
- **Revisiting this decision** (adding email/SMS) is a substantial-enough
  scope change that it should get its own ADR rather than being folded
  into a notification-module bug fix.
