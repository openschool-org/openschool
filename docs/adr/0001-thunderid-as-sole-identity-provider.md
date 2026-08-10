# 0001. ThunderID as the sole identity provider

**Status:** Accepted

## Context

OpenSchool needs authentication, JWT issuance, and per-user role
assignment (`admin`/`teacher`/`student`/`parent`). The project initially
integrated with Asgardeo, then migrated to ThunderID. Rather than build
OpenSchool's own credential store, both integrations were built behind a
provider-neutral seam (`internal/identity.Provider`:
`CreateUser`/`UpdateUser`/`DeleteUser`/`AssignRole`), so the concrete
client could be swapped without touching the services that call it.

## Decision

ThunderID is the system of record for login credentials and the four base
roles. The backend never stores a primary login password. Token
validation happens against ThunderID's JWKS endpoint
(`internal/middleware/auth.go`); provisioning (account create/update/
delete, role assignment) happens through `internal/thunderid.Client`,
which implements `identity.Provider`.

## Consequences

- **A running ThunderID instance is a hard dependency.** There is no
  degraded/offline authentication mode — if ThunderID is unreachable,
  sign-in and account provisioning both fail.
- **Swapping identity providers again is possible but not free.** A new
  provider needs its own `identity.Provider` implementation plus a
  migration plan for existing local `users` rows (which store no
  provider-specific data beyond the shared UUID and role).
- **Two prior production incidents** were caused by hand-typed ThunderID
  attribute/role-name strings (in env vars and request payloads) that
  have to match out-of-repo ThunderID console configuration, failing
  silently at runtime with a generic error rather than at build/test
  time. This is the direct reason [ADR 0002](./0002-in-app-position-layer.md)
  chose *not* to add new IDP roles for the position hierarchy — every new
  IDP-side string is a repeat of this exact risk. See `audit.md`'s
  findings on `AssignRole` failure handling for where this fragility has
  caused real bugs.
