# Claude Handoff: Production Plan (แผนการผลิต)

> **Status: DESIGN COMPLETE / no code written yet**
>
> This handoff captures a fully-settled design produced via an interactive requirements-grilling session with the user (2026-09-22). Every open question below was explicitly resolved with the user — do not silently deviate from any decision here without re-confirming with them first. Nothing has been implemented yet: no entities, no migration, no module, no frontend page.

## Objective

Build a new feature, "แผนการผลิต" (Production Plan), that lets staff reserve raw materials ahead of an actual production run. A plan references one or more Products and their currently-ACTIVE BOM, gets approved (which reserves stock), and is either issued (which actually cuts the stock via a real Material Disbursement) or expires/cancels (which releases the reservation).

Read `CONTEXT.md` (repo root) first — it defines the canonical vocabulary (Production Plan, Plan Line, Reservation, Plan Status, Required Quantity, Issue) used throughout this handoff and should be used throughout the implementation (code comments, variable names, UI copy). Read `docs/adr/0001-production-plan-reservations-block-disbursement.md` next — it explains why the reservation must be *hard* (blocks ordinary Disbursement too), which is the single most invasive part of this feature.

## Repositories

- Backend: `D:\project-cps\New\cps-api`
- Frontend: `D:\project-cps\New\admin-dashboard`

Read each repository's own instructions before editing (`admin-dashboard/AGENTS.md` is canonical for the frontend and requires updating after every non-trivial change — see its R1/R2 rules). For Next.js work, read the relevant installed Next 16 guide under `node_modules/next/dist/docs/` before writing code, per that file's own top-of-file instruction.

## Facts confirmed before designing (re-verify if stale)

- No "reserved"/"allocated"/"committed" stock concept exists anywhere in cps-api today. `stock_balances` has exactly one quantity column (`quantity`, unique-indexed per `material_id` — **no location/warehouse dimension**, confirmed by reading the entity directly). `MaterialReceivingPackage` has `quantity` (immutable) and `remaining_quantity` (live). Building the Reservation concept is greenfield.
- `materials-disbursement.service.ts#processFifoForItem` is the existing FIFO traversal (oldest-lot-first against `remainingQuantity`) that Production Plan's own reservation-time FIFO check should reuse/mirror, not reinvent.
- `product_boms`/`product_bom_items` (`src/entities/master/product-bom.entity.ts`) — a `ProductBom` is versioned (DRAFT/ACTIVE/INACTIVE); each `ProductBomItem` has `materialId`, `quantity` (**per one unit of product**, not a fixed total), `unitId`, `isScrap`, `wastagePercent` (nullable).
- No production-plan/work-order/manufacturing-order module exists anywhere in cps-api — this is a brand-new module.
- No scheduling/cron mechanism exists in cps-api at all (`@nestjs/schedule` is not a dependency, zero `@Cron`/`@Interval` usage anywhere). This feature is the first one that needs it.
- `Product.lotSize`/`Product.packing` exist and auto-derive `safetyStock`/`minStock` — relevant only as a UI hint, not a hard constraint (see decisions below).

## Domain decisions (all confirmed with the user — do not relitigate)

