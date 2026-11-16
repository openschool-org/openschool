# External interfaces

Part of the [architecture overview](../ARCHITECTURE.md).

## ThunderID (identity provider)

Two integration points, both configured via `THUNDERID_*` environment
variables (see [`THUNDERID.md`](../THUNDERID.md)):

1. **Token validation** - every authenticated request's JWT is validated
   (RS256, issuer-checked) against a JWKS key set fetched from ThunderID
   and cached in-process (`MicahParks/keyfunc`, `internal/middleware/auth.go`).
2. **Provisioning API** - account create/update/delete and role
   assignment, via `internal/thunderid.Client`, behind the
   `internal/idp.Provider` interface.

OpenSchool never stores a primary login password; see
[`adr/0001-thunderid-as-sole-identity-provider.md`](../adr/0001-thunderid-as-sole-identity-provider.md).

```mermaid
sequenceDiagram
    actor User
    participant React as React Frontend
    participant T as ThunderID
    participant API as Go Gin Backend
    participant DB as PostgreSQL

    User->>React: Click Login
    React->>T: Start OAuth / OIDC login (browser redirect)
    T-->>User: Login page
    User->>T: Enter credentials
    T-->>React: Authentication result / tokens

    React->>API: HTTPS request + Bearer JWT
    API->>API: Validate JWT signature against<br/>cached JWKS key set
    Note over API,T: Keys are fetched from ThunderID once and cached;<br/>refreshed automatically every hour (default), or immediately<br/>if a request presents an unrecognized key id (rate-limited<br/>to once per 30 s) - most requests validate locally and<br/>do NOT round-trip to ThunderID.
    API->>API: Check roles and permissions<br/>(RequireRole / RequireStudentAccess)
    API->>DB: Query application data
    DB-->>API: Return data
    API-->>React: JSON response
    React-->>User: Display result
```

## REST API

JSON over HTTP under `/api/v1`. Authenticated via `Authorization: Bearer
<JWT>` on every route except `/healthz`, `/school/branding` is open to any signed-in user, the one-time `/setup/admin`, and
the unauthenticated password-reset identify/reset endpoints.

Swagger docs are available at `http://localhost:8080/swagger/index.html#/`
in development builds only (`APP_ENV=development`), not exposed in
production. It's a committed snapshot, not regenerated from source
annotations - handlers now carry one plain comment line instead of
`swaggo` tags.

## Outbound mail

Account emails only (see [ADR 0009](../adr/0009-transactional-email.md)):
password reset, password changed, activation link, email already in use,
and account activated. Notifications stay in-app ([ADR 0004](../adr/0004-in-app-only-notifications.md)).

| Package | Role |
| --- | --- |
| `internal/mailer` | Delivery only. Resend HTTP API, SMTP (TLS 1.2+, 15-second limit), or console. Picked by `MAIL_PROVIDER` or auto-detected from `RESEND_API_KEY` / `SMTP_HOST`. |
| `internal/emails` | One shared HTML and text layout with the OpenSchool logo (sent inline) and the school's name and contacts. One builder per email. Applies test redirect and Reply-To. |
| `internal/modules/mail` | Admin routes for Settings > Email: status, preview, send a test to yourself. Supplies school branding. |

- **Test mode:** `MAIL_REDIRECT_TO` sends every email to one inbox, with a
  banner naming the real recipient. Needed while testing with Resend's
  `onboarding@resend.dev`, which only delivers to the account owner.
- **Startup checks:** a bad mail setting stops the server. Unless
  `APP_ENV=development`, the console provider and `MAIL_REDIRECT_TO` are refused.
- **Safety:** header line breaks are rejected, Resend retries 429 and 5xx
  with one idempotency key, and provider error bodies are logged, never
  returned to API callers.
