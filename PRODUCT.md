# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Staff of Chiewchan Industry (CPS) who run the factory's materials and production flow, in five groups:
- Warehouse staff: receive and issue materials, scan box QR codes, pick against job orders.
- Production and planning: production plans, process orders, step-by-step production tracking with lot and QR traceability.
- Engineers and master-data owners: material and product registries, BOM and workflow versions, master data.
- Sales and delivery: sales orders, sales job orders (scan-pick, cut stock), delivery.
- System administrators (SUPER_ADMIN): users, departments, roles, permission matrix, menus, audit logs.

Devices are mixed: desktop at offices, tablets on the shop floor, with keyboard-wedge scanners for QR.

## Product Purpose

An internal admin dashboard over the cps-api backend. It controls materials stock (receive, issue, process), production planning and execution with full lot traceability, product engineering (BOM and workflow), sales and finished-goods stock, and access control. Success is accurate stock and traceability with few mistakes at the point of work.

## Positioning

An in-house system built around this factory's real flow: FIFO package-level reservations, box QR lineage from supplier lot to finished-product box, and per-department permissions. Generic ERP tools do not model that lot-to-box lineage.

## Operating Context

Work happens on documents (receiving, disbursement, job orders, production orders, sales orders) and printed QR labels (A4 sheets, 8 labels per page). Users are signed in for at most 4 hours; permissions follow department and role. See AGENTS.md for stack, routes and conventions.

## Capabilities and Constraints

- Next.js App Router, Server Components and Server Actions, Tailwind 4 tokens in globals.css, Radix primitives; reuse existing `components/ui/*`.
- One fixed "Navy Enterprise" theme, no dark mode; tokens only, never raw hex.
- All user-facing text in Thai; errors pass through the shared Thai error helper.
- Existing patterns (filters in URL, RowActionsMenu, ConfirmDialog, generic master-data pages) must be reused, not reinvented (AGENTS.md R4).

## Brand Commitments

Navy Enterprise palette (Primary Navy `#0F2747`, Accent Blue `#1769D1`), IBM Plex Sans Thai for UI text, Geist Mono for codes, CCI logo, Thai-language UI throughout.

## Evidence on Hand

Real data lives in the cps-api dev database. Do not fabricate customers, metrics or testimonials. The dashboard home still uses partly mock data from `lib/dashboard-data.ts`.

## Product Principles

- Accuracy over decoration: stock, lot and QR information must be unambiguous at a glance.
- Built for the shop floor: large touch targets, scanner-friendly inputs, clear status that never relies on color alone.
- One consistent pattern per kind of screen; reuse before inventing.
- Permission-aware: hide or explain what a role cannot do.

## Accessibility & Inclusion

Target WCAG 2.1 AA: contrast, labeled controls, visible focus, keyboard operation. Thai text must render with the project's Thai-capable font.
