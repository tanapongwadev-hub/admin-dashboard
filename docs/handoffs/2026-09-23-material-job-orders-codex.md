# Codex Handoff: Material Job Orders (ใบจัดงาน)

> **Status: FEATURE SHIPPED AND VERIFIED. This handoff covers the follow-up work still open, plus the gotchas that cost real debugging time — read before touching this area.**

## Objective of the follow-up work

The core feature (Production Plan approval creates a Job Order → warehouse prints it → scans/picks each box → issues stock, partially or in full) is built, tested, and running. This handoff exists to hand off the **remaining scoped-out items** and the **operational gotchas** discovered while building and live-testing it, so a future session (Codex or otherwise) doesn't have to rediscover them.

## Read first

1. `docs/plans/2026-09-23-production-job-order-material-issue-plan.md` — the original implementation plan (8 phases). Phases 1–6 are done; **Phase 7 (Traceability drill-down) is not**.
2. `docs/adr/0002-material-job-orders-own-issue.md` — why `POST /production-plans/:id/issue` is disabled-not-deleted, and why a Job Order-linked Disbursement can't be cancelled from its own page.
3. `CONTEXT.md` § Job Order — canonical vocabulary (Job Order, Pick, Issue, Partial Issue, Job Order Status).
4. `AGENTS.md` § "Material Job Orders (ใบจัดงาน)" (Conventions) and its two 2026-09-23 entries under Recent Changes — the second (follow-up) entry documents the pick-all button, the material-grouping, and two real bugs already fixed (see below).

## Repositories

- Backend: `D:\project-cps\New\cps-api` — runs as Docker container `cps-api-api-1` (`docker-compose.yml`), **not** a plain `nest start` on the host. Bind-mount `--watch` recompiles inside the container automatically on most edits, but **Windows bind-mount file-watch is unreliable** — if a live endpoint doesn't reflect a source change, run `docker restart cps-api-api-1` and wait for `"Found 0 errors. Watching for file changes."` in `docker logs cps-api-api-1` before assuming the code is wrong.
- Frontend: `D:\project-cps\New\admin-dashboard` — plain `next dev`, not dockerized.

## What's already done (do not re-build these)

**Backend** (`src/modules/material-job-orders/`): entity, permissions, DTOs, service (`createForPlan`/`cancelForPlan`/`assertCancellable`/`isExpirable`/`print`/`pick`/`issue`/`findAll`/`findOne`), controller, module. Migrations `1790400000000-CreateMaterialJobOrders.ts` and `1790400000001-AddMaterialJobOrderMenuAndPermissions.ts` — **both already run against the dev DB**, backfilled 6 pre-existing plans correctly. `production-plans.service.ts#issue` disabled (409). FIFO availability formula in both `materials-disbursement.service.ts` and `production-plans.service.ts` now subtracts `reserved − issued`, not full reserved. `MaterialsDisbursement.materialJobOrderId`/`.productionPlanId` exposed in both response mappers. Shared `src/common/decimal.ts`/`disbursement-number.ts` extracted from duplicated code.

**Frontend**: `lib/api/material-job-orders.ts`, `lib/filters/material-job-orders-filters.ts`, `lib/group-pick-lines.ts` (shared grouping helper), `app/(dashboard)/materials/job-orders/{page,actions,[id]/page}.tsx`, `components/material-job-orders/*` (client, filters, table, detail, print-sheet, issue-dialog). Production Plan's row actions/details dialog updated ("ดูใบจัดงาน"/"พิมพ์ใบจัดงาน" instead of "ออกใบเบิก"). Materials Disbursement's cancel action hidden for Job Order-linked rows. Job Order detail page has a "หยิบทั้งหมด" (pick-all) button and both the pick-lines table and the print sheet group boxes by `materialCode`.

**Verification as of this handoff**: cps-api `nest build`/`eslint`/`jest` — 516/516 (1 pre-existing skip). admin-dashboard `tsc --noEmit`/`eslint`/`next build` clean, `pnpm test` — 412/412. Both migrations confirmed applied and backfilled correctly via direct SQL query. The running container was restarted and confirmed to boot cleanly and serve the new routes.

