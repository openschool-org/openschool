## Set Up ThunderID

OpenSchool uses ThunderID as its identity provider. This guide walks through starting it, creating the user types and roles OpenSchool needs, and connecting the frontend and backend applications to it.

### Start ThunderID

```bash
docker compose -f oci://ghcr.io/thunder-id/thunderid-quick-start:latest up -d
```

This sets up the database, runs the setup process, and starts the ThunderID server. It creates three containers: two of them (`thunderid-db-init` and `thunderid-setup`) run once and exit, that's normal, not an error. The third (`thunderid`) keeps running.

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

**Set Allowed User Types.** In the **Access** section of the application, add `student`, `teacher`, and `admin` to Allowed User Types. This step is easy to miss, but without it, no user attributes or roles will be added to tokens for anyone signing into this app, no matter what you configure elsewhere. This is also why you can't test with the built-in console admin, that account is type `Person`, which isn't and can't be added to this list.

Go to **Token Attributes and Response** for this application and add the following attributes to the **Access Token**:

- email
- given_name
- family_name
- username
- phone_number
- roles

Go to **Available Scopes** and activate: `phone`, `roles` (along with the default `openid`, `profile`, `email`).

Go to **Flows** and assign the default authentication flow to the application.

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
IDP_PROVIDER=thunderid

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
