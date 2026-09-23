# Material Job Orders own the stock cut — Production Plan's own `/issue` is disabled, and a Job Order's Disbursement can't be cancelled from the Disbursement page

**Status**: accepted

Per `docs/plans/2026-09-23-production-job-order-material-issue-plan.md`, the responsibility for cutting stock ("จ่ายออก") moved from `ProductionPlansService#issue` to a new `MaterialJobOrdersService#issue`, reachable from Material Management > ใบจัดงาน instead of the Production Plan page. A Job Order is created automatically, in the same transaction, the moment a Plan is `APPROVED` — it reuses the Plan's own `production_plan_reservations` rows as its pick lines (no parallel reservation ledger), and supports partial issue via a new `issued_quantity` column on that same table.

## `POST /production-plans/:id/issue` is disabled, not removed

The endpoint and its `PRODUCTION_PLAN_ISSUE` permission stay in the database (existing `department_permissions` grants reference it) but the handler now always returns a Thai 409 pointing the caller at the Job Order. This was chosen over deleting the route outright so a stale client (or an old bookmark/script) fails loudly and immediately instead of 404ing or silently doing nothing.

## A Disbursement issued from a Job Order cannot be cancelled from `/materials/materials-disbursement`

This **supersedes decision #10 of the 2026-09-22 Production Plan handoff**, which said an issued Plan could only be undone by cancelling its linked Disbursement directly on the Disbursement page (a fire-and-forget link, no live sync back). That was written before Job Orders existed and before partial issue was a possibility.

Once a Job Order can issue the same Plan's reservations across several partial calls, each producing its own Disbursement, "cancel the Disbursement, and the Plan's own state just sits there stale" is no longer an acceptable read — a cancelled Disbursement would revert stock while the Job Order's `issued_quantity` bookkeeping (and the reservation `released_at` it drives) stays exactly as it was, silently diverging from what `stock_balances` now says. So `materials-disbursement.service.ts#cancel` now checks `materialJobOrderId` and rejects (409) whenever it's set — undoing an issue must happen through the Job Order (which the plan intentionally does **not** expose a cancel action for either; the only way back is cancelling the *Plan*, and only before anything has been issued — see `MaterialJobOrdersService#assertCancellable`).

**Consequences**: a future change to either `MaterialsDisbursementService#cancel` or `MaterialJobOrdersService#issue` must keep this invariant — a Job Order-linked Disbursement is immutable from the Disbursement page's own lifecycle actions. If a genuine "undo a partial issue" need shows up later, it has to be built as a Job Order operation (reversing `issued_quantity` and the linked Disbursement together in one transaction), not bolted onto the existing Disbursement cancel flow.
