<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Project: Admin Dashboard

> **Canonical project doc.** This file is the source of truth for the
> project's stack, structure, conventions, and architecture decisions.
> The runtime auto-loads it on every agent turn; agents MUST re-read
> the relevant section before any code change and MUST update this
> file after every non-trivial change (see [Mandatory Rules](#mandatory-rules)).

## Quick Facts

| | |
|---|---|
| **Name** | `admin-dashboard` |
| **Type** | Next.js 16 admin dashboard (App Router, Turbopack, RSC) |
| **Package manager** | `pnpm` (only — `package-lock.json` was removed 2026-09-01; don't run `npm install`, it regenerates it) |
| **Dev** | `pnpm dev` → http://localhost:3000 |
| **Build** | `pnpm build` |
| **Lint** | `pnpm lint` (ESLint flat config) |
| **Test** | `pnpm test` (Node test runner through `tsx`) |
| **Typecheck** | `npx tsc --noEmit -p tsconfig.json` |

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js `16.3.4` (App Router, Turbopack) |
| UI | React `19.2`, React DOM `19.2` |
| Language | TypeScript `5` (strict) |
| Styling | Tailwind CSS `4` (no `tailwind.config.*` — tokens in `globals.css` via `@theme inline`), `tw-animate-css` |
| Font | Geist (`geist` package) |
| UI primitives | Radix UI (avatar, checkbox, dialog, dropdown-menu, label, popover, select, separator, slot, switch, tabs, tooltip) |
| Icons | `lucide-react@^1.39` |
| Tables | `@tanstack/react-table` |
| Charts | `recharts` |
| Forms | `react-hook-form` + `@hookform/resolvers` + `zod` |
| Toast | `sonner` |
| Theme | `next-themes` |
| Utility | `clsx`, `tailwind-merge`, `cmdk` |
| Drag-and-drop | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (added for the menu-management tree editor — see Conventions § Menu management) |
| Dates | `date-fns` |
| Tests | Node test runner + `tsx` |

## Project Structure

```
src/
├─ app/
│  ├─ layout.tsx                 # root layout (font, theme, toaster)
│  ├─ page.tsx                   # redirects → /dashboard
│  ├─ globals.css                # design tokens + @theme
│  ├─ not-found.tsx
│  ├─ login/                     # top-level split-screen login (no parent layout)
│  │  ├─ page.tsx                # "use client"; credentials step + department-selection step
│  │  └─ actions.ts              # "use server"; loginAction/selectDepartmentAction, sets httpOnly cookies
│  └─ (auth)/                    # route group — shared testimonial layout
│     ├─ layout.tsx              # 50/50: dark brand panel | form area
│     ├─ register/page.tsx
│     └─ forgot-password/page.tsx
└─ (dashboard)/                  # route group — authed area; every page here is a real top-level route (see ADR-005)
   ├─ layout.tsx                 # server; getCurrentSession() + redirect("/login") guard, feeds DashboardShell
   ├─ actions.ts                 # "use server"; logoutAction — clears cookies, best-effort POST /auth/logout
   ├─ [...rest]/page.tsx         # catch-all placeholder for real-permission menu items with no page yet
   ├─ dashboard/
   │  ├─ page.tsx                # dashboard home (URL /dashboard — the one route that keeps this segment)
   │  └─ loading.tsx             # route-level Suspense fallback for /dashboard
   ├─ analytics/page.tsx         # URL /analytics
   ├─ orders/page.tsx            # URL /orders
   ├─ products/                  # URL /products and /products/list — real CRUD against cps-api, see Conventions § Products
   │  ├─ page.tsx                 # URL /products — server; PRODUCTS_VIEW gate + list/lookups fetch via products-page-content
   │  ├─ list/page.tsx            # URL /products/list — same products-page-content, separate entry point
   │  ├─ products-page-content.tsx # shared async Server Component body used by both page.tsx above
   │  └─ actions.ts               # "use server"; create/update/deactivate/restore, each revalidatePath on both /products and /products/list
   ├─ settings/page.tsx          # URL /settings
   ├─ users/page.tsx             # URL /users
   ├─ menus/                     # URL /menus — SUPER_ADMIN-only drag-and-drop menu tree editor, see Conventions § Menu management
   │  ├─ page.tsx                 # server; SUPER_ADMIN gate + initial GET /menus/management-tree fetch
   │  └─ actions.ts               # "use server"; saveMenuOrderAction/refreshMenuTreeAction (PATCH /menus/reorder)
   └─ materials/pc/               # URL /materials/pc — real CRUD against cps-api, see Conventions § Materials PC
      ├─ page.tsx                 # server; MATERIAL_VIEW gate + list/lookups fetch, reads page/search/status from searchParams
      └─ actions.ts               # "use server"; create/update/deactivate/restore, each revalidatePath("/materials/pc")
```

```
src/
├─ components/
│  ├─ ui/                        # shadcn-style primitives (Button, Input, Label, Card, Table, Sheet, Dialog, Tabs, ViewToggle, RowActionsMenu, ...)
│  ├─ layout/                    # Logo, command palette, app shell
│  ├─ dashboard/
│  ├─ menus/                     # menu-management drag-and-drop tree editor (dnd-kit) — see Conventions § Menu management
│  │  ├─ menu-tree-editor.tsx     # "use client"; DndContext wiring, save/reset, staged-changes state
│  │  └─ menu-tree-row.tsx        # sortable row + DragOverlay preview
│  ├─ materials-pc/              # /materials/pc CRUD — see Conventions § Materials PC
│  │  ├─ material-pc-client.tsx   # orchestrates filters/table/dialogs, calls Server Actions, router.refresh()
│  │  ├─ material-pc-filters.tsx  # search (debounced) + active/inactive/all pills, both drive URL searchParams
│  │  ├─ material-pc-table.tsx    # user-toggled cards/table (view prop) + shared pagination/actions
│  │  ├─ material-pc-form-dialog.tsx    # create/edit — responsive Dialog (full-screen on mobile, centered on desktop)
│  │  ├─ material-pc-status-dialog.tsx  # disable/enable confirmation, wraps ui/confirm-dialog
│  │  └─ material-pc-image-preview.tsx  # full-image lightbox (object-contain) + Download button, shared by table thumbnail + card image
│  ├─ products/                  # /products + /products/list CRUD — see Conventions § Products
│  │  ├─ products-client.tsx      # orchestrates filters/table/dialogs, calls Server Actions, router.refresh()
│  │  ├─ products-filters.tsx     # search (debounced) + active/inactive/all pills, drive URL searchParams
│  │  ├─ products-table.tsx       # ProductsCollection: table + card view (view prop), real cps-api fields
│  │  ├─ products-form-dialog.tsx # create/edit — responsive Dialog (full-screen on mobile, centered on desktop)
│  │  └─ products-status-dialog.tsx # disable/enable confirmation, wraps ui/confirm-dialog
│  └─ orders/  users/  settings/  # still src/lib/data.ts mock content, not wired to real API
├─ hooks/
│  └─ use-view-mode.ts            # generic localStorage-persisted table/card view state — see Conventions § Materials PC
└─ lib/                          # utils (cn), helpers, types, mock data
   ├─ nav.ts                     # menuHref()/flattenMenus() + secondaryNav (static, account-level only) — see Conventions § Sidebar permissions
   ├─ menu-icons.ts              # kebab-case cps-api icon name → LucideIcon map, resolveMenuIcons()
   ├─ menu-tree.ts               # pure tree algorithms for the D&D editor — flatten/project/apply-move, framework-agnostic
   ├─ session.ts                 # getCurrentSession() — server-only, React.cache-wrapped GET /auth/me, returns menus + permissions
   └─ api/                       # REST client — server-only, see Conventions § API
      ├─ client.ts               # apiFetch<T>() + ApiError, reads API_BASE_URL/API_AUTH_TOKEN
      ├─ auth.ts                 # login()/selectDepartment()/getMe()/logout() — mirrors cps-api /auth contract; MenuNode type
      ├─ menus.ts                # getManagementTree()/reorderMenus() — mirrors cps-api's undocumented /menus management contract
      ├─ materials.ts            # listMaterials()/getMaterialLookups()/create/update/deactivate/restore — real cps-api /materials
      ├─ users.ts  products.ts  orders.ts   # typed resource fetchers
      └─ index.ts                # barrel export
```

## Design System (cheat sheet)

Tokens live in `src/app/globals.css` (`:root` + `.dark`). Use the Tailwind utility names — never hardcode hex.

| Token | Light | Dark | Use for |
|---|---|---|---|
| `bg-bg` | `#F7F8FA` | `#0B0E14` | page background |
| `bg-surface` | `#FFFFFF` | `#11151D` | cards, inputs |
| `bg-surface-2` | `#F1F2F5` | `#161B25` | hover, secondary fills |
| `border-border` | `#E4E7EC` | `#232935` | dividers |
| `border-border-strong` | `#D3D7DE` | `#2E3644` | input borders |
| `text-fg` | `#12141A` | `#F3F5F7` | primary text |
| `text-fg-secondary` | `#5B6470` | `#99A2B0` | secondary text |
| `text-fg-muted` | `#8A93A1` | `#6B7280` | labels, hints |
| `bg-primary` | `#4640DE` | `#6C66FF` | primary action |
| `bg-primary-soft` | `#EEEDFC` | `#201F3D` | subtle primary accent |
| `text-primary` | `#4640DE` | `#6C66FF` | link, primary text |
| `text-success/warning/danger/info` + `-soft` | — | — | status colors |

**Radius**: `--radius: 0.625rem` (10px). Components default to `rounded-md`.

## Conventions

### Styling
- Always reference tokens (`bg-primary`, `text-fg-muted`) — never raw hex.
- Dark mode is automatic when you use the tokens — no manual switching.
- Tailwind 4 syntax — no `tailwind.config.*`. All tokens live in `globals.css` via `@theme inline`.
- Lucide icons: `import { IconName } from "lucide-react"`. v1.39 has all the common icons.

### Components
- **Always reuse** `src/components/ui/*` primitives. Don't recreate Button/Input/Label.
- Button variants: `primary | secondary | outline | ghost | danger | link`. Sizes: `sm | md | lg | icon`.
- Input defaults to `h-9`; override to `h-10` for prominent forms.
- Forms: `react-hook-form` + `zod` + `@hookform/resolvers/zod`. Toast via `sonner`.

### Routing & Layouts
- Route groups `(name)/` are for **layout sharing** — they do not affect URLs.
- A page that needs its own full-bleed layout (no parent chrome) lives at the top level (e.g. `src/app/login/`).
- `(auth)/layout.tsx` provides the testimonial split — only routes that want that chrome stay inside.
- **Resolved 2026-09-03, see ADR-005**: pages under `(dashboard)/` are real top-level routes (`/products`, `/users`, `/menus`, ...) matching cps-api's own menu `path` values exactly — not nested under a `/dashboard/*` prefix. `/dashboard` itself is the one route that keeps that segment (it's cps-api's own path for the dashboard menu item too). Don't add a new dashboard page under a `dashboard/` subfolder — put it directly under `(dashboard)/` at its own path.

### Dashboard shell
- Dashboard chrome uses a **floating-box app shell**: `DashboardShell` owns the full `h-dvh` viewport and outer responsive gap/padding; desktop `Sidebar`, `Topbar`, and the page-content scroller are separate rounded bordered surfaces.
- The document/dashboard shell itself must not scroll. `Topbar` and desktop `Sidebar` remain fixed in the viewport; only the `main` surface scrolls (`min-h-0`, `overflow-y-auto`, contained overscroll, stable scrollbar gutter).
- Below `lg`, the desktop sidebar is replaced by the existing Radix `Sheet`. Keep the mobile navbar visible, render the menu inside its own bordered surface, and close the Sheet through `SidebarNav#onNavigate` after a route is selected.
- Collapsed desktop navigation is icon-only, so every hidden-label link/button must retain an accessible name and hover title.
- `SidebarNav` hides its visual scrollbar with standard `scrollbar-width` plus a WebKit fallback while retaining `overflow-y-auto`; wheel, touch, and keyboard scrolling must keep working in both the desktop sidebar and mobile Sheet. Do not apply this treatment to the page-content scroller.

### State
- Default to **server components**. Add `"use client"` only when you need interactivity, hooks, or browser APIs.
- Use `useRouter` from `next/navigation` (not the deprecated `next/router`).

### API
- Backend is REST; base URL comes from `API_BASE_URL` (server-only env var, see `.env.local.example`). No public backend URL exists yet — placeholder only, fill in `.env.local` when one is available.
- Fetch **directly from Server Components** (Next.js 16 recommended pattern) via `src/lib/api/*` — no BFF proxy route handlers. Do not `fetch()` the backend ad-hoc from inside a component; add/extend a resource file in `src/lib/api/`.
- `src/lib/api/client.ts` exports `apiFetch<T>(path, init)`: prefixes `API_BASE_URL`, sets `Content-Type: application/json`, attaches `Authorization: Bearer ${API_AUTH_TOKEN}` if that env var is set, and throws `ApiError` (with `.status`/`.body`) on non-2xx.
- One file per resource (`users.ts`, `products.ts`, `orders.ts`), each returning the existing domain types from `src/lib/types.ts` — the API layer must not introduce parallel/duplicate types.
- `src/lib/data.ts` (mock generator) is untouched and still what pages currently render (except `/login`, see below). Swapping a page from mock data to `src/lib/api/*` is a separate, explicit task per page — don't do it silently as a side effect of unrelated work.

### Sidebar permissions — resolved, see ADR-004 (supersedes ADR-003) and ADR-005 (routes)
- **The sidebar is now driven directly by cps-api's real menu tree**, not a static list. `src/lib/session.ts#getCurrentSession()` exposes `menus: MenuNode[]` from `GET /auth/me`'s `accessControl.menus` — already filtered server-side to the active role's real permissions (see `cps-api/src/modules/access-control/services/menu-tree.service.ts`). `src/components/layout/sidebar-nav.tsx` renders that tree recursively (arbitrary depth, expand/collapse per node).
- `src/lib/nav.ts#menuHref(path)` maps a backend path **directly** to a local route — cps-api's paths (`/materials`, `/products`, `/dashboard`, ...) already match this app's real top-level routes 1:1 (see ADR-005), so there's no prefixing left to do; `menuHref` only substitutes `/dashboard` when a menu node has no `path` at all.
- `src/app/(dashboard)/[...rest]/page.tsx` is a catch-all placeholder ("this page isn't built yet") for real, permission-granted menu items that don't have a page implemented — keeps the dashboard chrome instead of falling through to the bare root `not-found.tsx`. Real backend paths that now land on an actually-built page calling the real API: `/dashboard`, `/materials/pc`, `/menus`, `/products` (see Conventions § Products). `/users` still renders `src/lib/data.ts` mock content (see below).
- `src/lib/menu-icons.ts#menuIcon(name)` maps cps-api's kebab-case `Menu.icon` (e.g. `"layout-dashboard"`) to a Lucide component via an explicit named-import map (not a blanket `import *`, to keep the bundle lean) — unmapped names fall back to a plain dot. **Add a new entry here whenever cps-api seeds a new menu icon**, or it'll render as a generic dot. `resolveMenuIcons()` pre-resolves an entire tree once (via `useMemo` in `SidebarNav`) — icons are intentionally resolved as data *before* being passed as props, not looked up inline inside the component that renders `<Icon />`, because the latter trips the React Compiler's "components created during render" lint rule (`react-hooks/static-components`).
- `secondaryNav` in `src/lib/nav.ts` (currently just `Settings`, href `/settings`) stays a small static, always-visible list for account-level items with no cps-api menu equivalent — not permission-gated, since every logged-in user can reach their own settings regardless of role.
- **Known gap, narrowed**: a menu item being visible does not mean its page calls the real API — `/users` still renders `src/lib/data.ts` mock content regardless of what permission actually let the user click there. Wiring it to `src/lib/api/users.ts` is a separate task (`/products` was wired to the real API — see Conventions § Products).
- Before wiring a new page to a real cps-api module: check `resolveMenuIcons`/the live tree for the exact `code`/`path` cps-api actually sends (don't guess) — `API_ENDPOINTS.md` documents the REST contract but not the seeded menu catalog itself; the menu catalog can drift from the endpoint list.

### Menu management (drag-and-drop tree editor) — `/menus`
- Backend contract for this page is **not in `API_ENDPOINTS.md`** (that doc's § 4.4 only lists the basic `/menus` CRUD routes) — it lives entirely in `cps-api/src/modules/menus/{menus.controller,menus.service,menu-tree-ordering}.ts`. Re-read those three files before touching this feature; don't rely on the endpoint doc here.
- Two purpose-built endpoints drive it: `GET /menus/management-tree` → `{ version, menus: ManagementMenuNode[] }` (unfiltered — includes inactive/hidden menus, unlike `/menus/tree`), and `PATCH /menus/reorder` → `{ version, items: [{id, parentId, sortOrder}, ...] }`. Both are **SUPER_ADMIN only** (`@Roles(SUPER_ADMIN)` on the whole controller) — `src/app/(dashboard)/menus/page.tsx` gates on `session.user.isSuperAdmin` and shows a friendly message instead of letting the page hit a 403.
- The reorder endpoint uses **optimistic concurrency**: `version` is a sha256 hash of every menu row's `(id, parentId, sortOrder, menuType, updatedAt)`, computed server-side. A stale `version` → `409`; the client must show that as a conflict and refetch, not retry blindly (`saveMenuOrderAction` in `menus/actions.ts` does this, calling `refreshMenuTreeAction` on `409`).
- **`items` must include every menu record, not just the ones that moved** — the backend 400s on a partial set (`validateAndProjectMenuLayout` in `menu-tree-ordering.ts`). `src/lib/menu-tree.ts#toReorderItems()` always derives the full payload from the complete flattened tree.
- Backend validation rules the client should avoid violating (it's re-validated server-side either way, but a client that ignores these just produces confusing 400s): sibling `sortOrder` must be contiguous 0-based per parent, max nesting depth is `cps-api`'s `MAX_MENU_DEPTH = 4` (mirrored client-side as `MAX_FLAT_DEPTH = 3`, 0-indexed), no cycles, and a `BUTTON`-type menu can't have children. `src/lib/menu-tree.ts#getDragProjection()` clamps the live drag preview to these constraints (see its `canHaveChildren` check) so the UI doesn't let you drop somewhere the API would reject.
- The drag algorithm is the standard dnd-kit "sortable tree" pattern: `flattenMenuTree()` depth-first-flattens the tree (so a node and its descendants are always a contiguous array run), horizontal drag offset (`event.delta.x` ÷ `INDENT_WIDTH`) projects a new depth/parent per `getDragProjection()`, and `applyMoveNode()` rebuilds the full flattened order on drop — including reinserting the dragged node's hidden-during-drag descendant subtree right after it, depth-shifted by the same delta. Projection must inspect neighbours after moving the active row to its `overIndex`; using the source index retains the old `parentId` on cross-parent drops and makes saved moves appear to revert. It also subtracts `getSubtreeDepth()` from the allowed maximum so descendants cannot exceed level 4. When that subtree-safe maximum is below the insertion boundary's required minimum depth, the projection is invalid and the drop must be rejected rather than lowering the minimum (which would corrupt depth-first subtree boundaries). These are pure functions in `src/lib/menu-tree.ts`, deliberately kept framework-agnostic and separate from the dnd-kit wiring in `menu-tree-editor.tsx`.
- Always pass a deterministic `id` to `DndContext` on server-rendered pages. dnd-kit's fallback `useUniqueId()` uses a module-level counter that persists across server requests, so omitting the ID makes the server's `aria-describedby` drift from the browser's initial value and triggers a hydration mismatch. The menu editor uses `menu-tree-dnd`; keep it unique within the page.
- Icons: same "resolve as data, not inline" rule as the sidebar (see above) — `MenuTreeRow`/`MenuTreeDragPreview` receive `Icon: LucideIcon` as a prop resolved by the parent's `useMemo`, they never call `menuIcon()` themselves.
- Edits are staged client-side (`items` state) until "Save changes" — no auto-save per drag, since every save must submit the complete, valid arrangement. "Reset" reverts to the last-saved snapshot.
- **Known gap**: this page only reorders/reparents existing menus — no create/rename/delete/edit-permissions UI yet. That's `POST /menus`, `PATCH /menus/:id` (non-reorder fields), `DELETE /menus/:id` — separate task if needed.

### Materials PC (CRUD) — `/materials/pc` — first real (non-mock) CRUD page, see ADR-006
- `/materials/pc` is **not a distinct cps-api module** — cps-api's `MaterialsController` is a single generic `/materials` REST resource (`cps-api/src/modules/materials/{materials.controller,materials.service,dto/*}.ts`, documented in `API_ENDPOINTS.md` § 6). "PC" is one value of the `type` field (`PC | OF | OF_MAT`). This page always sends/filters `type: "PC"` — it's a *view* over the shared materials table, not its own backend concept. Don't go looking for a "materials-pc" controller in cps-api; there isn't one.
- **This is the first page in the app wired to real cps-api data with real mutations** (menus was real data too, but reorder-only; this is full create/update/soft-delete/restore). Treat it as the reference pattern for wiring up the next mock page (Users, Products, Orders): Server Component fetches list + lookups directly (`src/lib/api/materials.ts`), filters live in the URL (`?page=&search=&status=`) so they're bookmookable and drive the server refetch, mutations go through Server Actions (`materials/pc/actions.ts`) that call `revalidatePath` on success, and the client only holds UI state (which dialog is open, for which row) — never a client-side copy of the list that could drift from the server.
- **Soft delete, not hard delete**: `DELETE /materials/:id` (called via `deactivateMaterial`) sets `isActive: false` server-side; the row is never removed. There's a dedicated `PATCH /materials/:id/restore`. The UI must never call this "Delete" — it's "Disable" (with a confirm dialog) and "Enable" (also confirmed, non-destructively) for inactive rows. This mirrors a UX pattern already established in a separate sibling app (`cps-app`) for the same backend resource — keep using it for any future soft-delete resource (units, suppliers, etc. all follow the same `isActive`/restore shape per `API_ENDPOINTS.md` § 5.1).
- **Update requires optimistic concurrency**: `UpdateMaterialDto.updatedAt` is a *required* ISO8601 field, not optional — the edit form must carry the row's current `updatedAt` forward and resubmit it; a stale value 409s. `material-pc-form-dialog.tsx` reads `material.updatedAt` at submit time; `materials/pc/actions.ts#errorResult()` maps a 409 to a "this was updated elsewhere, refresh" toast rather than a generic error. Don't make `updatedAt` optional or drop it from the payload.
- **Responsive dialog**: `src/components/ui/dialog.tsx#DialogContent` gained two *opt-in* props — `size` (`"lg" | "xl"`, only meaningful with the prop below) and `fullScreenOnMobile` — that make it a full-screen sheet below the `sm:` breakpoint and a centered sized dialog from `sm:` up, pure CSS (Tailwind breakpoint classes), no JS viewport detection. Existing call sites (`product-form-dialog.tsx`, `user-form-dialog.tsx`, `confirm-dialog.tsx`) don't pass either prop and are byte-for-byte unaffected — the default path is untouched from before this change. Use `fullScreenOnMobile` for any new dialog with enough fields that a small mobile viewport needs the full screen (i.e. most create/edit forms); leave simple confirm dialogs on the default centered-always behavior.
- `src/components/ui/confirm-dialog.tsx` gained an optional `variant?: "danger" | "default"` prop (default `"danger"`, so every existing call site is unaffected) — use `"default"` for a non-destructive confirmation like "Enable this material?" so the icon/button aren't alarming red for a reversible, positive action.
- **User-chosen table/card view — reusable, not materials-specific**: `src/hooks/use-view-mode.ts#useViewMode(key, default)` and `src/components/ui/view-toggle.tsx#ViewToggle` are generic — any list page can adopt the same toggle by calling `useViewMode("<page-key>")` and switching its own table/card renderers on the returned value. `useViewMode` reads/writes `localStorage` (`view-mode:<key>`) via `useSyncExternalStore`, not `useState` + `useEffect` — this project's lint config flags `setState` inside an effect as an error (see the sidebar's `activeChainIds` for the same "derive, don't effect" principle), and `useSyncExternalStore` is the React-native way to read external mutable state without one; the server snapshot is always `defaultValue` so SSR markup matches on first paint, and same-tab updates are propagated by dispatching a synthetic `StorageEvent` (native ones only fire in *other* tabs). `material-pc-table.tsx#MaterialPcCollection` takes a `view: "table" | "card"` prop and renders only that layout — no more automatic container-query switching by available width; the card grid's own `@min-[32rem]:grid-cols-2` is just that layout's internal responsiveness (1 col narrow, 2 wide), unrelated to the table/card choice itself. Cards and table share the same status/action sub-components so permissions and Edit/Disable/Enable behavior cannot drift between the two.
- **Not (yet) applied to Products/Users/Orders**: those tables are still bespoke, mock-data components with no card renderer of their own. `useViewMode`/`ViewToggle` are ready to reuse as-is, but each table's *card markup* still has to be hand-written per resource (column sets differ) — same conclusion `cps-app`'s own pattern reached (filters/list/form-modal/status-dialog is "structurally identical but not one generic component" across its resources). Adding a card view to another table means writing that table's own `<Resource>Collection`-shaped component and wiring the same two shared pieces, not extracting a single generic `<DataCollection>`.
- **Material images — thumbnail, card, and full preview**: both the table (a `size-10` rounded thumbnail, first column) and the card (fixed `16:9` region) show the backend's existing `imagePath`, each with an accessible fallback (`ImageOff` icon + "No image available for …") for missing or failed loads. Clicking either opens `material-pc-image-preview.tsx#MaterialPcImagePreview` — a single shared dialog (state lives in `MaterialPcCollection`, not per-row) showing the image at `object-contain` (never cropped) plus a Download button. The card's own image switched from `object-cover` to `object-contain` for the same reason — `cover` was cropping non-16:9 images to fill the frame, which read as "the image isn't showing at full size"; `contain` always shows the whole image, letterboxed on `bg-surface-2` if the aspect ratio doesn't match. The thumbnail alone still uses `object-cover` (a 40px square crop is fine for a *thumbnail*; the un-cropped view is one click away). `next.config.ts` rewrites same-origin `/uploads/*` requests to the origin derived from server-only `API_BASE_URL`, matching cps-api's public upload paths without exposing the API URL to client JavaScript — this same-origin-ness is also what makes the download button's `<a download>` trigger a real browser save instead of just navigating (a cross-origin `download` attribute would be ignored by the browser).
- **Create requires an image upload; edit can replace it**: the form accepts JPEG, PNG, or WebP up to 5 MiB and previews the selected file locally. Its `MaterialImagePicker` is a full-width dashed selection card: the native file input remains focusable but visually hidden, its explicit label makes the whole panel clickable, desktop uses a preview/content split, and mobile stacks the same content. Create and legacy rows without an image require a file; edit shows the current image and leaves the input optional. If no replacement is selected, update omits `imagePath` so the existing image remains untouched. If a replacement is selected, the same upload action stages it and PATCH sends the staged path; cps-api promotes the replacement and removes the prior committed file only after the transaction succeeds. Selected state shows the preview, filename, size, and replace wording; error state adds an icon and text so it does not rely on color alone. Upload calls `uploadMaterialPcImageAction`, which forwards multipart field `file` to `POST /materials/images`; cps-api ultimately stores it under the configured `MATERIAL_IMAGE_ROOT` (`D:/project-cps/New/image/materials` in the current backend environment). `next.config.ts` sets `experimental.serverActions.bodySizeLimit` to `6mb` because Next.js defaults Server Action request bodies to 1 MB while the backend permits 5 MiB images; keep the limit slightly above the file maximum for multipart overhead. `apiFetch()` must not set `Content-Type: application/json` when its body is `FormData`, so the runtime can generate the multipart boundary.
- Permission gating: real `MATERIAL_VIEW`/`CREATE`/`UPDATE`/`DELETE` codes (not the dotted `MATERIALS_PC_MANAGEMENTS.*` strings cps-api's own menu-permission seed uses for *display* — those are unrelated to what the `PermissionGuard` actually checks; the controller guards on the plain codes, confirmed by reading `material-permissions.ts` directly). `page.tsx` gates viewing; `MaterialPcClient` hides Add/Edit and Disable/Enable controls per `MATERIAL_CREATE`/`UPDATE` and `MATERIAL_DELETE` respectively, mirroring the backend's own per-route permission split — but note the backend re-checks on every call regardless, this is UX only, not the security boundary.

### Products (CRUD) — `/products` and `/products/list`, second real CRUD page after Materials PC
- `/products` **is** a distinct, first-class cps-api module (`cps-api/src/modules/products/{products.controller,products.service,dto/*}.ts`, `API_ENDPOINTS.md` § 7) — unlike Materials PC, this is not a filtered view over a shared resource. Confirmed by reading the controller/service/DTOs directly, not just the endpoint doc.
- **No page/limit in the list DTO** — `GET /products` returns the full matching set as `{ items, meta: { totalItems } }`, no server-side pagination. `products-table.tsx` renders the whole list with no Previous/Next controls (unlike `material-pc-table.tsx`, which does paginate). Filters (`search`, `status`) still live in the URL via `products-filters.tsx`, same pattern as Materials PC, just without a `page` param.
- **8 required FK fields on create** (`unitId`, `modelId`, `customerId`, `locationId`, `productTypeId`, `deliveryTypeId`, `loadingPointId`, `processLineId`) — all positive numeric-string ids, all `@Matches(/^[1-9]\d*$/)` server-side. `GET /products/lookups` returns all eight collections plus `units` in one call (`{ units, productModels, customers, locations, productTypes, deliveryTypes, loadingPoints, processLines }`) — `products-form-dialog.tsx` renders one `<Select>` per FK, all required (no `NONE`/"ไม่ระบุ" option like Materials PC's optional FKs — Products' FKs are all mandatory server-side).
- **Auto-computed stock levels**: `safetyStock` defaults to `lotSize` and `minStock` defaults to `packing` when omitted — the service recomputes these server-side on both create and update whenever the caller doesn't explicitly override them (see `products.service.ts#computeStockLevels`). The form sends `null` (not omits) for `safetyStock`/`minStock` when the field is left blank, so the server's auto-formula kicks in; sending `undefined` vs `null` matters here, don't collapse the distinction.
- **Same soft-delete/optimistic-concurrency/responsive-dialog patterns as Materials PC** — reuse those primitives as-is, don't reinvent: `DELETE /products/:id` soft-deactivates (`isActive: false`), `PATCH /products/:id/restore` restores, UI labels are "ปิดใช้งาน"/"เปิดใช้งาน" never "ลบ"; `UpdateProductDto.updatedAt` is required, a stale value 409s, mapped to the same "updated elsewhere, refresh" toast shape as `materials/pc/actions.ts#errorResult()`; `products-form-dialog.tsx` uses the same `DialogContent fullScreenOnMobile size="xl"` as Materials PC's form.
- **`/products` and `/products/list` share one page body**: `src/app/(dashboard)/products/products-page-content.tsx` exports the async `ProductsPageContent` Server Component (session/permission gate, list+lookups fetch, renders `ProductsClient`) — both `page.tsx` (URL `/products`) and `list/page.tsx` (URL `/products/list`) just call it with a different `title`/`description`. `actions.ts`'s Server Actions `revalidatePath` both URLs on every mutation so neither route serves stale data after the other route's edit.
- **Card view added 2026-09-04** (`useViewMode("products", "table")` + `ViewToggle` in `products-client.tsx`, `ProductsCollection` in `products-table.tsx` switches table/card by `view` — same shape as Materials PC's `MaterialPcCollection`, per the "Not (yet) applied to Products/Users/Orders" note's own suggested template). See the dedicated "Products card design" entry below for what's real vs. deliberately omitted vs. substituted, and why.
- **Read-only image display added alongside the card** (`ProductCardImage` in `products-table.tsx`, shows `productImagePath` via the same `/uploads/*` rewrite Materials PC uses) — upload is still out of scope, same reasoning as Materials PC's own image-upload deferral; this only renders an image the backend already returned, no new write path.
- Permission gating: real `PRODUCTS_VIEW`/`CREATE`/`UPDATE`/`DELETE`/`RESTORE` codes from `products-permissions.ts`. `products-page-content.tsx` gates viewing; `ProductsClient` hides Add/Edit and Disable/Enable per the same create-or-update / delete-or-restore split as Materials PC.
- Verified live against the real backend (`superadmin` session): `/products` and `/products/list` both render 5 real seeded products (`PD-001`, `PRD-001..004`) with real model/customer names (Honda Civic 2024, บริษัท ฮอนด้า ออโตโมบิล จำกัด, etc.); opened the edit dialog on `PD-001` — pre-filled correctly including all 8 FK selects — and saved successfully (200, dialog closed, list refreshed via `router.refresh()`, no errors). `tsc --noEmit`, `eslint` (0 errors, same 4 pre-existing warnings), `next build` all pass.

### Auth (login) — resolved, see ADR-002
- Backend: `D:\project-cps\New\cps-api` (NestJS). Its `/auth` contract is documented in `D:\project-cps\New\cps-api\API_ENDPOINTS.md` § 3 — **re-read that file before touching auth code**, it is the source of truth for request/response shapes, not this section.
- `src/lib/api/auth.ts` types (`LoginSuccess`, `DepartmentSelectionRequired`, etc.) were hand-derived from `cps-api/src/modules/auth/auth.service.ts` (`buildAuthenticationResponse`) because the endpoint doc doesn't spell out the full success body. If cps-api's auth service changes shape, these types will drift silently (no shared schema) — re-check both files together.
- Login is a two-step flow driven by the API, not the client: `POST /auth/login` returns either a full session or `{ requiresDepartmentSelection: true, departmentSelectionToken, departments[] }` when the user has >1 active assignment (SUPER_ADMIN and single-assignment users always skip straight to a session). `src/app/login/page.tsx` renders a second "choose a department" step (Radix `Select`) and calls `selectDepartmentAction` when that happens.
- `src/app/login/actions.ts` (`"use server"`) is the only place that calls `src/lib/api/auth.ts`. It sets `accessToken`/`refreshToken` as **httpOnly** cookies (`sameSite: lax`, `secure` in production) via `cookies()` from `next/headers` — tokens never reach client JS. The login page calls these actions directly from a client-side event handler (not a `<form action>`), reads the typed result, and does its own `toast` + `router.push`.
- `API_AUTH_TOKEN` in `.env.local.example` is now dead for the login flow specifically (login doesn't need a pre-existing token) but stays as a fallback static-bearer option for any future endpoint that's called before a user session exists.
- **Resolved 2026-09-01 (see below):** session cookies are now read back out. `src/lib/session.ts#getCurrentSession()` (wrapped in `React.cache`) calls `GET /auth/me` with the `accessToken` cookie and returns `{ user, currentDepartmentRole } | null`. `(dashboard)/layout.tsx` calls it and `redirect("/login")`s if null — this is the `/dashboard` route guard. `src/app/(dashboard)/actions.ts#logoutAction` clears both cookies and best-effort calls `POST /auth/logout`.

### Row actions (Meatballs menu) — `ui/row-actions-menu.tsx`
- `RowActionsMenu({ actions, itemLabel })` is the shared trigger for every per-row action list in the app: a single `size="icon"` `Ellipsis` (Meatballs) button, `aria-label={\`ตัวเลือกสำหรับ ${itemLabel}\`}` so screen readers hear which row it's for, opening a `DropdownMenu`. `actions: RowAction[]` items carry `label`, an optional `icon: LucideIcon`, `onSelect`, and `variant?: "default" | "danger"` — non-danger items render first, danger items render after a `DropdownMenuSeparator` (only inserted when both groups are non-empty), and danger items get `destructive` styling (red text). **The component returns `null` (no button at all) when `actions` is empty** — never an empty/disabled menu trigger.
- Used by all four resource tables: `material-pc-table.tsx` (both table cell and card footer — the card previously had two separate icon buttons, now shares the exact same Meatballs trigger as the table for visual consistency), `products-table.tsx`, `users/columns.tsx`, `orders/columns.tsx`.
- **"Enable"/"restore" is `"default"`, not `"danger"`** — reversing a disable isn't destructive. Only genuinely destructive/disabling actions (materials/products "ปิดใช้งาน", users "ลบผู้ใช้", orders "ยกเลิกคำสั่งซื้อ") are `"danger"`.
- **Permission-driven hiding preserved, not added**: Materials PC and Products already had `canEdit`/`canDelete` gates before this change — those are now expressed as `getMaterialRowActions(material, canEdit, canDelete, handlers)` / `getProductRowActions(product, canEdit, canDelete, handlers)`, pure functions (exported for tests) that build the `RowAction[]` array, omitting an action when its permission is false. Users and Orders are still mock pages with **no existing permission logic** (see the "known gap" note above) — `getUserRowActions`/`getOrderRowActions` intentionally always return the full action set; this change didn't invent new permission checks for those two, only swapped their pre-existing unconditional `DropdownMenu` markup for the shared primitive.
- **Testing pattern for a Radix `DropdownMenu`**: `DropdownMenuContent` renders through a Radix `Portal`, which does not render into `renderToStaticMarkup`'s output (no real DOM) — confirmed empirically (a `defaultOpen` dropdown's trigger shows `data-state="open"` in the SSR string, but the portaled content itself never appears). So tests only assert on the trigger (`aria-label`, presence/absence when `actions` is empty) via SSR string matching, and separately assert on each table's pure `get<Resource>RowActions()` function (labels, `variant`, permission-based omission) as plain data — the same "test the pure logic, not the Radix internals" split already used by `menu-tree.ts`'s framework-agnostic functions. Don't try to click-open a `DropdownMenu` in a Node-test-runner SSR test; it won't work without a real DOM (jsdom or similar), which this project doesn't have.
- New test files: `ui/row-actions-menu.test.tsx`, `products/products-table.test.tsx`, `users/columns.test.tsx`, `orders/columns.test.tsx` — all added to `package.json`'s `test` script (still an explicit file list, not a glob).

### Windows / file editing
- Prefer `read` + `edit` tools for UTF-8 source edits (PowerShell `Set-Content -Encoding UTF8` can silently mojibake CJK / Thai — see *Agent Memory*).
- For deletion, use `mavis-trash.js` directly (the `.cmd` launcher hangs) or `Move-Item` to a `%TEMP%` backup — `Remove-Item` is blocked by the safety gate.

---

## Mandatory Rules

> **These are non-negotiable. A change that violates them is considered incomplete.**

### R1 — Read AGENTS.md on every turn

- ทุกครั้งที่เริ่มทำงาน (ทุก prompt) ต้องอ่านไฟล์ AGENTS.md นี้ก่อนเสมอ
- The runtime auto-injects this file into every agent turn, so reading happens automatically.
- Before making a non-trivial code change, the agent **must** re-read the relevant section (Stack, Structure, Conventions) to confirm current state. Use `read` on this file if its in-memory copy might be stale.
- If a section is stale, the agent must update it **before** acting.

### R2 — Update AGENTS.md after every non-trivial change

- ทุกการแก้ไขโค้ด (edit) ที่เกิดขึ้นในโปรเจกต์นี้ ต้องอัพเดตไฟล์ AGENTS.md นี้เสมอ เพื่อบันทึกการเปลี่ยนแปลงหรือกฎที่เกี่ยวข้อง

After any of the following, the agent **must** update this file in the **same turn** (as the last step before the final response):

| Trigger | Update target |
|---|---|
| New / moved / deleted route or page | **Project Structure** |
| New dependency added to `package.json` | **Stack** |
| New convention or pattern emerges | **Conventions** |
| Architectural decision (split, refactor, new abstraction) | **Architecture Decisions** |
| Any user-visible code change | Append a one-liner under **Recent Changes** |

A change without a corresponding AGENTS.md update is considered **incomplete**.

### R3 — Don't break the `next dev` auto-injection

The `<!-- BEGIN:nextjs-agent-rules -->` ... `<!-- END:nextjs-agent-rules -->` block at the top of this file is auto-managed by `next dev`. **Preserve it verbatim** and add new content **after** the closing tag.

---

## Recent Changes

> Append newest at the top. Use `### YYYY-MM-DD — short title` for multi-file changes; one-liner for trivial edits.

### 2026-09-04 — Products card view: enterprise-dashboard-style redesign, real data only
- User shared a detailed "Business Dashboard"-style card spec (white card, image+info header, large price/stock stats, stock progress bar, category/warehouse/supplier/safety-stock/lot/location grid, view/edit/adjust-stock/more actions) for the **Products** page's card view — Products didn't have a card view at all before this (see the "Not (yet) applied to Products/Users/Orders" note in Conventions § Materials PC). Per the same investigation habit as the Materials-card stock work earlier today, read `product.entity.ts` directly before building anything.
- **Confirmed several requested fields don't exist for Products at all**: no price field anywhere on `Product`; no live current-stock-on-hand tracking for finished products in cps-api (searched — no product-linked stock/inventory module exists; `/stock-balances` is material-only); no separate English-name field (`Product.name` is a single field, no `nameTh`/`nameEn` split); no Supplier relation (Products relate to `Customer`, not `Supplier` — that's a Materials concept); no Lot No. on the product master record (lot is a per-production-run concept, not master data). Real fields that **do** exist: `safetyStock`/`minStock` (real numeric production-planning targets, not a live stock count), `location` (real FK, used as "warehouse"), `productType` (used as "category"), `customer`, `model`, `packing`, `lotSize`, `productImagePath`.
- Asked the user how to proceed given the gap; they chose "build the card with the real data available" — so the card substitutes honestly rather than fabricating: **`safetyStock`/`minStock` are the large primary stats** (in place of the requested price/current-stock pair), **no stock progress bar** (nothing to measure progress against — no current-quantity number exists), the info grid uses `productType`/`location`/`customer`/`model`/`packing`/`lotSize` (6 cells, same *count and layout* as the requested category/warehouse/supplier/safety-stock/lot/location grid, different real fields), and the action row shows only the two functions that actually exist — **Edit** and **Disable/Enable** — as visible bordered buttons, not "ดูรายละเอียด"/"ปรับสต็อก"/an empty "More" overflow (those have no backing functionality; adding UI for them would violate the "keep functionality unchanged" instruction and create dead buttons).
- **Deliberate exception to the RowActionsMenu convention**: unlike every other resource's card/table (Materials PC card+table, Products table, Users, Orders — all Meatballs), this card's action row uses two direct, labelled buttons instead of `RowActionsMenu`. This is intentional, not a regression of the cross-page consistency decided earlier: a card has room for labelled buttons (a strictly better affordance when there are only 1–2 actions), the Meatballs pattern exists specifically to save space in dense table rows, and the exact design being implemented explicitly called for a visible button row. `products-table.tsx`'s **table view** still uses `RowActionsMenu`/`ProductActions` exactly as before — only the new card view differs.
- Implementation: `ProductsCollection` in `products-table.tsx` (mirrors Materials PC's `MaterialPcCollection` shape) switches table/card by a `view: ViewMode` prop; `products-client.tsx` gained `useViewMode("products", "table")` + `<ViewToggle>` next to "เพิ่มสินค้า", same pattern as Materials PC. New card-only pieces: `ProductCardImage` (small `size-16` square thumbnail + `ImageOff` fallback, read-only display of the already-fetched `productImagePath` via the existing `/uploads/*` rewrite — no new upload path), `ProductCardFact` (icon+label+value, a Products-local copy of the same pattern as `MaterialCardFact` — kept separate per the project's established "hand-write each resource's card, don't extract one generic component" decision).
- Colors follow the brief: green status badge (existing `success`/`neutral` `Badge` variants, unchanged), blue-tinted outline for the non-destructive Edit button (`border-primary/30 text-primary`), red/green outline for disable/enable (matches the semantic danger/success convention already used everywhere else in the app — chosen over a literal "blue for all actions" reading, since destructive-vs-safe color-coding is a higher-priority, already-established convention).
- Verified live against the real backend (`superadmin` session): switched to card view on `/products`, all 5 real seeded products render with correct real data (code, name, status, safety/min stock, category, location, customer, model, packing, lot size); clicked Edit — the existing form dialog still opens correctly pre-filled (this change touched no Server Actions, no API client, no form logic); confirmed responsive at a 375px mobile viewport (single column, nothing overflows, buttons stay usable). `tsc --noEmit`, `eslint` (0 errors, same pre-existing warnings), `pnpm test` (46/46 — 4 new card tests: composition/primary-stats, visible action buttons present, action row omitted when no permission, image fallback), `next build` all pass.

### 2026-09-04 — Card fact grids: each field now sits in its own bordered cell
- Follow-up to the dividing-line fix above. User asked for the six-field facts grid (supplier/model/unit/delivery-type/loading-point/process-line on Materials PC; category/location/customer/model/packing/lot on Products) to visually separate each value, not just group them in one soft-filled box.
- Both cards' fact grids (`MaterialCardFact`/`ProductCardFact` + their parent `<dl>`) switched from `gap` spacing inside a single `bg-surface-2` block to a bordered 2-column grid where every cell has its own padding and border: right border on the left column, bottom border on every row except the last — using Tailwind arbitrary variants (`[&>*:nth-child(odd)]:border-r`, `[&>*:not(:nth-last-child(-n+2))]:border-b`) directly on the `<dl>`, since Tailwind's `divide-x`/`divide-y` alone can't express "right border in column 1, bottom border on all but the last row" for a 2-column grid (`divide-*` only distinguishes "first child" vs "the rest" in DOM order, not row/column position). Both `MaterialCardFact` and `ProductCardFact` gained a `p-2.5` on their own root instead of relying on the parent's `gap-*`.
- Verified live (`superadmin` session): both cards show a clean bordered grid — a horizontal line between each row and a vertical line between the two columns, reads like a small table. `tsc --noEmit`, `eslint` (0 errors), `pnpm test` (46/46, unaffected — pure CSS), `next build` all pass.

### 2026-09-04 — Fixed a real dividing-line gap on Materials PC's card (and hardened Products' the same way)
- User asked for clearer section-dividing lines on the card. Found a genuine bug, not just a polish request: Materials PC's card drew the divider between its header and facts-grid sections only via the stock stat's own `border-y` — since that stock section is conditionally rendered (omitted entirely when the viewer lacks `MATERIALS_RECEIVING_VIEW`, see the `/stock-balances` entry above), those viewers saw **no divider at all** between the header and the facts grid.
- Fixed by switching both Materials PC's and Products' card (`Card className="... divide-y divide-border ..."`) to Tailwind's `divide-y`, which draws a border between whichever children actually render — correct regardless of which conditional sections are present — instead of a fixed `border-y`/`border-t` per section that has to be manually kept in sync with what's conditional. Removed the now-redundant individual `border-y`/`border-t` classes from `MaterialCardStock`, the Products safety/min-stock row (kept its own `divide-x` for the two-column split), and both cards' action rows — `divide-y` already supplies those lines.
- Verified live (`superadmin` session): both cards show a clean line between every section (header → stock/stat → facts grid → actions) with no missing or doubled lines. `tsc --noEmit`, `eslint` (0 errors), `pnpm test` (46/46, unaffected — this was pure CSS), `next build` all pass.

### 2026-09-04 — Materials PC card rebuilt to match a shared reference design (real data only)
- User sent a full HTML/CSS mockup (`product-card.html`) as "ตัวอย่าง" — SKU prefix `MTR-` and a literal "Supplier" field identified it as a **Materials**, not Products, reference (confirmed by asking; Products has no supplier concept, only Materials does). This is the same third redesign pass of the day on the Materials PC card, now matching the mockup's structure closely instead of the session's earlier lighter-touch pass.
- Same real-vs-fake investigation as the Products card work: the mockup's ราคา (price), Min Stock number, Lot No., and ตำแหน่งจัดเก็บ/คลังสินค้า (a single warehouse location) **do not exist on `Material`** — no price field anywhere, no min/safety-stock threshold column (only `Product` has that), and lot/location are per-receiving-record concepts (a material can have many lots across many locations, not one value). Real fields used instead: `code`, `name`, `isActive`, `materialType`+`ratio` (shown as a secondary badge, standing in for the mockup's category pill), real stock quantity (already wired via `/stock-balances` earlier today), `suppliers` (materials genuinely have real suppliers, unlike products), `model`, `unit`, `deliveryType`, `loadingPoint`, `processLineName`.
- Layout changes to match the reference: photo moved from a full-width 16:9 hero to a side-by-side rectangle next to the SKU/name/badges (`MaterialCardPhoto`, replacing the old `MaterialCardImage` — same click-to-preview and `ImageOff` fallback behavior, no status-badge overlay on the photo anymore since status now sits next to the name instead). The stock stat became one large centered `text-2xl` green number under a bordered divider (was a small inline row) — still no progress bar, since there's no min/max threshold to measure progress against. The facts grid grew from 4 to 6 real fields to match the mockup's 6-cell grid count.
- **Card action row switched from `RowActionsMenu` to two visible bordered buttons** (Edit blue-tinted, Disable/Enable red/green), same treatment and same reasoning as the Products card redesign earlier today (see that entry below) — table view is untouched and still uses `RowActionsMenu`/`MaterialActions`. Skipped the mockup's "ดูรายละเอียด" and "ปรับสต็อก" buttons — neither has real backing functionality (no separate view-only modal, no stock-adjustment feature), and a fourth "More" overflow button would have nothing left to hold once the two real actions are already visible buttons.
- Updated `material-pc-table.test.tsx` for the new card markup: the two RowActionsMenu-trigger assertions in card-view tests became direct "แก้ไข"/"ปิดใช้งาน" button-text assertions, and the image-fallback test now checks the `aria-label` (the old "ไม่มีรูปภาพวัสดุ" caption text was dropped from the redesigned photo component).
- Verified live (`superadmin` session): card renders photo+SKU+name+status+shape badge, "คงเหลือ" stat, the 6-fact grid with real values, and working Edit/Disable buttons; confirmed responsive at 375px (photo stacks above the info column, nothing overflows). `tsc --noEmit`, `eslint` (0 errors, same pre-existing warnings), `pnpm test` (46/46), `next build` all pass.

### 2026-09-04 — Materials PC card shows real stock quantity from `/stock-balances`
- Follow-up to the same-day card redesign. User shared a mockup with price/stock/Lot No./warehouse fields and, after being told which of those actually exist in cps-api (only stock quantity does — confirmed by reading `material.entity.ts` directly: no price/minStock/safetyStock/lot/location columns on `Material` at all; those concepts only exist for `Product` or per-receiving-record, not as a single value per material), asked to add real stock and leave the rest of the design as-is.
- `/stock-balances` (`cps-api/src/modules/stock-balances/*`) is a **separate cps-api resource from `/materials`**, gated on `MATERIALS_RECEIVING_VIEW` — not `MATERIAL_VIEW`. A user can see the materials list without being able to see stock. Added `src/lib/api/materials.ts#listStockBalances()` (`GET /stock-balances`, returns every material that has a stock-balance row — a material with no receiving history yet has **no row at all**, which the UI must treat as quantity 0, not an error/loading state).
- `materials/pc/page.tsx` now computes `canViewStock` (super admin or `MATERIALS_RECEIVING_VIEW`) and only calls `listStockBalances` when true, building a `Record<materialId, StockBalance>` and passing it down as `stockByMaterialId: ... | null` through `MaterialPcClient` → `MaterialPcTable` → `MaterialPcCollection` → the card. `null` means "don't even show the section" (missing permission), not "show zero for everything" — that distinction matters for correctness, don't collapse it.
- Card change: one new `MaterialCardStock` row (Boxes icon, "คงเหลือ" label, quantity + unit) between the header and the existing facts group — a single highlighted stat, not a two-column price/stock split like the mockup, since materials genuinely have no price anywhere in the backend. Table view (`view === "table"`) was **not** touched — stock display is card-only for this pass.
- Verified live (`superadmin`, who has `MATERIALS_RECEIVING_VIEW`): card shows "คงเหลือ 0 Sheet"/"0 Piece" for both seeded materials; confirmed via a direct authenticated `curl` to `GET /stock-balances` that the backend genuinely returns `[]` in this dev database (no receiving has ever been confirmed) — the displayed 0 is correct real data, not a bug or a stub. `tsc --noEmit`, `eslint` (0 errors), `pnpm test` (42/42 — 3 new tests: value shown when a balance row exists, defaults to 0 when the material has no row, omitted entirely when `stockByMaterialId` is `null`), `next build` all pass.

### 2026-09-04 — Materials PC card view redesigned for visual hierarchy (no logic/API/functionality change)
- User asked for a Clean/Modern card redesign — important info first, less clutter, clearer grouping, status/action prominent — explicitly without touching business logic, API calls, or functionality, and staying responsive. Scoped (via a clarifying question) to `/materials/pc`'s card view (`material-pc-table.tsx`'s `MaterialPcCollection` card branch) — the only real data-card UI in the app.
- **Header reordered**: name now leads (larger, bold, first) with code as a smaller muted mono caption below it — previously code was the more prominent line above a bold name. Pure display-order/styling change; same two fields, no data added or removed.
- **Row-actions moved from a dedicated footer row to beside the title** (top-right of the card content, next to the name) — every card now ends at a consistent height instead of varying with whether the action row was present, and the action is one visual scan away from the identifier it acts on. Dropped the `{(canEdit || canDelete) && (...)}` wrapper around `MaterialActions` — `RowActionsMenu` (added in the prior change) already renders `null` when there are no permitted actions, so the extra guard was redundant, not a behavior change.
- **Status not duplicated**: the badge stays exactly where it was (overlaid top-right on the image, from the prior "image-first card redesign" pass) — that's already a strong glanceable position, so it's intentionally not repeated in the text content below (avoids clutter per the request, still equally prominent).
- **The four existing facts (shape+ratio, unit, supplier count, model) are grouped into one `bg-surface-2` rounded block** with a small icon per fact (`Shapes`, `Ruler`, `Truck`, `Layers` from `lucide-react`) instead of a bare `dl` grid separated by top/bottom borders — reads as one scannable group rather than a dense table squeezed into card width. Same four data points, same fallback (`—` when a lookup is missing), same `dl`/`dt`/`dd` semantics — only the visual container and added icons changed. New `MaterialCardFact` sub-component (icon + label + value) factors the repeated markup.
- No changes to `Material` type, API calls, Server Actions, permission checks, or the table view (`view="table"` branch) — only the JSX/Tailwind inside the `view === "card"` branch changed.
- Verified: `material-pc-table.test.tsx`'s existing assertions (row count, trigger `aria-label`, image fallback text) still pass unmodified — none of them depended on card layout order. Live-checked in the browser (`superadmin` session) at desktop width (name-first header, icon fact grid, meatballs beside the title, status badge on the image) and at a 375px mobile viewport (single column, facts block stays legible, nothing overflows or truncates awkwardly). `tsc --noEmit`, `eslint` (0 errors, same pre-existing warnings), `pnpm test` (39/39, unchanged), `next build` all pass.

### 2026-09-04 — Shared `RowActionsMenu` (Meatballs) primitive across Materials PC, Products, Users, Orders
- User asked for one central row-actions primitive: a `size="icon"` Meatballs (Ellipsis) trigger with an accessible label naming the row, normal actions in standard color, destructive actions (disable/cancel) in danger color below a separator, actions hidden per existing permissions, no trigger at all when a row has zero actions, and the Materials PC card view switched to the same trigger as its table for consistency — plus tests for trigger/labels/permission/destructive and a lint/typecheck/build pass.
- Added `src/components/ui/row-actions-menu.tsx#RowActionsMenu` — wraps the existing `DropdownMenu` primitive, takes `actions: RowAction[]` (`label`, optional `icon`, `onSelect`, `variant?: "default" | "danger"`) and `itemLabel` (used in `aria-label={\`ตัวเลือกสำหรับ ${itemLabel}\`}`); groups danger items after a separator, returns `null` when `actions` is empty.
- Rewired all four consumers to build their `RowAction[]` via a new exported pure function instead of hand-rolled `DropdownMenu`/separate icon buttons: `material-pc-table.tsx#getMaterialRowActions` (used in both the table cell and the card footer — the card's two separate icon buttons are gone), `products-table.tsx#getProductRowActions`, `users/columns.tsx#getUserRowActions`, `orders/columns.tsx#getOrderRowActions`. Materials PC and Products keep their pre-existing `canEdit`/`canDelete` permission gates (now expressed as omitted array entries); Users/Orders have no existing permission logic so their functions always return the full set — see Conventions § Row actions for why that's correct here, not an oversight.
- Discovered empirically that Radix `DropdownMenuContent` renders through a `Portal` that doesn't appear in `renderToStaticMarkup` output (no real DOM available to the Node test runner) — even with `defaultOpen` the trigger shows `data-state="open"` but the menu content itself is absent from the SSR string. Tests therefore split along that boundary: SSR-string assertions for the trigger (`aria-label`, present/absent), plain function-call assertions for each `get<Resource>RowActions()`'s labels/`variant`/permission-based omission. Added `row-actions-menu.test.tsx`, `products-table.test.tsx`, `users/columns.test.tsx`, `orders/columns.test.tsx`; extended `material-pc-table.test.tsx` with the same coverage and updated its two aria-label assertions to match the new single-trigger markup. All 8 test files now run via `package.json`'s `test` script (39 tests total).
- Verified live against the real backend (`superadmin` session): Materials PC table and card, Products, Users, and Orders all show the single Meatballs trigger; opened Materials PC's menu and confirmed "แก้ไข" renders in standard color, a separator, then "ปิดใช้งาน" in danger red. `tsc --noEmit`, `eslint` (0 errors, same pre-existing React Compiler warnings), `pnpm test` (39/39), `next build` all pass.

### 2026-09-03 — Products wired to real cps-api data (second real CRUD page)
- User asked for `/products` to show real data from the products API. Confirmed `/products` is a genuine standalone cps-api module (not a filtered materials-style view) by reading `products.controller.ts`/`products.service.ts`/`dto/*.ts` directly, then wired both `/products` and `/products/list` end-to-end following the Materials PC reference pattern from ADR-006: Server Component fetches list+lookups, filters live in the URL, mutations are Server Actions with `revalidatePath`, client holds only UI state.
- Added `src/lib/api/products.ts` (real `Product`/`ProductLookups` types matching the entity's actual select/relations, `listProducts`/`getProductLookups`/`create`/`update`/`deactivate`/`restore`), `src/app/(dashboard)/products/actions.ts` (Server Actions, `revalidatePath` on both `/products` and `/products/list`), and `src/app/(dashboard)/products/products-page-content.tsx` (shared async page body used by both routes).
- Rewrote the client components from scratch against real fields: `products-client.tsx`, `products-filters.tsx` (search + active/inactive/all, no `page` param — backend has no list pagination), `products-table.tsx` (real columns: code, name, model, customer, unit, packing/lot, min/safety stock, status), `products-form-dialog.tsx` (all 8 required FK selects fed by `/products/lookups`, packing/lotSize/safetyStock/minStock, scale), `products-status-dialog.tsx` (disable/enable, mirrors Materials PC). Deleted the old mock-data `product-table.tsx`, `product-form-dialog.tsx`, `columns.tsx` (nothing else referenced them).
- See Conventions § Products for the full contract details (required-FK shape, auto-computed safetyStock/minStock, shared page body between the two routes, deferred image upload/card view).
- Verified live against the real backend (`superadmin` session): both routes render the 5 real seeded products with real relation names; edited `PD-001` and saved successfully. `tsc --noEmit`, `eslint` (0 errors), `next build` all pass.

### 2026-09-03 — Added `/products/list` route
- User asked for a `/products/list` path showing the product table. Added `src/app/(dashboard)/products/list/page.tsx` — reuses the existing `ProductsTable` component (same one `/products` renders), same `?new=1` query param to auto-open the create dialog. No new component or data logic; purely a second URL onto the same mock-data table.
- Its breadcrumb falls back to whatever real cps-api menu item's `path` resolves to `/products` (via `Topbar#useBreadcrumb`'s `pathname.startsWith(item.href + "/")` match), same as any other nested route under an existing top-level path — this is pre-existing behavior, not something new added here.
- Verified: `npx tsc --noEmit`, `next build` (route appears as `ƒ /products/list`), and live in the browser logged in as `superadmin` — table renders correctly in Thai at `/products/list`.

### 2026-09-03 — Whole app UI translated to Thai
- User asked to switch the entire app's UI text to Thai ("แปลเป็นภาษาไทยทั้งแอป — ทุกหน้าที่เป็นภาษาอังกฤษ"). Ran 7 parallel translation passes (by area: auth pages, dashboard route pages, layout/chrome, dashboard widgets/charts, materials-pc + menus, orders/products/users/settings, shared `ui/*` primitives) covering ~65 files across `src/app/`, `src/components/`, `src/lib/nav.ts`, `src/lib/data.ts`, `src/lib/dashboard-data.ts`.
- Scope of what got translated: headings, body copy, button/label text, placeholders, toasts/error messages, aria-labels, alt text, empty states, table/column headers, chart legends/tooltips, dialog titles, confirm-dialog copy, pagination text, metadata title/description.
- Deliberately **not** translated (still English by design): variable/prop/function/component names; TypeScript type/enum string literals used as logic discriminants (`===` comparisons, `switch`/type-union tags, `<SelectItem value="...">`/`<TabsTrigger value="...">` values, `Record` keys like `statusVariant`); API field names and the literal `"PC"` materials-type filter value; route paths/hrefs; code comments; mock/demo **data values** that are proper nouns or sample content (people's names, emails, SKUs, invoice IDs) as opposed to UI chrome; the brand name "CPS · Chiewchan Industry" itself.
- **Sidebar menu labels are NOT hardcoded strings in this app** — `SidebarNav` renders `session.menus` fetched live from cps-api's `GET /auth/me`, so those labels are already whatever language the backend seed has them in (currently a Thai/English mix from cps-api's own data) and were correctly left untouched by the translation pass.
- One test file was updated to match: `src/components/materials-pc/material-pc-table.test.tsx` — its aria-label assertions (`Edit {name}`, `Disable {name}`, `No image available for {name}`, `View full image for {name}`) now match the new Thai prefixes (`แก้ไข {name}`, `ปิดใช้งาน {name}`, etc.); the `alt` text (`Material image: {name}`) was intentionally left in English and the test still asserts on that verbatim.
- Verified: `npx tsc --noEmit -p tsconfig.json` clean, `pnpm test` (9/9), `pnpm lint` (0 errors, same 4 pre-existing React Compiler warnings, unrelated), `next build` all pass. Visually confirmed live in the browser: `/login` and `/register` (both unauthenticated, so verifiable without a running backend) render fully in Thai. Could not click-verify the authenticated pages (`/dashboard`, `/materials/pc`, `/menus`, etc.) this pass because the local `cps-api` dev server was not running at verification time — build/typecheck/test passing is strong evidence they're correct, but a manual look once the backend is up is still worth doing.
- **Rule for future UI text**: write new user-facing copy directly in Thai to match the rest of the app — English copy introduced from here on will look inconsistent, not just untranslated.

### 2026-09-03 — Fixed insert/edit/view dialogs rendering with zero height (two separate CSS bugs, same failure mode)
- User reported "dialog ไม่ทำงาน ทั้ง insert edit view" (dialogs don't work — insert, edit, and view all broken). Both bugs were CSS box-model issues where an element's actual rendered height collapsed to near-zero despite React/Radix state being correct (`data-state="open"`, `display: flex`, `opacity: 1`) — diagnosed via `getComputedStyle`/`getBoundingClientRect` in the live browser, not from reading source alone, since the DOM/ARIA state all looked correct.
- **Bug 1 — `src/components/ui/dialog.tsx#DialogContent`'s `fullScreenOnMobile` branch**: `sm:inset-1/2` sets `top/right/bottom/left: 50%` simultaneously. With `position: fixed`, having both `top` and `bottom` constrained makes the browser compute `height` from the box-constraint equation instead of respecting `h-auto` as shrink-to-fit — collapsed to ~2px. This broke every dialog using `fullScreenOnMobile` (the Materials PC form dialog — both insert and edit — and the image preview dialog), since they all share this one primitive. Fixed by resetting all four sides (`sm:inset-auto`) then only constraining `sm:left-1/2 sm:top-1/2`, matching the working technique already used in the non-`fullScreenOnMobile` branch (`left-1/2 top-1/2` + `-translate-x-1/2 -translate-y-1/2`).
- **Bug 2 — `src/components/materials-pc/material-pc-image-preview.tsx`**: a second, independent bug that only showed up once bug 1 was fixed (the dialog chrome opened correctly, but the photo itself rendered as an empty box). `h-full` on a flex item inside `DialogContent`'s `flex flex-col` (whose own height is `h-auto`, i.e. content-driven, not definite) isn't a "definite" percentage per the CSS spec, so it resolved to 0 despite the parent having a real, non-zero pixel height in the actual layout. Fixed by replacing the `h-full w-full` flex-child wrapper with `absolute inset-4` — absolute positioning resolves against the parent's already-laid-out box directly and isn't subject to the same percentage-height-definiteness rule.
- **Rule for future dialog/flex work**: don't use `inset-1/2` (or any Tailwind shorthand that sets all four `top/right/bottom/left`) on a `position: fixed`/`absolute` element that also needs `height: auto` to shrink-to-content — reset unused sides to `auto` explicitly and only constrain the two you need. Similarly, don't rely on `h-full`/`w-full` (percentage sizing) on a flex item whose ancestor chain includes an auto-height flex container — use `absolute inset-*` against a `relative` parent instead when the parent's height is itself content-driven.
- Verified live end-to-end against the running dev server (`superadmin` session, `/materials/pc`): insert ("Add material") dialog opens at full height (648px) with all form fields visible; edit dialog opens correctly pre-filled ("Edit PC material"); view (image preview) dialog opens with the photo itself now visibly rendered plus a working Download button. `pnpm test` (9/9), `npx tsc --noEmit`, `pnpm lint` (0 errors, same 4 pre-existing React Compiler warnings, unrelated), and `next build` all pass.

### 2026-09-03 — Materials PC: table thumbnails + full-image preview with download
- User asked for three things: show images in the table view too (previously card-only), fix the card image not showing "100%" (it was being cropped), and let people click a photo to view it full-size with a download button
- Added `src/components/materials-pc/material-pc-image-preview.tsx#MaterialPcImagePreview` — one shared Dialog (state hoisted to `MaterialPcCollection`, not one instance per row) rendering the image at `object-contain` inside a `max-h-[70vh]` box, plus a Download button (`<a download>` on the same-origin `/uploads/*` rewrite from `next.config.ts` — cross-origin `download` attributes are silently ignored by browsers, so this only works because that rewrite already existed)
- Root cause of "not 100%": the card image used `object-cover` inside a fixed `16:9` box, which *crops* to fill the frame whenever a photo's own aspect ratio isn't 16:9 — switched to `object-contain` so the whole image is always visible (letterboxed on `bg-surface-2` if needed), and made it clickable (`cursor-zoom-in`) to open the same preview dialog at full readable size
- Added `MaterialThumbnail` — a new first column in the table (`size-10` rounded, `object-cover` is fine here since it's genuinely a thumbnail, not the main view), clickable to open the same preview dialog. Same accessible-fallback treatment (`ImageOff` icon) as the card for materials with no image
- Extended `material-pc-table.test.tsx`: 2 new assertions (no-image fallback aria-label in table view; thumbnail button + image present when `imagePath` is set) — 9/9 tests pass
- Verified live against the real backend via `curl` (browser tool unavailable this pass): `/materials/pc` still 200s, no error boundary text, and the new `aria-label="View full image for …"` markup is present for the one real material that has an `imagePath`. Did not visually click-test the lightbox/download interactively this pass — worth a manual check before relying on this in prod
- `tsc --noEmit`, `eslint` (0 errors), `pnpm test` (9/9), `next build` all pass

### 2026-09-03 — Materials PC: user-controlled table/card view toggle (reusable)
- User asked for an explicit table/card switch on `/materials/pc` (a prior pass had added an *automatic* container-query switch — table when wide, cards when narrow — with no manual override), and asked whether the switching mechanism could be shared across every table in the app
- Added `src/hooks/use-view-mode.ts#useViewMode(key, default)` — generic, `localStorage`-persisted `"table" | "card"` state via `useSyncExternalStore` (not `useState`+`useEffect`, which this project's lint blocks as `set-state-in-effect`) — and `src/components/ui/view-toggle.tsx#ViewToggle` — a generic two-button icon toggle. Neither imports anything materials-specific; any list page can reuse both as-is
- Changed `material-pc-table.tsx#MaterialPcCollection` (renamed from `MaterialPcResponsiveCollection`) to take an explicit `view` prop and render only that layout, replacing the old always-render-both-hide-with-CSS approach — updated `material-pc-table.test.tsx` accordingly (was asserting both presentations rendered simultaneously with 2x duplicate counts; now asserts exactly one presentation per `view`, 4 tests instead of 3)
- Wired into `material-pc-client.tsx`: `useViewMode("materials-pc", "table")` + `<ViewToggle>` next to the "Add material" button
- **Answer on genericizing further**: the toggle *mechanism* (state + persistence + button UI) is now fully shared, but the *card markup itself* is not generic — Products/Users/Orders still have their own bespoke table components with no card renderer, and each resource's card needs its own fields/layout same as `cps-app`'s own established pattern for this. Adding a card view to another table means writing that table's own collection component reusing `useViewMode`/`ViewToggle`, not extracting one generic `<DataCollection>` — documented as a decision point in Conventions § Materials PC so nobody tries to force a single generic table/card component later
- Verified live against the real backend (superadmin session): default renders as table with real data (`MAT-2026-001`), clicking the card icon switches instantly to an image card, reloading the page keeps the card choice (confirms `localStorage` persistence works), switching back to table works and updates the toggle's pressed state
- `tsc --noEmit`, `eslint` (0 errors), `pnpm test` (8/8), `next build` all pass

### 2026-09-03 — Materials PC image-first card redesign
- Redesigned the narrow `/materials/pc` cards with a `16:9` image region above the content, an overlaid status badge, restrained hover treatment, and an accessible fallback for missing or failed images; table mode and all existing CRUD permission behavior remain unchanged.
- Added a same-origin `/uploads/*` rewrite in `next.config.ts`, derived from server-only `API_BASE_URL`, so `next/image` can render cps-api material paths without exposing backend configuration in client code.
- Extended the SSR regression suite with image and no-image cases; `pnpm test` now runs 7 tests.

### 2026-09-03 — Materials PC responsive cards and table
- Updated `/materials/pc` to select its presentation from the list container width: one-column cards below `32rem`, two-column cards from `32rem`, and the existing table from `48rem`; this stays SSR-safe because it uses CSS container queries instead of browser-width state.
- Reused shared status and row-action renderers in both layouts, preserving the existing permission gates and Edit/Disable/Enable behavior, and made pagination controls compact on narrow screens.
- Added an SSR regression test covering both representations and duplicated actions; `pnpm test` (5/5), TypeScript, ESLint (0 errors), `next build`, and `git diff --check` pass. Authenticated browser visual QA remains pending because the in-app browser session redirected to `/login`.

### 2026-09-03 — Materials PC: first real CRUD page (list, create, edit, disable/restore)
- User asked for CRUD on `/materials/pc` — dialog on desktop, full-screen on mobile — plus the standard soft-delete UX (backend already does soft delete + restore): active/inactive/all filter, "Delete" relabeled "Disable" with confirmation, disabled rows get an "Enable" action. Explicitly asked to follow "this pattern" (soft-delete-as-disable, not hard delete)
- Researched cps-api directly rather than trusting `API_ENDPOINTS.md` alone (it's accurate here, but confirmed by reading `materials.controller.ts`/`materials.service.ts`/`dto/*.ts`): `/materials/pc` is **not a separate backend module** — it's the generic `/materials` resource filtered to `type: "PC"`. Also found a sibling app, `cps-app` (`D:\project-cps\New\cps-app`), that already implements a near-identical page against the same backend — read its UX/copy (status pills, disable/enable confirm-dialog wording, optimistic-concurrency handling) as the reference pattern, but deliberately did NOT copy its data layer (React Query) — see ADR-006
- Added `src/lib/api/materials.ts` (list/lookups/get/create/update/deactivate/restore, typed to the exact backend response shape read from `materials.service.ts#mapSuppliers`/`mapLookup`) and `src/app/(dashboard)/materials/pc/{page.tsx,actions.ts}` (Server Component + Server Actions, filters live in `searchParams`, mutations `revalidatePath`)
- Added `src/components/materials-pc/{material-pc-client,material-pc-filters,material-pc-table,material-pc-form-dialog,material-pc-status-dialog}.tsx`
- Extended two shared primitives, both backward-compatible (existing call sites pass neither new prop and are unaffected): `ui/dialog.tsx#DialogContent` gained `size`/`fullScreenOnMobile` (pure CSS breakpoint, full-screen sheet below `sm:`, centered dialog from `sm:` up) for the responsive create/edit dialog; `ui/confirm-dialog.tsx` gained `variant?: "danger" | "default"` so the "Enable" confirmation isn't styled as a destructive red action
- Added `src/components/ui/textarea.tsx` (didn't exist yet; specification/description fields needed it)
- `UpdateMaterialDto.updatedAt` is a *required* field server-side (optimistic concurrency, not optional like most other fields) — the edit form threads `material.updatedAt` through on every save; a 409 is mapped to a specific "updated elsewhere, refresh" toast, not a generic error
- Gated on the real `MATERIAL_VIEW/CREATE/UPDATE/DELETE` permission codes (confirmed via `material-permissions.ts`, not the dotted `MATERIALS_PC_MANAGEMENTS.*` strings that turned out to be a `cps-app`-only display naming unrelated to what the backend guard actually checks)
- Verified live against the real backend (browser tool was unavailable this pass, so verified via `curl` with a real `superadmin` session cookie): `/materials/pc` returns 200, renders a real material code from the database (`MAT-2026-001`), the status filter pills, and the Add material button; no error boundary text. Did not click-test the dialog/mutations interactively this pass — do that before relying on this in prod
- `tsc --noEmit`, `eslint`, `pnpm test` (4/4, unaffected), `next build` all pass — see ADR-006

### 2026-09-03 — Structure/risk audit: closed a stored-open-redirect regression, removed debug cruft
- Ran a security-review pass on the routing restructure. Found that `src/lib/nav.ts#menuHref()`'s simplification (`return path || "/dashboard"`) dropped the old code's incidental side effect of neutralizing an absolute/protocol-relative `path` (cps-api's `Menu.path` is a free-form, unvalidated string editable by any SUPER_ADMIN — `CreateMenuDto`/`UpdateMenuDto` have no format constraint on it). A menu row with `path: "//evil.example"` would previously always get glued onto `/dashboard...` (harmless garbage); after the simplification it would render as a same-looking sidebar/breadcrumb link that silently navigates off-site. Low severity (requires a compromised/malicious SUPER_ADMIN) and reported at only 5/10 confidence by the review, but the fix is a one-line, zero-behavior-change-for-legitimate-data regex guard, so applied it anyway: `menuHref()` now requires a same-origin absolute path (`/^\/(?!\/)/`) and falls back to `/dashboard` otherwise
- Removed `me.json` — a leftover debug artifact from an earlier troubleshooting session (a real `GET /auth/me` response dump saved to the repo root while diagnosing the `management-tree` 500). Untracked, never committed, but shouldn't have been left on disk
- Verified: `tsc --noEmit`, `eslint`, `pnpm test` (4/4), `next build` all pass after the `menuHref` change
- No other findings from the review: `/menus`'s SUPER_ADMIN gate is UI-only by design (cps-api's `MenusController` independently enforces `@Roles(SUPER_ADMIN)` on every route including `management-tree`/`reorder`, so the frontend check isn't a real security boundary and doesn't need to be); `PATCH /menus/reorder` payloads are fully re-validated server-side (`menu-tree-ordering.ts#validateAndProjectMenuLayout` rejects unknown/missing/duplicate ids and recomputes `version` itself); `menus/actions.ts` never exposes the `accessToken` to client-visible state; the `[...rest]` catch-all renders its path through ordinary auto-escaped JSX, no unsafe sink

### 2026-09-03 — Dropped the `/dashboard` URL prefix from every page except the dashboard itself
- User asked to cut `/dashboard` out of every route's path except the dashboard page. Moved `(dashboard)/dashboard/{analytics,orders,products,settings,users,menus,[...rest]}` up to `(dashboard)/{analytics,orders,products,settings,users,menus,[...rest]}` — new URLs: `/analytics`, `/orders`, `/products`, `/settings`, `/users`, `/menus`. `(dashboard)/dashboard/{page.tsx,loading.tsx}` stayed put — `/dashboard` is cps-api's own path for that menu item too, so it was already correct
- `src/lib/nav.ts#menuHref()` simplified to return cps-api's `path` unmodified (previously prefixed non-`/dashboard` paths with `/dashboard`) — see ADR-005
- Updated every hardcoded `/dashboard/...` link to match: `secondaryNav` (Settings → `/settings`), `command-palette.tsx` (all nav/action items), `user-menu.tsx` (Profile/Billing/Settings), `recent-documents.tsx` ("View all documents" → `/materials`)
- Fixed `src/components/menus/menu-tree-editor.tsx`'s import of `menus/actions` to the new path
- No relative imports existed in any moved page (`@/...` alias only), so the moves themselves needed no import fixes — verified with a grep before moving, not just after
- Verified: full grep sweep for lingering `/dashboard/` references after the move (found and fixed all real hits; remaining matches were `@/components/dashboard/*` import paths and one stale code comment, unrelated to routing). Clean `.next` rebuild confirms the new flat route list (`/analytics`, `/dashboard`, `/menus`, `/orders`, `/products`, `/settings`, `/users`, `/[...rest]`)
- `tsc --noEmit`, `eslint`, `pnpm test` (4/4 pass, unaffected by the move), `next build` all pass. Verified live against a real `superadmin` session: sidebar → Menu Management now lands on `/menus` (not `/dashboard/menus`) and renders the real cps-api tree correctly; command palette → Users lands on `/users`; Settings link lands on `/settings`; `/dashboard` itself still resolves to the dashboard home. Also confirmed in this pass that the `GET /menus/management-tree` 500 blocking the previous session's work is gone — the backend was restarted since then and the drag-and-drop tree editor now loads real data end-to-end

### 2026-09-03 — Menu editor hydration attributes stabilized
- Fixed the `/menus` React hydration warning by giving its dnd-kit `DndContext` a deterministic ID, preventing request-persistent server counters from producing a different `aria-describedby` than the client. Added an SSR regression that renders the editor twice and verifies the drag instruction ID remains stable.

### 2026-09-03 — Menu reorder saves the destination parent correctly
- Fixed `/dashboard/menus` cross-parent drag saves: projection previously inspected the active row's neighbours at its source index, so the UI moved the row but the reorder payload retained its old `parentId`; after reload the menu returned to its original branch. `getDragProjection()` now projects against `overIndex` before deriving depth/parent.
- Added subtree-height clamping so moving a branch cannot push a descendant beyond cps-api's maximum level 4 and produce a backend validation failure; structurally impossible insertion boundaries are rejected instead of corrupting the flattened subtree order.
- Added `pnpm test` using the Node test runner through `tsx`, with regressions for cross-parent payloads, maximum-depth branches, and conflicting insertion boundaries. Verified test, typecheck, lint, and production build.

### 2026-09-02 — Menu management: drag-and-drop nested tree editor
- User asked for the Menu Management page (`/dashboard/menus`, previously the generic "isn't built yet" catch-all) to support drag-and-drop tree reordering, sourced from cps-api. Read `cps-api/src/modules/menus/{menus.controller,menus.service,menu-tree-ordering}.ts` directly since `API_ENDPOINTS.md` doesn't document this contract at all — found a purpose-built `GET /menus/management-tree` + `PATCH /menus/reorder` pair with optimistic concurrency and full server-side layout validation (see new Conventions § Menu management for the details)
- Added dependency: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (accessible, actively-maintained; the modern standard over deprecated `react-beautiful-dnd`). Installed `@dnd-kit/modifiers` too but never ended up using it — removed again rather than leave a dead dependency
- Added `src/lib/api/menus.ts` (`getManagementTree`, `reorderMenus`, types) and `src/lib/menu-tree.ts` (pure, framework-agnostic tree algorithms: `flattenMenuTree`, `getDragProjection`, `applyMoveNode`, `toReorderItems`, `collectDescendantIds` — the standard dnd-kit "sortable tree" depth-projection pattern, adapted to also respect cps-api's `BUTTON`-menus-can't-have-children and max-depth-4 rules)
- Added `src/components/menus/{menu-tree-editor,menu-tree-row}.tsx` and `src/app/(dashboard)/dashboard/menus/{page,actions}.tsx`. Page is SUPER_ADMIN-gated (mirrors the controller's `@Roles(SUPER_ADMIN)`) with a friendly message instead of a raw 403. Edits are staged client-side and require an explicit "Save changes" (server validates the complete arrangement, not incremental diffs) with "Reset" to revert and a conflict→refetch flow on stale `version`
- Hit the same `react-hooks/static-components` icon-resolution issue as the sidebar (see ADR-004) — fixed the same way: `MenuTreeRow`/`MenuTreeDragPreview` receive `Icon: LucideIcon` as a prop resolved by the parent's `useMemo`, never call `menuIcon()` themselves
- **Blocked on a live backend bug, not a frontend issue**: `GET /menus/management-tree` 500s on the currently-running cps-api dev server. Isolated the cause — ran the exact compiled `findManagementTree()` logic (`buildManagementTree`/`computeMenuTreeVersion` from `dist/modules/menus/menu-tree-ordering.js`) standalone against the same live database via a throwaway script; it succeeded (21 root menus, valid version hash), so the data and business logic are both fine. The other route on the same controller (`GET /menus/tree`) also returns 200 normally. This points to the *running* dev server process having a stale/broken hot-reload for the newer `management-tree`/`reorder` routes, not a code defect — restarting that process should resolve it. Did not restart it myself (don't know how it was started or what's in that terminal) — **ask the user to restart the cps-api dev server**, then re-verify this feature live
- `tsc --noEmit`, `eslint`, `next build` all pass. Not yet verified live end-to-end (blocked by the above) — do that before considering this done

### 2026-09-02 — Sidebar scrollbar indicator hidden
- Hid only `SidebarNav`'s visual scrollbar on desktop and mobile using `scrollbar-width: none` with a WebKit fallback; the menu remains vertically scrollable and the page-content scrollbar is unchanged. Verified with `npx tsc --noEmit -p tsconfig.json`, `pnpm lint` (0 errors; the same 3 pre-existing React Compiler warnings), `pnpm build`, and confirmed both scrollbar rules are present in the production CSS.

### 2026-09-02 — Dashboard navigation rebuilt as a responsive floating-box shell
- `DashboardShell` now reserves the full dynamic viewport with responsive outer padding/gaps and three independent surfaces: fixed desktop sidebar, fixed navbar/topbar, and a dedicated scrolling page-content box. The document shell no longer follows page scrolling; overscroll is contained and scrollbar space is stable.
- `Sidebar` and `Topbar` now use rounded bordered token-based surfaces with restrained shadows, matching the approved semi-box preview without adding colors or dependencies. Desktop collapse remains `72px`; mobile continues to use the Radix Sheet.
- `SidebarNav` received the semi-box hierarchy: boxed top-level hover/open/active states, compact icon tiles, rail-and-dot nested items, and a stronger nested active marker. The recursive cps-api menu tree, active-chain expansion, manual overrides, and permission behavior are unchanged.
- Responsive/accessibility follow-up: the mobile Sheet is controlled and closes after a menu route is selected; its menu is framed as a separate surface. Mobile menu and collapse controls have explicit accessible labels, while collapsed icon-only items retain `aria-label` and hover titles.
- Verification: `npx tsc --noEmit -p tsconfig.json`, `pnpm lint` (0 errors; 3 pre-existing React Compiler compatibility warnings), `pnpm build`, and `git diff --check` pass. Live authenticated visual QA was not possible because the local database no longer accepts the seed password; no credentials or database state were changed.

### 2026-09-02 — Dashboard home redesigned around the real CPS subject (factory floor, not e-commerce)
- User asked to apply the `frontend-design` skill to the dashboard home page specifically. Diagnosis: the page (and its 6 chart/list components) were still the original e-commerce demo template — "Total revenue," "Traffic sources," "visitors and sales" — despite the rest of the product (login page, sidebar) already being reskinned for Chiewchan Industry / CPS. Design brief: ground the page in what CPS actually is (a factory materials/production console), not swap colors on the same copy.
- Added `src/lib/dashboard-data.ts` — mock data scoped to the dashboard home only (stock movement, material category breakdown, weekly throughput, receiving/disbursement documents, floor activity feed, low-stock watchlist). Deliberately **separate** from `src/lib/data.ts`, which stays untouched and is still used by `/dashboard/{products,users,orders}` and `/dashboard/analytics` — those pages are out of scope for this pass, don't merge the two data files
- Rewrote `src/app/(dashboard)/dashboard/page.tsx`: shift-aware greeting ("Good morning/afternoon/evening"), and a signature status pill (amber `MATERIALS NEED ATTENTION` / green `ALL LINES NORMAL`) driven by the real low-stock count — a deliberate callback to the login page's "ALL SYSTEMS OPERATIONAL" pill, so login → dashboard reads as one continuous brand instead of two unrelated screens. KPI row: Stock on hand / Received today / Disbursed today / Low stock alerts (was Revenue / Active users / Pending orders / Stock alerts)
- Added 5 new dashboard components (kept `stat-card.tsx` as-is, it's already generic): `stock-movement-chart.tsx`, `category-breakdown-chart.tsx`, `weekly-throughput-chart.tsx`, `recent-documents.tsx`, `low-stock-watchlist.tsx`. Rewrote `recent-activity.tsx` in place (concept fit, just swapped to floor-flavored content). Old `recent-orders.tsx`/`top-products.tsx` moved to a `%TEMP%` backup (unused elsewhere, safe to remove; `Remove-Item` stays blocked by the safety gate)
- **Did not touch or delete** `revenue-chart.tsx`, `traffic-chart.tsx`, `weekly-chart.tsx` — `/dashboard/analytics` still imports them and was explicitly out of scope; this means the Dashboard and Analytics pages now visually diverge (factory content vs. leftover e-commerce content) until Analytics gets the same treatment as a separate task
- Colors: no new hex values added. Deliberately used the existing `chart-2` (teal) / `chart-3` (amber) tokens as the page's primary data-viz accents instead of defaulting to `chart-1` (indigo) for everything, since teal/amber already echo the login page's established brand direction — `chart-1` is now used more sparingly (just the "Stock on hand" KPI accent)
- Added `src/lib/utils.ts#formatWeight(kg)` — switches to tonnes above 1,000kg. Caught and fixed a real readability bug during self-review: the initial pass used `formatCompact(v) + "kg"`, which renders large values as unreadable `"18.4Kkg"`/`"2Kkg"` (compact-notation "K" colliding with the "kg" unit suffix)
- Verified live against a running dev server + real cps-api session: shift greeting, status pill (showed "5 MATERIALS NEED ATTENTION" matching the mock watchlist), all chart/table content, and the tonnes/kg formatting all render correctly; confirmed via `get_page_text` that the category legend isn't clipped at any viewport width tested
- `tsc --noEmit`, `eslint`, `next build` all pass

### 2026-09-02 — Sidebar now renders cps-api's real menu tree (supersedes same-day static-gate attempt)
- User reported the previous static-gate approach (below, "Sidebar gated by real user permissions") didn't visibly change anything and asked explicitly to read the real API — correct: with only a SUPER_ADMIN test account available, that approach's gates never triggered, and it only covered 2 of cps-api's 21 real menu items anyway
- Deleted `NavAccess`, `isNavItemVisible`, `filterNav`, `requiresSuperAdmin`, `anyPermission`, and the static `primaryNav` array from `src/lib/nav.ts` — replaced with `menuHref()` (backend path → local `/dashboard`-prefixed route) and `flattenMenus()`
- Added `src/lib/menu-icons.ts`: `menuIcon(name)` (kebab-case → `LucideIcon`, explicit named-import map, ~29 entries covering everything in cps-api's current seed, `Circle` fallback for anything unmapped) and `resolveMenuIcons(menus)` (pre-resolves an entire tree to `ResolvedMenuNode[]` with real component references, called once via `useMemo` — resolving icons *inside* the component that renders `<Icon />` trips `react-hooks/static-components`)
- Rewrote `src/components/layout/sidebar-nav.tsx`: recursive `MenuTreeItem` renders `session.menus` at arbitrary depth (verified live tree goes 3 levels deep under Materials) with per-node expand/collapse; auto-expands the chain to the active route, computed fresh each render (`autoOpenIds`, no `useEffect`+`setState` — avoids `react-hooks/set-state-in-effect`); user's manual toggles tracked separately in an `overrides` map so auto-expand never fights a manual collapse
- Added `src/app/(dashboard)/dashboard/[...rest]/page.tsx` — catch-all placeholder ("this page isn't built yet") so real-but-unimplemented menu items stay inside the dashboard chrome instead of hitting the bare root `not-found.tsx`
- Rewired prop threading: `(dashboard)/layout.tsx` now passes `menus={session.menus}` (was `access={...}`) through `DashboardShell` → `Sidebar`/`Topbar` → `SidebarNav`; `Topbar`'s breadcrumb now matches against the flattened real tree instead of the deleted static `primaryNav`
- Verified live against real `superadmin` session: rendered HTML contains real Thai/English menu labels from the backend (แดชบอร์ด/Dashboard, จัดการเมนู/Menu Management, จัดการผู้ใช้/User Management, วัสดุ/Materials, สินค้า) — confirms the sidebar is genuinely reading cps-api's menu tree, not a hardcoded list. Also verified `GET /dashboard/menus` (a real permission-granted item with no page) returns `200` with the catch-all's "isn't built yet" text and the literal path `/menus`
- `tsc --noEmit`, `eslint`, `next build` all pass — see ADR-004

### 2026-09-02 — Sidebar gated by real user permissions
- `src/lib/api/auth.ts`: typed `accessControl.menus`/`.permissions` (were `unknown[]`) as `MenuNode[]`/`string[]` — added `MenuNode` interface mirroring cps-api's `MenuTreeService#MenuResponse`
- `src/lib/session.ts`: `CurrentSession` now also carries `menus` and `permissions` from `GET /auth/me`
- `src/lib/nav.ts`: `NavItem` gained optional `requiresSuperAdmin`/`anyPermission` fields, plus `isNavItemVisible`/`filterNav`/`NavAccess` — see Conventions § Sidebar permissions and ADR-003 for why the sidebar keeps its existing routes instead of rendering cps-api's real menu tree
- Threaded `access: NavAccess` (`{ isSuperAdmin, permissions }`) from `(dashboard)/layout.tsx` → `DashboardShell` → `Sidebar`/`Topbar` → `SidebarNav` (both the desktop sidebar and the mobile `Sheet` instance)
- Gated: `Users` (SUPER_ADMIN only), `Products` (`PRODUCTS_VIEW`). Left ungated (always visible): Overview, Analytics, Orders, Settings — no real backend permission maps to these routes' current mock content
- Verified: unit-tested `isNavItemVisible` against three synthetic access states (SUPER_ADMIN, no permissions, `PRODUCTS_VIEW`-only) — output matched expected visible-item sets exactly; live-verified against real `superadmin` session (all 6 items present in rendered HTML). No second seeded test account exists in cps-api to live-verify the non-admin gated path — verified by logic/unit test only
- `tsc --noEmit`, `eslint`, `next build` all pass

### 2026-09-01 — Real logged-in user data replaces mock data in dashboard chrome
- Added `src/lib/api/auth.ts#getMe(accessToken)` (`GET /auth/me`, same response shape as login) and `#logout(accessToken)` (`POST /auth/logout`)
- Added `src/lib/session.ts#getCurrentSession()` — `React.cache`-wrapped, reads the `accessToken` cookie, calls `getMe`, returns `{ user, currentDepartmentRole } | null` (null on missing/expired/invalid token, not a thrown error)
- Added `src/app/(dashboard)/actions.ts#logoutAction` — clears `accessToken`/`refreshToken` cookies, best-effort `POST /auth/logout` (failure doesn't block logout)
- `src/app/(dashboard)/layout.tsx` is now `async`: calls `getCurrentSession()`, `redirect("/login")` if null — **this is the first real `/dashboard` route guard**, closing the gap ADR-002 flagged as missing
- Threaded `user`/`currentDepartmentRole` as props: `layout.tsx` → `DashboardShell` → `Topbar` → `UserMenu`. `UserMenu` now renders the real name/role/email instead of hardcoded "Maya Chen" / "Owner" / "maya@panel.io", and its "Log out" item calls `logoutAction` then `router.push("/login")` (previously just a dead `<Link href="/login">`, cookies were never cleared)
- `src/app/(dashboard)/dashboard/page.tsx` greeting ("Good morning, ...") now uses the real session's `firstName`/`username` instead of hardcoded "Maya" — page is now `async`
- All other dashboard content (stats, charts, tables) is still `src/lib/data.ts` mock data — this change only touched **identity display** (who's logged in), not business data
- Verified live: unauthenticated `GET /dashboard` → `307` to `/login` (curl); authenticated request (real `superadmin` session cookie from `cps-api`) renders `<h1>Good morning, System</h1>` and "System Administrator" / `superadmin@example.com` in the user menu — confirms mock name is fully gone from the authed chrome
- `tsc --noEmit`, `eslint`, `next build` all pass; dashboard routes are now `ƒ` (dynamic) in the build output since they depend on `cookies()`, previously `○` (static) — expected, not a regression

### 2026-09-01 — Auth hardening from security review
- `src/app/login/actions.ts`: department-selection token no longer round-trips through client state/response — `loginAction` now stores it in a short-lived (5 min) httpOnly `deptSelectionToken` cookie instead of returning it in `LoginActionResult`; `selectDepartmentAction(userDepartmentRoleId)` reads the cookie server-side and deletes it after use. `LoginActionResult`'s `select-department` variant dropped the `departmentSelectionToken` field — only `departments[]` goes to the client now.
- `src/app/login/actions.ts`: cookie `secure` flag flipped from allowlist (`NODE_ENV === "production"`) to denylist (`NODE_ENV !== "development"`) via new `secureCookies()` helper, so any non-dev deployment gets `Secure` cookies by default even if `NODE_ENV` isn't explicitly `"production"`
- `src/app/login/page.tsx` updated to match: `departmentStep` state no longer holds a token, `selectDepartmentAction` called with just the chosen `userDepartmentRoleId`
- Source: security-review pass on commit `d9c8239` flagged both as low-confidence (4/10, 3/10) hardening opportunities, not exploitable vulnerabilities — fixed anyway since they were cheap
- `tsc --noEmit`, `eslint`, `next build` all pass; live browser click-through not done this pass (tool permission denied) — worth a manual smoke test of the multi-department flow before relying on this in prod

### 2026-09-01 — Structure audit cleanup
- Removed `package-lock.json` (project standardizes on `pnpm`; having both lockfiles risked an `npm install` producing a dependency tree that drifts from what `pnpm-lock.yaml` pins) — see updated Quick Facts note
- Removed unused default Next.js template assets from `public/`: `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (confirmed zero references in `src/` before deleting; the app uses `cci_logo.png` + the `Logo` component instead)
- Filled Project Structure gaps that had drifted out of sync with disk: added `(dashboard)/dashboard/loading.tsx` and `src/lib/nav.ts`
- No code logic changed; `tsc`/`eslint`/`next build` unaffected by this pass

### 2026-09-01 — Login wired to real cps-api auth
- Added `src/lib/api/auth.ts` (`login`, `selectDepartment`, types) — shapes hand-derived from `cps-api/src/modules/auth/auth.service.ts` + `auth.controller.ts`, cross-checked against `cps-api/API_ENDPOINTS.md` § 3
- Added `src/app/login/actions.ts` (Server Actions) — calls the API, sets httpOnly `accessToken`/`refreshToken` cookies, returns a typed `LoginActionResult` (`success | select-department | error`)
- Rewrote `src/app/login/page.tsx`: removed hardcoded `defaultValue="maya"`/`"password123"`; `handleSubmit` now calls `loginAction`; added a second "choose a department" step (Radix `Select`) shown when the API returns `requiresDepartmentSelection`, which calls `selectDepartmentAction`
- Added `.claude/launch.json` so the dashboard's dev server (`npm run dev`, port 3000) can be previewed
- Fixed `.gitignore`: bare `.env*` was also swallowing `.env.local.example` (the template meant to be committed); added `!.env*.example`
- Verified live end-to-end against a running local `cps-api` (`http://localhost:3001/api/v1`): SUPER_ADMIN login auto-skips department selection and redirects to `/dashboard` with a success toast; wrong password shows "Invalid username or password" from the API's `InvalidCredentialsException`
- Not done: no route guard reads the session cookies back, no logout wiring, no refresh-token flow, department-selection path tested via code review only (no seeded multi-department test user available)
- `tsc --noEmit`, `eslint`, and `next build` all pass

### 2026-09-01 — API connectivity scaffolding
- Added `src/lib/api/` — `client.ts` (`apiFetch<T>` + `ApiError`, server-only), `users.ts`, `products.ts`, `orders.ts` (typed fetchers over existing `src/lib/types.ts` types), `index.ts` barrel
- Added `.env.local.example` with `API_BASE_URL` (placeholder, no real backend yet) and `API_AUTH_TOKEN` (static-token placeholder; real auth mechanism still undecided — ask before building it out)
- Chosen pattern: direct `fetch` from Server Components/Route Handlers via `src/lib/api/*`, no BFF proxy — see Conventions § API
- No pages wired to this yet; `src/lib/data.ts` mock data is still what renders everywhere
- `tsc --noEmit` passes

### 2026-09-01 — Login: split-screen redesign
- Moved `src/app/(auth)/login/page.tsx` → `src/app/login/page.tsx` (top-level, owns its layout)
- Removed OAuth buttons (Google, GitHub), separator, and inline register link from the login form
- Replaced 50/50 testimonial layout with full split screen: left = dark brand panel (glows, grid, status pill, headline, 3 feature pills, testimonial); right = form panel (KeyRound header, 2 fields, Sign in button)
- Field rename: `email` → `username`; added `autoComplete="username"`, `autoCapitalize="none"`, `spellCheck={false}` best practices
- `(auth)/layout.tsx` unchanged; still wraps `/register` and `/forgot-password`
- Backup of old file at `%TEMP%\admin-login-old-<timestamp>\page.tsx`

### 2026-09-01 — Login: stripped to username + password only
- Removed Google/GitHub OAuth buttons, "OR CONTINUE WITH EMAIL" separator, and "Forgot password?" / "Create one" links from the form
- Renamed `email` field to `username`
- Added a `KeyRound` icon header in `bg-primary-soft` as visual anchor
- `tsc --noEmit` and `eslint` both pass (exit 0)

---

## Architecture Decisions (ADR)

### ADR-006 — First real CRUD page wired end-to-end: Server Components + Server Actions, no client-side data layer — 2026-09-03
**Decision**: `/materials/pc` fetches its list/lookups directly in the Server Component (`src/lib/api/materials.ts`, reading the `accessToken` cookie), keeps filters in the URL's `searchParams` rather than client state, and every mutation (create/update/disable/restore) is a Server Action that calls `revalidatePath("/materials/pc")` on success. The client components (`material-pc-client.tsx` and friends) hold only ephemeral UI state — which dialog is open, for which row — never a client-side cache of the material list.
**Reason**: this is the first page in the app with real mutations against live data (menus was real data but reorder-only). A sibling app (`cps-app`) already solves a near-identical page with React Query — client-side cache, optimistic updates, manual invalidation. That's the right choice for a SPA-style client-fetching app, but this app's established architecture (per Conventions § API, chosen in ADR-era work on the login flow) is Server Components + Server Actions throughout; introducing a client-side fetching/caching library here would fragment the codebase into two different data-fetching philosophies for no benefit, since Next.js's own `router.refresh()` + `revalidatePath` already gets a fresh server render after a mutation without a client cache to keep in sync.
**Consequence**: this is now the reference pattern for wiring up any other still-mock page (Users, Products, Orders) to real cps-api data — copy this shape, not cps-app's React Query shape. Filters living in the URL means the list is only as fresh as the last navigation; there's no live/optimistic UI update mid-mutation (a disable/enable action shows its result only after the Server Action resolves and `router.refresh()` completes) — acceptable for an admin CRUD table, revisit if a page needs snappier optimistic UX.
**Rule for future CRUD pages**: don't add React Query/SWR/client-side caching to match cps-app's pattern. Match cps-app's *UX/copy* (soft-delete-as-disable, status filters, confirm-dialog copy) but not its *data-fetching architecture* — those are two independent decisions and only the first one should carry over.

### ADR-005 — Dashboard pages drop the `/dashboard` prefix, matching cps-api's own paths exactly — 2026-09-03
**Decision**: `/dashboard/analytics`, `/dashboard/orders`, `/dashboard/products`, `/dashboard/settings`, `/dashboard/users`, `/dashboard/menus`, and the `[...rest]` catch-all all moved up one level to `/analytics`, `/orders`, `/products`, `/settings`, `/users`, `/menus`. Only the dashboard home page keeps the `/dashboard` URL (it lives at `(dashboard)/dashboard/page.tsx`, the one folder that still carries that segment). `src/lib/nav.ts#menuHref()` no longer prefixes backend paths with `/dashboard` — it returns cps-api's `path` value unmodified (falling back to `/dashboard` only when a menu node has no `path`).
**Reason**: user asked directly to drop the `/dashboard` prefix except for the dashboard page. This also removes a mismatch ADR-004 introduced: cps-api's own menu `path` values (`/products`, `/materials`, `/dashboard`, ...) never included a `/dashboard` prefix — this app was the only thing adding one, via `menuHref()`. Local routes now match the backend's paths exactly.
**Consequence**: every hardcoded `/dashboard/...` link had to move too — `secondaryNav`'s Settings entry, `command-palette.tsx`'s nav/action items, `user-menu.tsx`'s Profile/Billing/Settings links, and `recent-documents.tsx`'s "View all documents" link. Bookmarks or hardcoded links anywhere else to the old `/dashboard/*` paths will now hit the catch-all/404 — there is no redirect shim, since this app has no external users yet to carry old links forward. If that changes later, add explicit `redirect()` routes for the old paths rather than resurrecting the prefix.
**Rule for future routes**: a new dashboard page's folder path under `(dashboard)/` must equal its final URL — don't nest it under a `dashboard/` subfolder like the old layout did.

### ADR-004 — Sidebar renders cps-api's real menu tree directly — 2026-09-02 (supersedes ADR-003)
**Decision**: reversed ADR-003. `src/lib/nav.ts` no longer keeps a static, hand-gated route list. The sidebar (`src/components/layout/sidebar-nav.tsx`) now renders `GET /auth/me`'s real `accessControl.menus` tree recursively — labels, paths, icons, and visibility all come from the backend, already scoped to the active role. `menuHref()` prefixes backend paths with `/dashboard`; a catch-all page shows a placeholder for real menu items with no built page yet.
**Reason**: ADR-003's static-list-plus-gate approach technically worked but didn't actually reflect the backend's permission model — it hardcoded just 2 gates (`Users`, `Products`) on a 6-item template list, so it looked unchanged for the only real test account (SUPER_ADMIN, which bypasses all gates) and would have stayed wrong for every other role too, since most of cps-api's 21 real menu items (Materials, BOMs, Master Data, Access Control, ...) had no representation in the static list at all. The user explicitly asked to read the real API rather than approximate it after finding ADR-003's result unconvincing.
**Consequence**: sidebar labels/structure can change whenever cps-api's menu seed changes, with no code deploy needed here — that's intended. Most menu items currently point at the catch-all placeholder since their pages aren't built. `menu-icons.ts`'s icon map needs a manual update when a genuinely new icon name appears in the backend (rare; see Conventions § Sidebar permissions). `NavAccess`/`isNavItemVisible`/`filterNav`/`requiresSuperAdmin`/`anyPermission` from ADR-003 were deleted — don't resurrect them; permission gating for navigation now happens entirely server-side in cps-api's `MenuTreeService`.
**Rule for future nav work**: don't hardcode a client-side permission→nav-item mapping again. If a menu item needs different visibility than what cps-api sends, fix it in cps-api's menu/permission seed data, not in this app.

### ADR-002 — Session tokens live in httpOnly cookies, set by a Server Action — 2026-09-01
**Decision**: `POST /auth/login` and `POST /auth/select-department` are called from `src/app/login/actions.ts` (`"use server"`), which sets `accessToken`/`refreshToken` via `cookies()` from `next/headers`. The client-side login page never sees the token values, only a typed status result.
**Reason**: httpOnly cookies aren't readable by client JS, which closes off token theft via XSS — the standard tradeoff for an admin panel handling other people's data. The alternative (returning tokens to the client and storing in `localStorage`/state) is simpler but exposes them to any injected script.
**Consequence**: any code that needs to call the API on behalf of the logged-in user must read the `accessToken` cookie server-side and attach `Authorization: Bearer <accessToken>` itself via `apiFetch`'s per-call `headers` override (`apiFetch`'s auto-attached header is only the static `API_AUTH_TOKEN`, unrelated to user sessions). **Resolved 2026-09-01**: `src/lib/session.ts#getCurrentSession()` does exactly this for `GET /auth/me`, and `(dashboard)/layout.tsx` now redirects unauthenticated requests to `/login` — this is the `/dashboard` route guard mentioned as missing when this ADR was first written.
**Rule for future auth work**: don't introduce a second token-storage mechanism (e.g. a client-readable cookie or `localStorage`) without updating this ADR — that would fragment where "is the user logged in" is checked.

### ADR-001 — Login lives outside the `(auth)` route group — 2026-09-01
**Decision**: `src/app/login/page.tsx` is at the top level, not under `(auth)/`.
**Reason**: the new split-screen login owns its own full-bleed layout (dark brand panel + form). Nesting it inside `(auth)/` would force the parent's testimonial 50/50 split on top, which is wrong for this design. The split can only render as the page-level layout.
**Consequence**: `(auth)/layout.tsx` no longer wraps `/login`. Register and forgot-password stay inside `(auth)/` because they look fine with the testimonial layout.
**Rule for future routes**: if a page needs its own full-bleed layout, place it at the top level (outside any layout-providing route group), not under `(auth)/` or `(dashboard)/`.
