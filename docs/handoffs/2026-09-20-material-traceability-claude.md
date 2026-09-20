# Claude Handoff: Material Receiving & Disbursement Traceability

> **Status: RED / incomplete / not safe to deploy**
>
> This handoff captures work in progress across `cps-api` and `admin-dashboard`. Preserve all existing user changes. Do not run the new database migration until the backend builds and the relevant tests pass.

## Objective

Finish the Material Receiving & Disbursement Traceability Report for the warehouse system. It must support bidirectional traceability:

```text
Receiving -> Lot -> MAIN QR -> SUB QR -> Stock movements -> Disbursement/destination
Receiving <- Lot <- MAIN QR <- SUB QR <- Stock movements <- Disbursement/destination
```

The original Thai specification is at:

`C:\Users\USER\.codex\attachments\038293f3-b30e-4d0a-a5d9-2426da99dccd\Pasted text.txt`

Read that file before making further design decisions. The user explicitly confirmed the high-risk database and transaction-flow changes.

## Repositories

- Backend: `D:\project-cps\New\cps-api`
- Frontend: `D:\project-cps\New\admin-dashboard`

Read the repository instructions before editing either repository. The frontend `AGENTS.md` is canonical and requires its documentation to be updated after non-trivial changes. For Next.js work, read the relevant installed Next 16 guide under `node_modules/next/dist/docs/` before writing code.

## User-visible requirements

The finished module must include:

- Broad filters: date range, material code/name/type/shape, lot, MAIN QR, SUB QR, transaction type, receiving/disbursement number, supplier, department, production order, reference, operator, and status.
- Summary cards calculated from the exact same filters as the details.
- A paginated stock-movement table backed by the stock ledger as source of truth.
- Timeline/detail views for receiving, disbursement, MAIN QR, and SUB QR.
- Forward and reverse trace by QR.
- FIFO allocation traceability.
- Running-balance reconciliation with a visible `STOCK MISMATCH` state.
- Drill-down links between related records.
- CSV, Excel, and PDF exports using the same filters as the screen.
- Auditable changes with `trace_id` / correlation data.
- No destructive deletion of traceability history. Cancellation must create reversal movements.
- Transactional integrity: document state, package state, material balance, ledger, allocations, and audit entries must commit or roll back together.

Do not implement this as a UI-only report over incomplete data. The ledger and operational flows must first produce reliable trace data.

## Existing architecture discovered

- `inventory.stock_transactions` is the existing movement ledger. Before this work it supported only `RECEIVE`, `ISSUE`, and `ADJUST`, stored material-level running balances, and had no SUB QR or trace ID.
- `material_receivings` and `material_receiving_packages` already model receiving documents and packages, including immutable quantity, remaining quantity, lot detail number, and QR identifiers.
- `materials_disbursements`, their items, and the package allocation join table already model N:M FIFO allocations.
- FIFO deduction lives in `materials-disbursement.service.ts`.
- `iam.audit_logs` already exists, but receiving and disbursement did not previously write transactional audit events.
- Existing `GET /materials-receiving/unified-report` is insufficient and contains unsafe raw interpolation for `materialId`. Do not extend it as the canonical solution.
- The sidebar already contains `MATERIALS_REPORT` at `/materials/materials-report`, gated by `MATERIALS_RECEIVING_VIEW`; the frontend route currently falls through to a placeholder.
- There is no production-order entity. Treat production order as optional reference text unless a later domain decision introduces a real relation.

## Work already added to the backend

The following files are currently modified or new in `cps-api`:

```text
M  src/entities/iam/audit-log.entity.ts
M  src/entities/inventory/material-receiving-package.entity.ts
M  src/entities/inventory/material-receiving.entity.ts
M  src/entities/inventory/stock-transaction.entity.ts
M  src/modules/materials-disbursement/dto/create-materials-disbursement.dto.ts
M  src/modules/materials-disbursement/material-disbursement-package.entity.ts
M  src/modules/materials-disbursement/materials-disbursement.controller.ts
M  src/modules/materials-disbursement/materials-disbursement.entity.ts
M  src/modules/materials-disbursement/materials-disbursement.service.ts
M  src/modules/materials-receiving/materials-receiving.controller.ts
M  src/modules/materials-receiving/materials-receiving.service.ts
?? src/common/stock-ledger.ts
?? src/database/migrations/1790000000000-AddMaterialTraceabilityLedger.ts
```

Re-run `git status --short` before editing because the shared workspace may have changed.

### Migration

`src/database/migrations/1790000000000-AddMaterialTraceabilityLedger.ts` currently attempts to:

