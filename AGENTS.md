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
| Dates | `date-fns` |

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
└─ (dashboard)/                  # route group — authed area
   ├─ layout.tsx                 # server; getCurrentSession() + redirect("/login") guard, feeds DashboardShell
   ├─ actions.ts                 # "use server"; logoutAction — clears cookies, best-effort POST /auth/logout
   └─ dashboard/
      ├─ page.tsx                # dashboard home — greeting uses real session, not mock
      ├─ loading.tsx             # route-level Suspense fallback for /dashboard
      ├─ [...rest]/page.tsx      # catch-all placeholder for real-permission menu items with no page yet
      ├─ analytics/page.tsx
      ├─ orders/page.tsx
      ├─ products/page.tsx
      ├─ settings/page.tsx
      └─ users/page.tsx
```

```
src/
├─ components/
│  ├─ ui/                        # shadcn-style primitives (Button, Input, Label, Card, Table, Sheet, Dialog, Tabs, ...)
│  ├─ layout/                    # Logo, command palette, app shell
│  ├─ dashboard/
│  └─ orders/  products/  users/  settings/
├─ hooks/
└─ lib/                          # utils (cn), helpers, types, mock data
   ├─ nav.ts                     # menuHref()/flattenMenus() + secondaryNav (static, account-level only) — see Conventions § Sidebar permissions
   ├─ menu-icons.ts              # kebab-case cps-api icon name → LucideIcon map, resolveMenuIcons()
   ├─ session.ts                 # getCurrentSession() — server-only, React.cache-wrapped GET /auth/me, returns menus + permissions
   └─ api/                       # REST client — server-only, see Conventions § API
      ├─ client.ts               # apiFetch<T>() + ApiError, reads API_BASE_URL/API_AUTH_TOKEN
      ├─ auth.ts                 # login()/selectDepartment()/getMe()/logout() — mirrors cps-api /auth contract; MenuNode type
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

### State
- Default to **server components**. Add `"use client"` only when you need interactivity, hooks, or browser APIs.
- Use `useRouter` from `next/navigation` (not the deprecated `next/router`).

### API
- Backend is REST; base URL comes from `API_BASE_URL` (server-only env var, see `.env.local.example`). No public backend URL exists yet — placeholder only, fill in `.env.local` when one is available.
- Fetch **directly from Server Components** (Next.js 16 recommended pattern) via `src/lib/api/*` — no BFF proxy route handlers. Do not `fetch()` the backend ad-hoc from inside a component; add/extend a resource file in `src/lib/api/`.
- `src/lib/api/client.ts` exports `apiFetch<T>(path, init)`: prefixes `API_BASE_URL`, sets `Content-Type: application/json`, attaches `Authorization: Bearer ${API_AUTH_TOKEN}` if that env var is set, and throws `ApiError` (with `.status`/`.body`) on non-2xx.
- One file per resource (`users.ts`, `products.ts`, `orders.ts`), each returning the existing domain types from `src/lib/types.ts` — the API layer must not introduce parallel/duplicate types.
- `src/lib/data.ts` (mock generator) is untouched and still what pages currently render (except `/login`, see below). Swapping a page from mock data to `src/lib/api/*` is a separate, explicit task per page — don't do it silently as a side effect of unrelated work.

