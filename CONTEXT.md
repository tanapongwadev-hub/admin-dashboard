# Admin Dashboard

Admin console for CPS (Chiewchan Industry) — manages materials, products, BOMs, and production against the cps-api backend. This file is the glossary for domain vocabulary; see `AGENTS.md` for stack/structure/implementation conventions.

## Language

### Production Plan

**Production Plan (แผนการผลิต)**:
A document that reserves raw materials ahead of an actual production run, referencing one or more Products and their ACTIVE BOM. Created either by manual entry or by importing a single Excel file (one file → one Plan). Identified by a `PP-{YYYYMM}-{seq}` code.
_Avoid_: Production order, work order, manufacturing order — not yet distinct concepts in this system; "Production Plan" is the only term in use.

**Plan Line**:
One row within a Production Plan: a single Product + quantity to produce + a need-by date. A Plan can hold many lines (many products in one production run).
_Avoid_: Plan item, line item (reserve these for other documents, e.g. Disbursement items).

**Reservation**:
A hold placed on specific `MaterialReceivingPackage` lots (chosen via the existing FIFO traversal) at the moment a Plan is `APPROVED`. A Reservation makes its reserved quantity unavailable to every other consumer of stock — including ordinary Material Disbursement created outside any plan. It is released in full when the Plan is `CANCELLED` or `EXPIRED`, and is consumed (converted into an actual stock cut) when the Plan is `ISSUED`.
_Avoid_: Allocation, hold, lock (informal synonyms used in conversation; "Reservation" is the canonical term).

**Plan Status** — one of:
- **DRAFT**: being composed; lines can be freely added, removed, or edited. No reservation exists yet.
- **APPROVED**: passed the all-or-nothing stock-sufficiency check for every line at once; every required material is now Reserved via FIFO, and a Job Order is created in the same transaction. The plan is frozen — no further edits; changing anything requires cancelling and creating a new plan. A 3-day clock starts here, but only while the Job Order hasn't started picking (see Job Order Status § EXPIRED note).
- **ISSUED**: the linked Job Order finished issuing every reserved package (possibly across several partial issues) — one or more real Material Disbursements were created from the Reservation, each linked back via `productionPlanId`/`materialJobOrderId`. Terminal; cannot be cancelled from the Plan itself, and its Disbursements cannot be cancelled from their own page either (see ADR-0002).
- **CANCELLED**: manually cancelled by a user before the Job Order has issued anything; requires a reason. Releases the Reservation in full and cancels the Job Order too.
- **EXPIRED**: auto-cancelled by a scheduled job because the Job Order never started picking within 3 days of APPROVED. Releases the Reservation in full; the cancellation reason is system-generated, not user-entered.
_Avoid_: Confirmed, active, pending — ambiguous with other documents' status vocabularies in this app (e.g. Materials Receiving/Disbursement already use "confirmed").

**Required Quantity (per line)**:
`plan quantity × BOM item quantity`, computed only from BOM items where `isScrap = false`. Deliberately excludes `wastagePercent` — the Plan's reservation is exact, not inflated for expected process waste.
_Avoid_: Demand quantity, consumption quantity.

### Job Order

**Job Order (ใบจัดงาน)**:
The warehouse-facing document created automatically, in the same transaction, the instant a Production Plan is `APPROVED` — one Job Order per Plan (never more than one). It tells the warehouse which packages/QR/boxes to pick for that plan, and is what a warehouse worker prints and carries to the shelf. A Job Order does not keep its own reservation ledger — its pick lines *are* the Plan's own `production_plan_reservations` rows.
_Avoid_: Pick list, pick ticket (used informally in earlier drafts of this feature; "Job Order" — matching the seeded menu label ใบจัดงาน — is the canonical term going forward).

**Pick** (verb):
The warehouse action of scanning/confirming a specific reserved package's QR against its Job Order pick line, recorded as `pickedAt`/`pickedBy` on the reservation. A Job Order automatically moves from `WAITING_PICKING` to `READY_TO_ISSUE` once every one of its active pick lines has been picked — this is what gates Issue: nothing can be issued from a line that hasn't been picked.
_Avoid_: Confirm, verify (this app's Materials Receiving/Disbursement already use "confirm" for an unrelated action).

**Issue** (verb, as in "จ่ายออก"):
The Job Order action that actually cuts stock: it consumes some or all of the outstanding quantity on one or more already-picked reservation lines and creates a real Material Disbursement in the same transaction. Superseded from the Production Plan itself — `POST /production-plans/:id/issue` is disabled (see ADR-0002) — Issue now lives only on the Job Order, reachable from Material Management > ใบจัดงาน, never from the Production Plan page.
_Avoid_: Confirm production, dispatch, ออกใบเบิก (the pre-Job-Order name for this same concept — still shows up in older comments/commit messages, but the UI no longer uses it).

**Partial Issue**:
Issuing less than a reservation line's full outstanding quantity in one call — the line stays reserved (not released) for the remainder, and the Job Order's status becomes `PARTIALLY_ISSUED` instead of `ISSUED`. Tracked via the reservation's own `issuedQuantity` column (`reservedQuantity − issuedQuantity` = outstanding), not a separate ledger.

**Job Order Status** — one of:
- **WAITING_PICKING**: created, nothing picked yet (or not all lines picked). The 3-day auto-expiry clock (inherited from the Plan's own APPROVED state) only counts down while a Job Order is in this state with zero lines picked — once picking starts, the clock stops (see `MaterialJobOrdersService#isExpirable`).
- **READY_TO_ISSUE**: every active pick line has been picked; nothing issued yet.
- **PARTIALLY_ISSUED**: some but not all outstanding quantity has been issued.
- **ISSUED**: every reservation's outstanding quantity is fully issued (or released) — terminal, and the linked Production Plan becomes ISSUED at the same moment.
- **CANCELLED**: the linked Plan was cancelled or expired before anything was issued (blocked, 409, once PARTIALLY_ISSUED — see `MaterialJobOrdersService#assertCancellable`).
_Avoid_: Open, closed, done — this app already overloads those informally elsewhere; use the exact enum name.

### Activity Evidence

**Activity Event**:
The umbrella term for a meaningful occurrence produced by CPS. Every Activity Event belongs to exactly one of the Audit, Operational, or Analytics streams.
_Avoid_: Activity Log — this sounds like one database or trust level, while CPS deliberately has three.

**Audit Event**:
Authoritative evidence of a business, security, sensitive-access, or administrative occurrence, including actor, target, outcome, and correlation context. A browser intention is not an Audit success; the service that owns the outcome is authoritative.
_Avoid_: Request log, click log, history row.

**Operational Event**:
Diagnostic evidence about service health and execution, such as latency, dependency failure, queue lag, or stack trace. It can explain how a failure happened but is not proof that a business outcome occurred.
_Avoid_: Audit Event.

**Analytics Event**:
Pseudonymous, allowlisted evidence about how a person interacts with the product, such as a page view, meaningful action, filter, or abandoned workflow. It never carries business authority or unrestricted user-entered values.
_Avoid_: Audit Event, raw clickstream.

**Actor**:
The user, anonymous visitor, system, service, or integration responsible for an Activity Event. Initiator, executor, and represented party remain distinct when an action crosses a job, service, or impersonation boundary.
_Avoid_: User — not every Actor is a user.

**Correlation**:
The link joining one business or user activity across frontend intent, HTTP attempts, retries, jobs, and resulting events. One Correlation may contain several Requests, each with its own identity.
_Avoid_: Request trace — a single request is narrower than the correlated activity.
