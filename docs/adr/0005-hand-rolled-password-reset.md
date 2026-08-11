# 0005. Hand-rolled password lifecycle (no IDP primitive)

**Status:** Accepted

## Context

Per [ADR 0001](./0001-thunderid-as-sole-identity-provider.md), ThunderID
is the identity provider, but its `identity.Provider` interface exposes
only `CreateUser`/`UpdateUser`/`DeleteUser`/`AssignRole` — no
temporary-credential, forced-password-change, or self-service-reset
primitive. OpenSchool needed all three: NIC/index-number default
passwords at account creation, a forced first-login password change, and
a self-service "forgot password" flow.

## Decision

Build all three at the application level instead of extending the IDP
integration:

- **Default passwords** — a teacher's/guardian's initial password is
  their NIC number; a student's is their index number, set via the same
  `CreateUser`/`password` attribute the IDP integration already uses.
- **Forced first-login change** — a local `users.must_change_password`
  flag (not an IDP concept), checked by `GET /me` and enforced by a
  full-page frontend interstitial.
- **Self-service reset** — `password_reset_tokens` stores only a SHA-256
  hash of a short-lived (15 min), single-use token.
  `AuthService.ForgotPassword` identifies the requester by login email
  plus their on-file secret (NIC for teacher/parent, index number for
  student — administrators are excluded, since they have no secondary
  secret on file) before issuing a token and emailing a reset link
  containing it to the address on file (`internal/mailer`) — the token
  itself is never returned in the API response.

## Consequences

- **This is the one place OpenSchool stores anything resembling a
  credential itself** (a hashed reset token), a deliberate, narrow
  exception to ADR 0001's "no local password storage" — scoped tightly
  (single-use, 15-minute TTL, hash-only) specifically because it's an
  exception.
- **Resolved weakness, tracked as Critical in `audit.md` (finding C-1):**
  `ForgotPassword` used to return the reset token directly in the API
  response, which — combined with the "secret" being a semi-public
  identifier (NIC numbers and index numbers appear on physical documents
  and are often known to family or classmates) — meaningfully weakened
  the verification step's value. Fixed by delivering the token via a link
  emailed to the account's on-file address (`internal/mailer`,
  `ResetPassword.tsx`) instead of the response body; the endpoint's JSON
  response is now a generic acknowledgement with no secret in it.
- **Administrators cannot use self-service reset** — by design, since
  they have no NIC/index-number-equivalent secret on file. An admin who
  forgets their password needs direct database/operator intervention.