1. **Lifecycle**: `DRAFT → APPROVED (reserved via FIFO) → ISSUED (real Disbursement created)`, with `CANCELLED` (manual, reason required) and `EXPIRED` (automatic, system-generated reason) as terminal states reachable from `APPROVED` (and `DRAFT` for manual cancel — `DRAFT` has no reservation to release, so cancelling it is trivial).
2. **Multi-line plans**: one Plan has many Plan Lines (Product + quantity + need-by date each), not one product per plan. Mirrors Materials Disbursement's item-row shape.
3. **Reservation granularity**: FIFO **lot-level**, computed and locked in at `APPROVED` time — not a bucket total. Reuse the existing FIFO traversal from `materials-disbursement.service.ts`.
4. **BOM version**: only a product's current `ACTIVE` BOM may be used. No `ACTIVE` BOM → block adding that line, with a clear error. Never fall back to `DRAFT`.
5. **Required quantity formula**: `plan quantity × bomItem.quantity`, summed across every `ProductBomItem` where `isScrap = false`. **Explicitly excludes `wastagePercent`** and **explicitly excludes `isScrap = true` items** (scrap/byproduct rows are outputs of production, not inputs to reserve). Both exclusions were explicit user decisions — do not "helpfully" add wastage back in.
6. **Plan quantity**: freeform positive integer, not constrained to be a multiple of `Product.lotSize`. Show `lotSize` as a UI hint only.
7. **Approval**: whole-plan, all-or-nothing. Check every line's every material at once; if any material anywhere in the plan is short, block the entire approval (no partial-line approval).
8. **Editability**: `DRAFT` plans are freely editable (add/remove/edit lines). `APPROVED` plans are **immutable** — to change anything, cancel (which releases the reservation) and create a new plan. Do not build an edit-after-approve flow.
9. **Cancellation**: manual cancel requires a mandatory reason field (mirror the existing cancel-with-reason pattern from Materials Receiving/Disbursement's cancel dialogs — a `Textarea`, not `ConfirmDialog`, since that primitive has no text field slot). Auto-expiry (see #12) needs no user-entered reason; store a system-generated string instead (e.g. "หมดอายุอัตโนมัติ (เกิน 3 วันหลังอนุมัติ)").
10. **ISSUED plans cannot be cancelled from the Plan page.** To undo an issued plan, the user must cancel the linked Material Disbursement directly on its own page (`/materials/materials-disbursement`). The Plan's own status does not auto-sync back when the linked Disbursement is later cancelled there — it's a fire-and-forget link for traceability, not a live-synced state machine.
11. **Cross-link to Disbursement**: add a nullable `productionPlanId` (or `productionPlanLineId`, see open question below) FK on the Materials Disbursement entity/table. Populated only when a Disbursement was created via a Plan's "Issue" action; `null` for every ordinary disbursement, which is the existing, unaffected majority case.
12. **Auto-expiry job**: add `@nestjs/schedule` (first scheduled job in this codebase) and run a cron every hour that finds every `APPROVED` plan where `approvedAt + 3 days < now()`, releases its reservation, and flips it to `EXPIRED`.
13. **Permissions**: three separate permission codes — `PRODUCTION_PLAN_CREATE`, `PRODUCTION_PLAN_APPROVE`, `PRODUCTION_PLAN_ISSUE` (plus the usual `_VIEW`/`_DELETE`-for-draft as needed, following this app's established per-action permission-splitting convention — see Materials Disbursement's CREATE/CONFIRM/CANCEL split in `admin-dashboard/AGENTS.md`). **No maker-checker enforcement in code** — same user is allowed to both create and approve; that's a role-assignment/process decision left to the organization, not a backend guard.
14. **Plan code format**: `PP-{YYYYMM}-{4-digit sequence}`, e.g. `PP-202609-0001`. Sequence resets or continues per your choice of counter-table design (mirror the existing lot-counter pattern in `materials-receiving`'s lot code generation for the mechanism, but note the *format itself* is different — simpler, no month-letter-code scheme).
15. **Excel import**: one uploaded file = one Plan; every row in the file = one Plan Line. Columns: **Product Code, Quantity, Need-by Date, Remark**. The BOM is never read from the file — always resolved server-side from the product's current ACTIVE BOM, so a stale spreadsheet can never reference an outdated BOM.
16. **Need-by date**: lives at the **Plan Line** level (per product), not the Plan header. The Plan header itself only needs a code, optional title/remark, status, and the approval/issue/cancel audit fields (who/when).
17. **Hard reservation (the big one — see ADR-0001)**: a Plan's reservation must actually block ordinary Material Disbursement from consuming the same reserved lots. This requires modifying `materials-disbursement.service.ts`'s FIFO availability calculation (used both by plan-less disbursement creation *and* by Plan's own reservation-time check) to compute availability as `remainingQuantity minus quantity currently held by other active Production Plan reservations`, not `remainingQuantity` alone. This is a real, non-additive change to existing, shipped code — not just new isolated module code. Concurrent-approval races (two plans competing for the same lots) need the same `pessimistic_write` row-locking pattern the Disbursement confirm/cancel flow already uses, applied to Plan approval too.

## Suggested backend shape (cps-api) — not yet built

```text
src/modules/production-plans/
  dto/
    create-production-plan.dto.ts
    update-production-plan.dto.ts   (DRAFT-only fields)
    import-production-plan.dto.ts   (multipart Excel upload)
    list-production-plans-query.dto.ts
  production-plans.controller.ts
  production-plans.service.ts
  production-plans.module.ts
  production-plan-expiry.job.ts     (the @Cron handler)
  production-plan-permissions.ts
```

New tables (design the exact columns; this is a suggested shape, not a locked schema):

- `production_plans` — id, code (`PP-YYYYMM-NNNN`, unique), status, remark, createdBy/At, approvedBy/At, issuedBy/At, cancelledBy/At, cancelReason (nullable, required when status=CANCELLED), `updatedAt` for optimistic concurrency (mirror the pattern every other CRUD resource in this app already uses).
- `production_plan_lines` — id, `productionPlanId` FK, `productId` FK, `bomId` FK (the ACTIVE BOM resolved and pinned at line-creation time — pin it so a later BOM change doesn't retroactively alter an already-approved plan's math), `quantity`, `needByDate`, `remark`.
- `production_plan_reservations` — the ledger: id, `productionPlanLineId` FK, `materialReceivingPackageId` FK, `reservedQuantity`, `createdAt`, `releasedAt` (nullable — set on cancel/expire/issue-consumption). This table is what both Production Plan's own availability check *and* the modified Disbursement FIFO query need to sum against.
- Add `production_plan_id` (nullable FK) to the Materials Disbursement table.

API surface (suggested):

- `POST /production-plans` — create DRAFT (manual entry, lines inline in the body)
- `POST /production-plans/import` — create DRAFT from an uploaded Excel file (multipart)
- `PATCH /production-plans/:id` — edit a DRAFT (lines/remark), rejected with 409 if not DRAFT
- `GET /production-plans`, `GET /production-plans/:id` — list/detail
- `POST /production-plans/:id/approve` — runs the all-or-nothing stock check + FIFO reservation; 409/422 with a per-material shortfall breakdown if insufficient
- `POST /production-plans/:id/issue` — consumes the reservation, creates the real Disbursement, sets `production_plan_id` on it
- `POST /production-plans/:id/cancel` — requires `{ reason }`, releases reservation
- `DELETE /production-plans/:id` — only for DRAFT (hard delete is fine here, nothing was ever reserved)

## Suggested frontend shape (admin-dashboard) — not yet built

Route: `src/app/(dashboard)/production/plans/` (new top-level segment under `(dashboard)/`, matching this app's ADR-005 convention of the folder path equalling the URL — confirm the exact path once cps-api's menu seed exists for it, per the sidebar-permissions convention in `AGENTS.md`).

```text
src/components/production-plans/
  production-plan-client.tsx
  production-plan-filters.tsx        (canonical filter architecture — see AGENTS.md § Materials PC advanced filter redesign; reuse ui/search-input.tsx, ui/filter-dropdown.tsx, ui/filter-chip.tsx)
  production-plan-table.tsx
  production-plan-form-dialog.tsx    (manual entry — multi-line item rows, mirrors materials-disbursement-form-dialog.tsx's repeatable-row shape)
  production-plan-import-dialog.tsx  (Excel upload)
  production-plan-approve-dialog.tsx (shows the per-material shortfall breakdown on failure)
  production-plan-cancel-dialog.tsx  (required-reason Textarea, same shape as materials-receiving-cancel-dialog.tsx / materials-disbursement-cancel-dialog.tsx)
  production-plan-details-dialog.tsx
src/lib/api/production-plans.ts       (server-only client, follow src/lib/api/client.ts#apiFetch convention)
src/lib/filters/production-plans-filters.ts
src/app/(dashboard)/production/plans/{page.tsx,actions.ts}
```

Follow this app's established, non-negotiable conventions (see `AGENTS.md`'s R4 "reuse existing structure" rule) — this is **not** a simple-master resource, so it does **not** go through the generic master-data descriptor system; it's a complex CRUD page like Materials PC/Products/Materials Disbursement:

- Server Component fetches list/lookups directly; filters live in the URL; mutations are Server Actions calling `revalidatePath`.
- `mode: "onChange"` on every `useForm()`.
- Soft-delete/status-toggle language rules don't apply here (there's no "disable/enable" concept for a plan — only the 5-state lifecycle above).
- `RowActionsMenu` (`ui/row-actions-menu.tsx`) for row actions, via a pure `getProductionPlanRowActions()` function — approve/issue/cancel/delete gated per status + permission, danger variant only for cancel/delete.
- Responsive dialogs: `DialogContent fullScreenOnMobile size="lg"` for the multi-line form (mirrors `materials-disbursement-form-dialog.tsx`), `size="xl"` if the item-row + BOM-preview layout needs more room.

## Recommended sequence

1. Re-read `CONTEXT.md` and `docs/adr/0001-production-plan-reservations-block-disbursement.md` in full before writing any code.
2. Design and write the migration for the 3 new tables + the Disbursement FK, following this repo's existing migration conventions (see cps-api's own migration history for style).
3. Modify `materials-disbursement.service.ts`'s FIFO availability query first, in isolation, with its own tests — this is the highest-risk, most-invasive change and should be verified correct (including concurrent-lock behavior) before any new Production Plan code depends on it.
4. Build the `production-plans` cps-api module: create/import/update/approve/issue/cancel/delete, with the all-or-nothing check and FIFO reservation at approve time.
5. Add the `@nestjs/schedule` cron for 3-day auto-expiry; test it with a manually-backdated `approvedAt` rather than waiting 3 real days.
6. Write backend tests: FIFO reservation correctness, concurrent-approval race (two plans, same scarce material), hard-block against ordinary Disbursement creation, cancel/expire release-back, issue→Disbursement linkage, permission gates.
7. Update `cps-api`'s `API_ENDPOINTS.md` and any other backend-side documentation its own conventions require.
8. Build the admin-dashboard frontend: list/filter page, manual-entry form dialog, Excel import dialog, approve/cancel/issue actions, details dialog with reservation/shortfall visibility.
9. Update `admin-dashboard/AGENTS.md` per its own R2 rule (Project Structure, Conventions, Recent Changes) — this is mandatory in this repo, not optional.
10. Verify end-to-end against a real (temporary) account, per this repo's own established verification habit for CRUD features.