## Two real bugs already found and fixed here — know the pattern, don't reintroduce it

1. **`findOneEntity()` vs `findOne()` — returning the wrong shape after a mutation.** `MaterialJobOrdersService#print/pick/issue` originally ended with `return this.findOneEntity(id)`, which returns only the bare `MaterialJobOrder` header row (id/code/status/version/...) — **not** the full detail object (`productionPlan`/`materials`/`pickLines`/`disbursements`) the frontend's `MaterialJobOrderActionResult` type promises. Every print/pick/issue call silently replaced the frontend's `jobOrder` state with a stripped object, crashing the next render (`jobOrder.pickLines.filter(...)` → `TypeError`). **Fixed**: all three now `return this.findOne(id)`. **If you add a fourth mutating method to this service, it must also `return this.findOne(id)` at the end, never `findOneEntity`** — `findOneEntity` is a private helper meant only for internal locking/reads within a transaction, not for a value returned to a controller.
2. **Missing `AccessControlModule` import.** `MaterialJobOrdersModule` uses `PermissionGuard` (via `@UseGuards` on the controller) but didn't import `AccessControlModule`, which is where `EffectivePermissionService` — one of `PermissionGuard`'s own constructor dependencies — is provided. This crashed the **entire app** on boot (`UnknownDependenciesException`), not just this module's routes. **Fixed** by adding `AccessControlModule` to the module's imports. **Rule: any new guarded module in this app needs `AccessControlModule` in its imports** — check `production-plans.module.ts` as the reference.

## Not done — flagged from the original plan, still open

1. **Phase 7 (Material Traceability drill-down)** — the SUB QR / MAIN QR drill-down dialog in `/materials/materials-report` does not yet show a Job Order/pick-line cross-link. Someone tracing a package back through history can't currently see "this was issued via Job Order JO-xxxx." Would touch `src/modules/material-traceability/material-traceability.service.ts` (backend) and `material-traceability-details.tsx` (frontend).
2. **No `*-actions.test.ts` for `materials/job-orders/actions.ts`** — every other Server Actions file in this app has a companion test (see `materials-disbursement-actions.test.ts` for the `perform*`/public-wrapper pattern to copy). Only the pure `group-pick-lines.test.ts` and `material-job-orders.test.tsx` (filter module) exist so far.
3. **No visible "linked to Job Order" badge on the Materials Disbursement table** — the cancel-action gate (`!disbursement.materialJobOrderId`) was added, but there's no visual indicator on the row itself that a disbursement came from a Job Order. A small badge + link (mirroring how the Production Plan page links to its Job Order) would close this gap.
4. **Job Order cancellation is Plan-only by design** (plan's Q4 decision) — no `/material-job-orders/:id/cancel` endpoint exists, and none should be added without re-confirming this decision with the user first.
5. **`POST /production-plans/:id/issue` is disabled, not deleted** (ADR-0002, deliberate) — don't "clean this up" by removing it; the 409 is intentional so a stale client fails loudly.

## Operational notes for whoever picks this up

- After any cps-api source change, verify with `docker logs cps-api-api-1 --tail 20` for `"Found 0 errors. Watching for file changes."` before testing live. If the container seems stuck mid-compile or crash-looping, `docker restart cps-api-api-1` and re-check.
- Run migrations with `npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/database/data-source.ts` (or `migration:show` to check status) — but this CLI path has hit native OOM ("Zone Allocation failed") on this machine when memory is tight (Docker + IDE + this running concurrently). If that happens, don't retry blindly — check `iam.migrations` directly via a small throwaway `AppDataSource` script (see git history of this session for the exact pattern) to confirm whether the migration actually needs running at all.
- `src/database/data-source.ts`'s entity glob is `src/entities/**/*.entity.ts` only — it does **not** cover `src/modules/**/*.entity.ts` (where `MaterialJobOrder` and most other feature-module entities live). This is fine for migrations (raw SQL, no entity metadata needed) but means a throwaway diagnostic script using `AppDataSource` directly with `repository.findOne()` on a modules-directory entity will throw `EntityMetadataNotFoundError`. Query raw SQL via `AppDataSource.query(...)` instead for quick DB checks.
