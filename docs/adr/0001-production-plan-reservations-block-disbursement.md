# Production Plan reservations are hard, not advisory — Material Disbursement must honor them

**Status**: accepted

A Production Plan reserves specific FIFO lots (`MaterialReceivingPackage` rows) at the moment it's `APPROVED`, ahead of any actual stock cut. `stock_balances` has no location/warehouse dimension — it's one global quantity pool per material — so a reservation and an ordinary Material Disbursement (created independently of any plan) draw from the exact same pool with no natural separation between them.

We decided the reservation must be **hard**: `materials-disbursement.service.ts`'s FIFO traversal (used by both plan-less Disbursement creation and Plan issuance) is changed to compute availability as `remainingQuantity` minus whatever other active Production Plan reservations currently hold, not `remainingQuantity` alone. The alternative — a **soft** reservation that only warns but doesn't block — was rejected because a global, locationless stock pool makes double-consumption trivially easy: a plan approved for the last 100 units of a material provides no real guarantee if an unrelated disbursement can still walk past it and take the same units first. A reservation that doesn't reserve isn't worth building.

**Consequences**: this touches the pre-existing, already-shipped `materials-disbursement.service.ts` FIFO logic, not just new Production Plan code — a future reader modifying that FIFO calculation needs to know reservations exist and must keep subtracting them, or Production Plan's "the stock is guaranteed once approved" promise silently breaks. Concurrent-approval races (two plans competing for the same lots) need the same `pessimistic_write` row-locking pattern the Disbursement confirm/cancel flow already uses.