## Completion checklist

- A plan with insufficient stock on any line cannot be approved; the error names which material(s) are short and by how much.
- Approving a plan actually locks specific packages/lots (verifiable by querying `production_plan_reservations`), not just a bucket total.
- While a plan is `APPROVED`, an ordinary (plan-less) Disbursement creation cannot consume the reserved lots — verify by attempting to over-consume a material that's fully reserved by a pending plan.
- Two plans approved concurrently for the same scarce material never both succeed in reserving more than what's available (no double-reservation race).
- Issuing a plan creates a real Disbursement with `production_plan_id` set, and the reservation ledger rows are marked released/consumed (not left dangling).
- Cancelling a plan (manual, with reason) or letting it expire (auto, 3 days, no reason from a user) releases every reservation it held, verifiable via `stock_balances`/`remainingQuantity` returning to their pre-reservation state.
- `isScrap=true` BOM items are never included in the required-quantity calculation; `wastagePercent` is never applied.
- Only a product's `ACTIVE` BOM can be referenced; attempting to add a line for a product with no ACTIVE BOM is blocked with a clear error.
- An `APPROVED` plan cannot be edited (API rejects it; the UI doesn't even offer the option).
- Excel import correctly creates one plan with N lines from an N-row file, resolving each row's BOM server-side (never trusting a BOM reference in the file, because there isn't one).
- Backend and frontend builds, lint, and tests pass. `admin-dashboard/AGENTS.md` was updated per its own mandatory-update rule.
