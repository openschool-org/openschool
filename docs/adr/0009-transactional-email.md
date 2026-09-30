# 0009. Branded transactional email through Resend or SMTP

**Status:** Accepted

## Context

Password reset and self-activation ([ADR 0008](./0008-self-service-account-activation.md))
only work if email arrives. The old mailer sent plain text over SMTP, with
no branding, no display name and no way to test safely without a domain.

## Decision

- **Scope:** account emails only (reset, password changed, activation link,
  email in use, account activated). Notifications stay in-app, so
  [ADR 0004](./0004-in-app-only-notifications.md) still holds.
- **Providers:** Resend's HTTP API or any SMTP server (Resend also offers
  SMTP), chosen in `.env`. No provider code outside `internal/mailer`.
- **Templates:** one table-based layout with inline styles, a plain-text
  copy, the OpenSchool logo attached inline (so it shows without loading
  anything from the web) and the school's name and contacts from Settings.
- **Testing without a domain:** `MAIL_REDIRECT_TO` sends everything to one
  inbox with a banner naming the real recipient. Production refuses it.
- **Security notices** ("password changed", "account activated") are best
  effort: a mail failure is logged and never undoes the account change.

## Consequences

- Real recipients need a verified sending domain in Resend.
- Sends are synchronous; bulk invites will need the planned send queue.
- Times in emails use the server's time zone.
