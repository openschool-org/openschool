# Frontend architecture

Part of the [architecture overview](../ARCHITECTURE.md).

Vite + TypeScript + React 19, using
[Ant Design](https://ant.design/) for components and
[TanStack Query](https://tanstack.com/query) for server-state management.

- **`src/app/main.tsx`** - composition root: `ThunderIDProvider` →
  `QueryClientProvider` → antd `ConfigProvider` and `App` → `I18nProvider` → `RouterProvider` → `App`.
- **`src/app/App.tsx`** - mounts `ApiAuthBridge` (hands the ThunderID token
  getter and a 401 handler to the axios client) and resolves the signed-in user's role from their JWT
  (`useRole`) and renders one of four route trees (Admin/Teacher/Student/
  Parent), each behind its own layout component and `ProtectedRoute`.
  There is no separate URL namespace per role for the admin portal;
  teacher/student/parent portals use short URL prefixes (`/t/...`,
  `/p/...`) mainly to disambiguate routes that exist in more than one
  portal.
- **`src/features/<name>/`** - one folder per domain, mirroring the
  backend's module list. Each holds `api/` (axios wrappers, one file per
  entity, with the request/response types beside the calls), `queries/`
  (TanStack hooks), `keys.ts` (the feature's query-key factory under one
  root segment), `components/` and `pages/` (route targets split by portal).
  Mutations invalidate through `shared/api/useInvalidate`, usually the
  feature root key. Data another feature batches (class rosters, sessions)
  is exported as `queryOptions` for `useQueries`.
- **`src/app/routes/`** - one lazy route module per portal; `App.tsx`
  picks the module for the JWT role.
- **Layer rules** (enforced in `eslint.config.js`): `api/` imports no
  React, antd or TanStack; only `api/` and `shared/api` use axios; a
  feature may import another feature's `queries`, `keys` and `components`
  and its `api` types, never its `pages` or `api` values; `shared/` never
  imports features.
- **`src/shared/`** - code with no feature owner. `api/` holds the axios
  client (module-level interceptors; requests wait for the auth bridge so
  none go out without a token), the `keys.ts` query-key factory and error
  helpers. `auth/` holds `useRole` (base64url-safe JWT parsing),
  `ProtectedRoute`, idle logout and the password policy. `ui/` holds the
  shared building blocks (`DataGrid`, `FilterBar`, `ActiveFilterTags`,
  `ListState`, `ConfirmDeleteModal`, `FormModal`, ...) that give the admin
  pages a consistent list → modal-form → confirm-delete shape. `styles/`
  holds the SCSS partials; `_tokens.scss` is the only place colours live.
- **`src/layouts/`** - `PortalShell` (header, sidebar, `<Outlet>` inside a
  `RouteErrorBoundary`) plus one nav config per role under `layouts/nav/`.
- **Scale rules** - one poll per session (unread notification count, every
  120 s, tab visible only); large lists memoise filtering and debounce
  search; vendor code is split into its own cache-stable chunks.

**Convention:** almost every admin CRUD page follows the same template -
list with search/filter, a `FormModal` for create/edit, a shared
`ConfirmDeleteModal` for delete, and the same three loading/empty/error
states. Deviating from this template without a reason is a signal
something's off, not a style choice.
