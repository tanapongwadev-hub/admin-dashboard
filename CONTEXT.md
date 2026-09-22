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
- **APPROVED**: passed the all-or-nothing stock-sufficiency check for every line at once; every required material is now Reserved via FIFO. The plan is frozen — no further edits; changing anything requires cancelling and creating a new plan. A 3-day clock starts here.
- **ISSUED**: production was confirmed and stock was actually cut — a real Material Disbursement was created from the Reservation, linked back via `productionPlanId`. Terminal; cannot be cancelled from the Plan itself (cancel the Disbursement instead, through its own page).
- **CANCELLED**: manually cancelled by a user before issuing; requires a reason. Releases the Reservation in full.
- **EXPIRED**: auto-cancelled by a scheduled job because no ISSUED action happened within 3 days of APPROVED. Releases the Reservation in full; the cancellation reason is system-generated, not user-entered.
_Avoid_: Confirmed, active, pending — ambiguous with other documents' status vocabularies in this app (e.g. Materials Receiving/Disbursement already use "confirmed").

**Required Quantity (per line)**:
`plan quantity × BOM item quantity`, computed only from BOM items where `isScrap = false`. Deliberately excludes `wastagePercent` — the Plan's reservation is exact, not inflated for expected process waste.
_Avoid_: Demand quantity, consumption quantity.

**Issue** (verb, as in "Confirm & Issue"):
The single action that turns an APPROVED Plan into ISSUED: it consumes the existing Reservation and creates a real Material Disbursement in one step. Not a separate "approve production" step from "cut stock" — those are the same action in this system.
_Avoid_: Confirm production, dispatch (this app's Materials Receiving/Disbursement already use "confirm"/"cancel" for their own, unrelated actions — "Issue" is reserved for this specific Plan→Disbursement transition).
