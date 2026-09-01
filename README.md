# Panel — Admin Dashboard Template

A full-featured admin dashboard template built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

## Features

- **Dashboard overview** — KPI cards, revenue/expense area chart, traffic donut chart, weekly bar chart, recent orders, recent activity feed, top products
- **Users** — searchable/sortable/paginated data table, role & status filters, bulk select + delete, add/edit dialog with validated form (react-hook-form + zod)
- **Products** — table and grid views, category/status filters, full CRUD with validated forms, auto stock-status
- **Orders** — table with status & payment filters, order details dialog with fulfillment timeline, mark as shipped / cancel actions
- **Analytics** — additional KPIs, category performance chart, conversion funnel
- **Settings** — tabbed profile, account preferences, notifications, security (password, 2FA, sessions), billing/invoices
- **Auth flow** — login, register, forgot password, split-screen branded layout
- **Command palette** (⌘K / Ctrl+K) for quick navigation and actions
- Light/dark mode (`next-themes`), collapsible sidebar, responsive mobile nav (sheet drawer), notifications dropdown, user menu
- Toast notifications (`sonner`), accessible Radix UI primitives throughout

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

## Project structure

```
src/
  app/
    (auth)/            # login, register, forgot-password + split layout
    (dashboard)/        # dashboard shell + all app pages
      dashboard/
        page.tsx         # overview
        users/
        products/
        orders/
        analytics/
        settings/
  components/
    ui/                # design-system primitives (button, card, table, dialog, ...)
    layout/            # sidebar, topbar, command palette, notifications, user menu
    dashboard/         # charts and widgets for the overview + analytics pages
    users/ products/ orders/ settings/   # feature-specific components
  lib/
    data.ts            # deterministic mock data (users, products, orders, charts)
    types.ts           # shared TypeScript types
    utils.ts           # cn(), formatters
    nav.ts             # sidebar navigation config
```

## Notes

- All data is generated in-memory (`src/lib/data.ts`) with a seeded random generator, so it's stable across reloads. Swap it for real API calls / a database of your choice.
- Auth pages simulate sign-in/sign-up (no real backend) — wire up your auth provider of choice.
- Fonts are self-hosted via the `geist` package (no external font requests at build time).
- Built with Tailwind v4's CSS-based theme config — see `src/app/globals.css` for all design tokens (colors, radii) in both light and dark mode.