### Sidebar permissions — resolved, see ADR-004 (supersedes ADR-003)
- **The sidebar is now driven directly by cps-api's real menu tree**, not a static list. `src/lib/session.ts#getCurrentSession()` exposes `menus: MenuNode[]` from `GET /auth/me`'s `accessControl.menus` — already filtered server-side to the active role's real permissions (see `cps-api/src/modules/access-control/services/menu-tree.service.ts`). `src/components/layout/sidebar-nav.tsx` renders that tree recursively (arbitrary depth, expand/collapse per node).
- `src/lib/nav.ts#menuHref(path)` maps a backend path (e.g. `/materials`, `/products`) to a local route by prefixing with `/dashboard` (backend paths don't include it). `/dashboard` itself maps to `/dashboard`, not `/dashboard/dashboard`.
- `src/app/(dashboard)/dashboard/[...rest]/page.tsx` is a catch-all placeholder ("this page isn't built yet") for real, permission-granted menu items that don't have a page implemented — keeps the dashboard chrome instead of falling through to the bare root `not-found.tsx`. Only two real backend paths currently land on an actually-built page: `/dashboard` (real dashboard) and, coincidentally, `/dashboard/products` / `/dashboard/users` (still mock content, not wired to the real API — see below).
- `src/lib/menu-icons.ts#menuIcon(name)` maps cps-api's kebab-case `Menu.icon` (e.g. `"layout-dashboard"`) to a Lucide component via an explicit named-import map (not a blanket `import *`, to keep the bundle lean) — unmapped names fall back to a plain dot. **Add a new entry here whenever cps-api seeds a new menu icon**, or it'll render as a generic dot. `resolveMenuIcons()` pre-resolves an entire tree once (via `useMemo` in `SidebarNav`) — icons are intentionally resolved as data *before* being passed as props, not looked up inline inside the component that renders `<Icon />`, because the latter trips the React Compiler's "components created during render" lint rule (`react-hooks/static-components`).
- `secondaryNav` in `src/lib/nav.ts` (currently just `Settings`) stays a small static, always-visible list for account-level items with no cps-api menu equivalent — not permission-gated, since every logged-in user can reach their own settings regardless of role.
- **Known gap, unchanged from before**: a menu item being visible does not mean its page calls the real API — `/dashboard/products` and `/dashboard/users` still render `src/lib/data.ts` mock content regardless of what permission actually let the user click there. Wiring those pages to `src/lib/api/products.ts`/`users.ts` is a separate task.
- Before wiring a new page to a real cps-api module: check `resolveMenuIcons`/the live tree for the exact `code`/`path` cps-api actually sends (don't guess) — `API_ENDPOINTS.md` documents the REST contract but not the seeded menu catalog itself; the menu catalog can drift from the endpoint list.

### Auth (login) — resolved, see ADR-002
- Backend: `D:\project-cps\New\cps-api` (NestJS). Its `/auth` contract is documented in `D:\project-cps\New\cps-api\API_ENDPOINTS.md` § 3 — **re-read that file before touching auth code**, it is the source of truth for request/response shapes, not this section.
- `src/lib/api/auth.ts` types (`LoginSuccess`, `DepartmentSelectionRequired`, etc.) were hand-derived from `cps-api/src/modules/auth/auth.service.ts` (`buildAuthenticationResponse`) because the endpoint doc doesn't spell out the full success body. If cps-api's auth service changes shape, these types will drift silently (no shared schema) — re-check both files together.
- Login is a two-step flow driven by the API, not the client: `POST /auth/login` returns either a full session or `{ requiresDepartmentSelection: true, departmentSelectionToken, departments[] }` when the user has >1 active assignment (SUPER_ADMIN and single-assignment users always skip straight to a session). `src/app/login/page.tsx` renders a second "choose a department" step (Radix `Select`) and calls `selectDepartmentAction` when that happens.
- `src/app/login/actions.ts` (`"use server"`) is the only place that calls `src/lib/api/auth.ts`. It sets `accessToken`/`refreshToken` as **httpOnly** cookies (`sameSite: lax`, `secure` in production) via `cookies()` from `next/headers` — tokens never reach client JS. The login page calls these actions directly from a client-side event handler (not a `<form action>`), reads the typed result, and does its own `toast` + `router.push`.
- `API_AUTH_TOKEN` in `.env.local.example` is now dead for the login flow specifically (login doesn't need a pre-existing token) but stays as a fallback static-bearer option for any future endpoint that's called before a user session exists.
- **Resolved 2026-09-01 (see below):** session cookies are now read back out. `src/lib/session.ts#getCurrentSession()` (wrapped in `React.cache`) calls `GET /auth/me` with the `accessToken` cookie and returns `{ user, currentDepartmentRole } | null`. `(dashboard)/layout.tsx` calls it and `redirect("/login")`s if null — this is the `/dashboard` route guard. `src/app/(dashboard)/actions.ts#logoutAction` clears both cookies and best-effort calls `POST /auth/logout`.

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
