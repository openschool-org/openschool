## Set Up ThunderID

OpenSchool uses ThunderID as its identity provider. This guide walks through starting it, creating the user types and roles OpenSchool needs, and connecting the frontend and backend applications to it.

**Everything in this guide is one-time infrastructure setup.** You do this once per instance, in the ThunderID console. Individual admin/teacher/student/parent *accounts* are never created here by hand afterward — the OpenSchool app provisions those itself (via the backend's Administrator-role service account) as you use the **Setup wizard**, **Teachers**, **Students**, and student **Guardians** pages. See [`SETUP.md`](./SETUP.md) for that day-to-day workflow, in particular its "Registering parents, and accessing each portal" section.

### Start ThunderID

```bash
docker compose -f oci://ghcr.io/thunder-id/thunderid-quick-start:latest -p openschool up -d
```

This sets up the database, runs the setup process, and starts the ThunderID server. It creates three containers: two of them (`thunderid-db-init` and `thunderid-setup`) run once and exit, that's normal, not an error. The third (`thunderid`) keeps running.

**Always pass `-p openschool`** (or some other fixed project name). Without it, Compose derives the project name from your current working directory, so running this same command from different directories silently creates separate, fully isolated stacks — each with its own database, admin password, and applications. It's easy to end up with several of these lying around and lose track of which one your `.env` files actually point at.

**To restart ThunderID later, don't re-run the command above** — use `docker start openschool-thunderid-1` instead. It resumes the existing server against its existing data. Re-running the full `docker compose ... up -d` re-executes the one-shot `thunderid-setup` container against the already-initialized database, and its bootstrap step isn't idempotent: it fails with `user_type "Person" (USRS-1003): User type name conflict`, and since `thunderid` won't start until `thunderid-setup` completes successfully, the server never comes up either. See the troubleshooting table below if this happens.

**Important: the admin password is not `admin`.** It's randomly generated the first time setup runs, and printed once to the setup container's own logs

Look for a block like:

```
Admin credentials:
  Username: admin
  Password: <random string>
```

You can change this later inside the console. It's shown exactly once.

Access the console at `https://localhost:8090/console` using that username and password.

### Create User Types

Go to **User Types** in the left sidebar and create the following. Self-registration should be disabled for all of them.

**Student user type**

| Field             | Value    |
| ----------------- | -------- |
| Name              | student  |
| Organization Unit | Default  |
| Self-Registration | Disabled |

Attributes:

| Property Name | Display Name  | Type   | Required | Unique | Credential |
| ------------- | ------------- | ------ | -------- | ------ | ---------- |
| username      | Username      | String | Yes      | Yes    | No         |
| email         | Email Address | String | Yes      | Yes    | No         |
| given_name    | First Name    | String | Yes      | No     | No         |
| family_name   | Last Name     | String | Yes      | No     | No         |
| phone_number  | Phone Number  | String | No       | No     | No         |
| password      | Password      | String | Yes      | No     | Yes        |

**Teacher user type**

Same as student, plus:

| Property Name   | Display Name    | Type   | Required | Unique | Credential |
| --------------- | --------------- | ------ | -------- | ------ | ---------- |
| employee_number | Employee Number | String | Yes      | Yes    | No         |

**Admin user type**

Same fields as student, no extra attributes. This is what the test admin account below is created as — don't try to reuse the console's built-in `Person` type for it, `Person` accounts can't be added to an application's Allowed User Types and will never pick up app roles.

**Parent user type**

Same fields as student. Needed so guardians have a way to sign in at all — the `parent` role and the backend's `Guardian` profile table exist regardless, but without this user type there's no account type to attach a parent login to.

### Create Roles

Go to **Roles** in the left sidebar and create:

- admin
- teacher
- student
- parent

These are plain business roles used by OpenSchool's own authorization logic — the role name must be exactly `parent`, not `guardian`. The backend's `users.role` column and every role check in the Go code (`routes.go`, `attendance.go`, etc.) compare against the literal strings `admin`, `teacher`, `student`, `parent`; a role named anything else will never match, and a parent's token will never resolve to an app role. These roles are also separate from ThunderID's built-in `Administrator` role, which you'll deal with separately below.

### Create the Frontend Application

Go to **Applications** and create a new application for the React frontend.

- Choose a web/browser application type
- Note down the Application ID
- Set the Application URL to `http://localhost:5173`
- Set the redirect URI to `http://localhost:5173`
- Also set the **post-logout redirect URI** to `http://localhost:5173`. This is a separate whitelist from the sign-in redirect URI above — if it's missing, `/oauth2/logout` rejects the request with `invalid post_logout_redirect_uri` and the ThunderID SDK's `signOut()` fails to send the user back to the app.

**Set Allowed User Types.** In the **Access** section of the application, add `student`, `teacher`, `admin`, and `parent` to Allowed User Types. This step is easy to miss, but without it, no user attributes or roles will be added to tokens for anyone signing into this app, no matter what you configure elsewhere. This is also why you can't test with the built-in console admin, that account is type `Person`, which isn't and can't be added to this list.

Go to **Token Attributes and Response** for this application and add the following attributes to the **Access Token**:

- email
- given_name
- family_name
- username
- phone_number
- roles

Go to **Available Scopes** and activate: `phone`, `roles` (along with the default `openid`, `profile`, `email`).

Go to **Flows** and assign the default authentication flow to the application.

### Allow the Frontend Origin (CORS)

The React app calls ThunderID's `/oauth2/token`, `/flow/meta`, and related
endpoints **directly from the browser** (that's how PKCE token exchange works
for a public SPA client) — this is separate from the backend's own
`CORS_ORIGINS` setting, which only covers requests to the Go API. Without
this step ThunderID has no allowed origins by default, so every one of those
browser requests is blocked by CORS and sign-in silently fails.

Update the `cors` server-config section (there's no console page for this yet
— use the API with an admin token):

```bash
curl -k -X PUT "https://localhost:8090/server-config/cors" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allowedOrigins": ["http://localhost:5173"]}'
```

This takes effect immediately — no restart needed. Add any other origin the
frontend is served from (a deployed domain, a different dev port, etc.) to
the same array.

### Create the Backend Service Application

Go to **Applications** and create a new Backend Service application.

- Name: OpenSchool Backend
- Grant Type: `client_credentials`
- Token Endpoint Auth Method: `client_secret_post`
- Note down the Client ID and Client Secret

Go to **Available Scopes**, add `system` as a custom scope, and activate it.

### Assign Administrator Role to the Backend Application

Go to **Roles**, open the built-in **Administrator** role, go to the **Assignments** tab, and assign the OpenSchool Backend application to it.

This allows the backend to create and manage users in ThunderID programmatically. Without this step, the backend app can still request an access token successfully, but every management API call (like creating a user) will fail with a `403 Forbidden`.

### Create a Test Admin User

Go to **Users** and create a new user with the **admin** user type you created above (not `Person`):

- Username: any
- Email: any
- Password: any

Then go to **Roles → admin → Assignments** and add this user. This gives them the `admin` role claim your frontend checks for dashboard access.

### Environment Variables

With the applications, roles, and users created above, add their values to both the backend's and frontend's `.env` files. A couple of these are easy to get wrong, so pay attention to the notes below.

**Backend `.env`**

```dotenv
THUNDERID_JWKS_URL=https://localhost:8090/oauth2/jwks
THUNDERID_ISSUER=https://localhost:8090

THUNDERID_BASE_URL=https://localhost:8090
THUNDERID_OU_ID=01900000-0000-7000-8000-000000000001

THUNDERID_CLIENT_ID=<backend Client ID from above>
THUNDERID_CLIENT_SECRET=<backend Client Secret from above>
THUNDERID_TOKEN_URL=https://localhost:8090/oauth2/token

# role ids from thunderid
THUNDERID_ROLE_STUDENT=<student role ID from Roles>
THUNDERID_ROLE_TEACHER=<teacher role ID from Roles>
THUNDERID_ROLE_PARENT=<parent role ID from Roles>
THUNDERID_ROLE_ADMIN=<admin role ID from Roles>

THUNDERID_RESOURCE=https://localhost:8090/mcp
```

- Everything is `https://`, not `http://`. ThunderID doesn't serve plain HTTP by default.
- `THUNDERID_ISSUER` is the bare server URL only, no path. Don't confuse it with `THUNDERID_TOKEN_URL`, they're different values.
- `THUNDERID_RESOURCE` is required when requesting a backend token (`client_credentials`), leaving it out gives an `invalid_target` error.
- The role IDs are found by opening each role in the console, they're the role's own ID, not its name.
- If your backend's JWKS client verifies TLS certificates strictly, relax that only for local development against ThunderID's self-signed certificate, and only when running locally, never in production.
- **`Token Endpoint Auth Method` must actually be `client_secret_post` on the saved application, not just selected during creation.** The backend's client sends `client_id`/`client_secret` as form body fields (not an HTTP Basic Auth header). If the app ends up on `client_secret_basic` (the type-`m2m` default), every `client_credentials` request fails with `unauthorized_client: Client is not allowed to use the specified authentication method`, even though the client ID/secret are correct. Double-check this value in the console after saving.

**Frontend `.env`**

```dotenv
VITE_THUNDERID_CLIENT_ID=<frontend Application ID from above>
VITE_THUNDERID_BASE_URL=https://localhost:8090
VITE_THUNDERID_SCOPES="openid profile email roles"
VITE_THUNDERID_AFTER_SIGN_IN_URL=http://localhost:5173
VITE_THUNDERID_AFTER_SIGN_OUT_URL=http://localhost:5173
```

- `VITE_THUNDERID_AFTER_SIGN_IN_URL` and `VITE_THUNDERID_AFTER_SIGN_OUT_URL` must exactly match the redirect URI you set on the application's config above, including scheme and trailing slash (or lack of one).
- `VITE_THUNDERID_SCOPES` should match whatever you activated under Available Scopes for this application.

### Troubleshooting quick reference

| Symptom                                                       | Likely cause                                                                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Server won't start, `ouId or ouHandle is required`            | A resource is missing its organization unit reference                                                                                                              |
| `403 Forbidden` calling any management API as the backend app | Backend app hasn't been assigned the Administrator role                                                                                                            |
| Token request returns `invalid_target`                        | Missing `resource` parameter on the client_credentials request                                                                                                     |
| Login succeeds but `roles` claim is missing from the token    | Application's Allowed User Types isn't set, or the logged-in user has no role assignment                                                                           |
| Backend gets `key not found` / endless JWKS retries           | JWKS URL is `http://` instead of `https://`                                                                                                                        |
| Backend gets `certificate signed by unknown authority`        | TLS verification needs to be relaxed for local dev against the self-signed cert                                                                                    |
| Backend gets `token has invalid issuer`                       | Issuer value includes a path; it should be just the bare server URL                                                                                                |
| All users/roles/data disappeared after a restart              | `docker compose down -v` was used, or the whole stack (including the one-time database init container) was recreated instead of just restarting the running server |
| `thunderid-setup` fails with `User type name conflict` after a restart, and/or `thunderid` never comes back up | The full `docker compose ... up -d` command was re-run against an already-initialized volume instead of `docker start openschool-thunderid-1` — see "Start ThunderID" above. `docker start openschool-thunderid-1` directly still works since the underlying data is untouched. |
| Console itself won't load — `/oauth2/authorize` redirects to `.../gate/error?errorCode=invalid_request&errorMessage=Invalid+client_id`, even for the built-in `CONSOLE` client | The aborted `thunderid-setup` re-run above can partially apply before it hits the conflict and dies, deleting default resources (including the built-in `CONSOLE` application) without recreating them. There's no clean recovery from this — remove the containers and volumes for that project and run setup fresh. |
| Multiple ThunderID projects running or half-remembered, `.env` credentials rejected with `invalid_client` against the instance that's currently up | Compose was run without `-p openschool` from more than one working directory, creating separate isolated stacks. `docker compose ls`, then `docker ps -a \| grep thunder` and `docker volume ls \| grep thunder` to see what actually exists, and consolidate down to one. |
| Sign-in silently fails; console shows CORS errors on `/oauth2/token` or `/flow/meta`, ends up back on `/signin` | Frontend origin isn't in the `cors` server-config's `allowedOrigins` — see "Allow the Frontend Origin (CORS)" above |
| Signing out doesn't return the user to the app (stuck on ThunderID, or an error page) | The application's post-logout redirect URI isn't set — see "Create the Frontend Application" above. `/oauth2/logout` will reject the request with `invalid post_logout_redirect_uri`. |
| Backend gets `schema_validation_failed` (`USR-1019`) creating a student/teacher/admin | The user type's field name in the console doesn't match what the backend sends — the phone field must be named exactly `phone_number` (not `phone`) on every user type. Open **User Types → (type) → schema** and check for typos if this happens after manually editing one. |