- Add and backfill `trace_id` on receiving and disbursement documents, then make it non-null and unique.
- Add destination/reference metadata to disbursements: department, production order, reference number, requested by, and approved by.
- Add FIFO order and reversal metadata to package allocations.
- Add transaction number, trace ID, MAIN/SUB QR, unit, department, production order, reference, source/destination location, and reason to stock transactions.
- Expand transaction types to `RECEIVE`, `ISSUE`, `RETURN`, `ADJUST_IN`, `ADJUST_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, and `CANCEL`.
- Add trace/request/reason fields to audit logs.
- Change the receiving-package parent FK from cascade to restrict.
- Correct the package status constraint to include `partial` and `cancelled`.

Review before execution:

- The `down()` migration currently restores a package-status constraint that excludes `partial`, although current application behavior already uses `partial`. Correct that rollback behavior.
- Constraint additions are not guarded for partially applied schemas. Decide whether the project expects strictly one-shot migrations or needs defensive guards.
- Legacy ISSUE rows cannot always be backfilled with a SUB QR. Preserve them as legacy/unresolved rather than fabricating links.
- Add a migration test/spec consistent with the backend repository's conventions.
- **Do not run `pnpm migration:run` until build and relevant tests are green.**

### Shared ledger seam

`src/common/stock-ledger.ts` was added with:

- `createTraceId(prefix)`
- `recordStockMovement(manager, input)`
- `recordAuditEvent(manager, input)`

The intent is to make this the single write seam for stock movements and transactional audit records. Confirm typing, repository access, numbering behavior, and transaction-manager usage. Do not permit direct stock-ledger writes in the new flows unless there is a documented exception.

### Receiving changes

The receiving service currently attempts to:

- Assign a trace ID on create.
- Write create/update/approve/delete/cancel audit events inside the transaction.
- Convert document removal from hard delete to cancelled state.
- Confirm using locked pending packages and create one `RECEIVE` movement per SUB QR.
- Cancel only when packages have not been issued, create per-package `CANCEL` reversal movements, and mark packages cancelled.

Outstanding risks:

- Draft update still deletes and recreates package rows. This conflicts with strict QR-history preservation. Replace it with a stable update/upsert strategy, cancelling obsolete packages where appropriate, or obtain an explicit domain exception.
- Confirm that each movement receives the correct running balance and the sum of packages equals converted stock quantity.
- Existing tests and mocks will need audit repositories and new required entity fields.
- Remove unused direct `StockTransaction` injection/imports if the shared ledger seam replaced them.
- Decide whether QR-state changes need their own audit events in addition to the document event and ledger entries.

### Disbursement changes

The disbursement service currently attempts to:

- Assign a trace ID and destination/reference metadata on create/update.
- Convert draft removal from hard delete to cancelled state.
- Persist FIFO allocation order.
- Write one `ISSUE` movement per allocation with MAIN/SUB QR and destination metadata.
- Cancel by restoring package balances, creating `CANCEL` reversal movements, and marking allocations reversed instead of deleting them.
- Write transactional audit events.

Known bug to fix immediately:

- The cancel flow mutates status to `cancelled` before building the audit `before` state, so the audit currently always infers `confirmed`. Capture `previousStatus` before mutation and record the real transition.

Also verify:

- Reversed allocations are excluded from active FIFO/issue history but remain visible in trace history.
- Repeated cancellation is idempotently blocked.
- `fifoOrder`, `reversedAt`, and `reversedBy` are included where the report/detail APIs need them.
- Existing tests and mocks account for audit repositories and newly required fields.
- Remove unused direct `StockTransaction` injection/imports.

## Backend work still required

Create a dedicated module, suggested structure:

```text
src/modules/material-traceability/
  dto/
  material-traceability.controller.ts
  material-traceability.service.ts
  material-traceability.module.ts
