# 0005. Hand-rolled password lifecycle (no IDP primitive)

**Status:** Accepted, known weakness — revisit before relying on this in a
security-sensitive deployment

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
  secret on file) before issuing a token.

## Consequences

- **This is the one place OpenSchool stores anything resembling a
  credential itself** (a hashed reset token), a deliberate, narrow
  exception to ADR 0001's "no local password storage" — scoped tightly
  (single-use, 15-minute TTL, hash-only) specifically because it's an
  exception.
- **Known weakness, tracked as Critical in `audit.md` (finding C-1):**
  `ForgotPassword` currently returns the reset token directly in the API
  response rather than delivering it through a channel only the account
  owner controls (e.g. email). Combined with the "secret" being a
  semi-public identifier (NIC numbers and index numbers appear on
  physical documents and are often known to family or classmates), this
  meaningfully weakens the verification step's value. **This should be
  treated as a decision to revisit, not a settled design** — see
  `audit.md` for the full failure scenario and suggested fix (deliver the
  token via the account's on-file email instead of the response body).
- **Administrators cannot use self-service reset** — by design, since
  they have no NIC/index-number-equivalent secret on file. An admin who
  forgets their password needs direct database/operator intervention.
