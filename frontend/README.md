## OpenSchool Frontend

The OpenSchool frontend is a React single-page application for the school
management system. It communicates with the Go backend API and uses ThunderID
for authentication.

The frontend uses:

- React and TypeScript
- Vite for development and production builds
- Ant Design (`antd`, `@ant-design/icons`) for UI components
- TanStack Query for server state and data fetching
- React Router for navigation
- Axios for API requests
- Sass for application styles

### Frontend structure

```text
src/app/         Entry point, providers, query client, one route module per portal
src/shared/      Code with no feature owner: api client, useInvalidate, auth,
                 shared UI (DataGrid, FilterBar, modals), hooks, lib, styles
src/layouts/     PortalShell plus one nav config per role
src/features/    One folder per domain: api/, queries/, keys.ts, components/, pages/
```

### Local setup

Requirements: Node.js 22 and pnpm 11.

```bash
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

The development server starts at `http://localhost:5173`.

Checks: `pnpm lint`, `pnpm test`, `pnpm build`. Imports use the `@/` alias.
The backend should be running at the URL configured by `VITE_API_URL`.

ThunderID settings are also required for sign-in. Update the `VITE_THUNDERID_*`
values in `.env` with the values for your local ThunderID instance.

Do not commit `.env` files or client secrets.

### Environment variables

The main variables are:

- `VITE_API_URL` - backend API base URL, normally `http://localhost:8080/api/v1`
- `VITE_THUNDERID_CLIENT_ID` - ThunderID SPA client ID
- `VITE_THUNDERID_BASE_URL` - ThunderID server URL
- `VITE_THUNDERID_SCOPES` - requested identity scopes
- `VITE_THUNDERID_AFTER_SIGN_IN_URL` - redirect after sign-in
- `VITE_THUNDERID_AFTER_SIGN_OUT_URL` - redirect after sign-out

See [`.env.example`](.env.example) for the complete list.

### Build and test

Run these commands from `frontend/`:

```bash
pnpm lint
pnpm build
pnpm preview
```

`pnpm build` runs the TypeScript build and creates the Vite production bundle.
`pnpm preview` serves that bundle locally for a production-style check.

### Development guidelines

When changing frontend behavior:

1. Keep API calls in the service and query layers.
2. Use the backend module contract when adding or changing API requests.
3. Keep reusable UI in `src/components/` instead of duplicating it in pages.
4. Use antd components, the shared `shared/ui` wrappers and existing project styles for consistent UI.
5. Keep role-specific behavior inside the appropriate route or layout.
6. Handle loading, empty, error, and success states for data-driven pages.
7. Run `pnpm lint` and `pnpm build` before opening a pull request.

For backend API and architecture details, see
[`../backend/README.md`](../backend/README.md),
[`../docs/architecture/frontend.md`](../docs/architecture/frontend.md) and
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).