```

Register it in `app.module.ts`. Use the existing JWT, active-assignment, and permission guards. The existing menu uses `MATERIALS_RECEIVING_VIEW`; verify guard semantics before trying to express OR-permission behavior.

Suggested API surface:

- `GET /material-traceability` — filtered summaries, reconciliation state, and paginated movements.
- `GET /material-traceability/qr/:code` — MAIN/SUB QR hierarchy, receiving origin, package state, full timeline, and issue destinations.
- `GET /material-traceability/receivings/:id` — receiving-centered trace.
- `GET /material-traceability/disbursements/:id` — disbursement-centered trace.
- Export endpoints only if server-side exports materially improve consistency; otherwise share one typed query/filter contract with frontend export generation.

Implementation constraints:

- Use `stock_transactions` as movement source of truth.
- Parameterize all queries. Do not copy unsafe string interpolation from the old unified report.
- Apply one filter model consistently to totals, rows, drill-downs, and exports.
- Reconcile signed ledger movement (`quantity_in - quantity_out`) against `stock_balances` and surface mismatches explicitly.
- Enrich legacy rows from allocation/package relations only when the link is unambiguous. Mark unresolved legacy provenance instead of guessing.
- Return stable IDs and links needed for frontend drill-downs.
- Add focused unit/integration tests for filters, running balances, FIFO, cancellation reversal, QR lookup, authorization, and mismatch detection.
- Update `API_ENDPOINTS.md` and the backend project documentation required by that repository.

## Frontend work still required

No traceability report UI has been implemented yet.

Suggested route:

`src/app/(dashboard)/materials/materials-report/page.tsx`

Suggested components:

```text
src/components/material-traceability/
  material-traceability-view.tsx
  material-traceability-filters.tsx
  material-traceability-summary.tsx
  material-traceability-table.tsx
  material-traceability-details.tsx
  material-traceability-timeline.tsx
  material-traceability-exports.tsx
```

Add a typed API client under `src/lib/api/` following existing server-only client conventions. Prefer URL-backed filter state so filtered pages and drill-downs remain shareable and refresh-safe.

The page must provide:

- Summary cards and mismatch status.
- Large but usable filter surface with mobile behavior.
- Dense, readable movement table with pagination.
- QR search and clickable MAIN/SUB QR details.
- Receiving and disbursement drill-down timelines.
- FIFO allocation history, including reversals without erasing the original allocation.
- CSV, Excel, and PDF export controls using the current filters.

Possible dependency-free export approach:

- CSV: browser `Blob`.
- Excel: SpreadsheetML XML with worksheets for Summary, Stock Movement, Receiving, Disbursement, and QR Traceability.
- PDF: a print-specific report layout and browser print.

If adding export dependencies, use `pnpm` only and justify the bundle/runtime cost. Never run `npm install` in the frontend repository.

Preserve unrelated frontend changes already in the worktree, including the SHEET/PIPE/COIL ratio field and QR print behavior from the previous task.

## Recommended recovery sequence

1. Read the original specification and both repositories' instructions.
2. Inspect `git status` and the current diffs; preserve all user changes.
3. Run the backend build immediately and fix TypeScript errors in the existing WIP.
4. Fix the known cancellation-audit bug and migration rollback constraint.
5. Update receiving/disbursement tests for the new transactional audit and per-package movements.
6. Complete the stable, non-destructive package/allocation lifecycle.
7. Implement and test the dedicated backend traceability module.
8. Run targeted backend tests, then the full backend test/build suite.
9. Review the generated migration SQL. Only after green verification, run the migration.
10. Implement the frontend route, filters, table, timeline/drill-downs, mismatch state, and exports.
11. Run frontend typecheck, tests, lint, and build.
12. Update project documentation and the frontend `AGENTS.md` Recent Changes section as required.
13. Rebuild the Docker API/UI only after verified builds and migration readiness.

The earlier migration run from the previous task reported “No migrations are pending”; that happened before this new traceability migration existed. The currently running Docker API therefore does not include this WIP.

## Completion checklist

Before calling the feature complete, prove all of the following:

- A receiving confirmation writes one traceable ledger row per SUB QR.
- A disbursement confirmation records the exact FIFO package allocations and destinations.
- Cancellation preserves original rows and appends reversal history.
- MAIN QR and every SUB QR can be searched in both directions.
- One SUB QR can show all movements and destinations in chronological order.
- Receiving and disbursement detail views cross-link to each other through packages/movements.
- Running balances reconcile with stock balance, or visibly report `STOCK MISMATCH`.
- All report summaries, rows, and exports honor identical filters.
- Legacy data is labeled accurately when package-level provenance is unavailable.
- All mutations are atomic and leave no partial ledger/package/balance state on failure.
- Audit logs contain actor, action, timestamp, reason where applicable, trace ID, and before/after data.
- Permission and tenant/company scoping prevent cross-scope trace access.
- No raw, user-controlled values are interpolated into SQL.
- No required history row is hard-deleted.
- Backend and frontend builds and relevant tests pass.
- The migration was run only after verification and its result was recorded.
- Docker was rebuilt from the verified source, and a smoke test confirmed the report route and core trace flows.

## Definition of done

Do not stop at compiling code. The task is done only when the operational write paths produce durable traceability data, the report reads and reconciles that data, the UI exposes forward/reverse trace and exports, tests/builds pass, the migration has been safely applied, Docker has been rebuilt, and the acceptance checklist above has evidence.
