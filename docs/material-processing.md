# Material processing

## Destination operational fields — 2026-10-08

Step 3 includes optional รุ่น (`outputModelId`), จุดขึ้นสินค้า (`outputLoadingPointId`), สายการผลิต (`outputProcessLineName`) and มาตราส่วน (`outputScale`). The first two use existing Material-model/loading-point lookups, including an explicit ไม่ระบุ option; the other two are text capped at 255 characters. Form edits prefill the destination's own fields, server drafts retain all four, and final save maps them to nested `processingOutput.modelId/loadingPointId/processLineName/scale`. The API checks active selected references and saves in the existing pair transaction. Explicit null clears a value; omitted fields preserve existing output values and older-client creation behavior. Destination details show these fields independently from source metadata. Existing Material columns are reused; no migration or stock movement is required.

## Material Location Type — 2026-10-08

Material create/edit includes `locationType`: `internal` (ภายใน) or `external` (ภายนอก), for every shape. Raw-material wizards independently store the destination's value as `processingOutput.locationType`; drafts retain `locationType` and `outputLocationType`. Both values appear in Material details. New forms and drafts without a saved value default to External; edits and drafts with a saved value retain it. Migration `AddMaterialLocationType1790600000022` originally added the non-null column and two-value check, backfilling existing Materials to Internal. Follow-up migration `DefaultMaterialLocationExternal1790600000023` changes only the database default to External, preserving existing rows. API clients may omit the field on create (External default) or edit (preserve saved value); explicit null and other values are rejected. Classification does not move stock or assign a physical Location master.

The main menu **แปรรูปวัตถุดิบ**, `/material-processing`, turns confirmed PIPE/SHEET/COIL receipts into a receipt for a **different, active Material**. Destination Materials are created through the existing Material Master; processing selects an existing destination rather than inventing a master code.

## Two Material datasets in create/edit — 2026-10-07

Selecting PIPE/SHEET/COIL in the Materials form shows raw and processed datasets. The raw dataset keeps the source code, name, specification/size and raw unit. The processed dataset has a different code, name, specification/size, unit, pieces per raw unit and pieces per box. PCS uses the ordinary single dataset.

The create/edit form is a wizard: choose ชนิดเหล็ก, enter source Material data, then enter processed Material data for PIPE/SHEET/COIL. PCS has only shape and Material steps. New forms start with no selected shape; editing prefills the saved shape and datasets. Next validates only the current step, including the source image; Back preserves entered values and the file input. Final save validates all fields, returns to the step containing an error, then submits both datasets atomically. The parent mounts a fresh form for each dialog session so steps start at shape selection. Only the active panel is visible; hidden panels remain mounted to preserve form/file values.

Source and output codes now have debounced (400 ms) availability feedback via authenticated `GET /materials/code-availability?code=...&excludeId=...`. Checks match codes exactly, case-insensitively after trimming, include inactive masters and exclude only the edited Material's id. The output code must also differ from the source. The hook discards responses after its input changes or unmounts. Next and final save perform fresh checks, block duplicates/connection failures and focus the affected field; fields are disabled while those checks run. The database unique index and transactional save remain the authoritative protection against concurrent saves.

## Material drafts — 2026-10-07

Every wizard step has **บันทึกร่าง**, which saves incomplete fields without final validation or reserving a Material code. **ร่างของฉัน** on the Materials page lists the current user's drafts, with resume and confirmed delete actions. Drafts are stored in `master.material_drafts`, not localStorage or the Material/stock tables. They store create/edit target, fields for both datasets, suppliers, current step, original source/output timestamps and an optional retained image. Opening an edit draft uses the original timestamps even if the live master has changed, so final save cannot silently overwrite newer data.

GET/POST/DELETE `/materials/drafts` routes use existing active-assignment guards and require MATERIAL_CREATE or MATERIAL_UPDATE. Every row lookup, write, resume and delete is scoped to the authenticated owner. Existing draft saves require its current updatedAt; mismatches return 409. Final POST/PATCH `/materials` includes draftId and draftUpdatedAt, locks and verifies the owned draft/target/version, performs full Material validation and consumes the draft within the same transaction. On failure the draft remains. Drafts never alter stock or create a real Material before final save.

Images uploaded through the existing validated staging endpoint are moved to `/uploads/materials/drafts/`, outside the 24-hour `.tmp` cleanup. Final save copies the owned draft image into temporary staging before promotion; transaction rollback can discard that copy without losing the resumable draft image. Replacing/deleting a draft or successfully consuming it removes its retained image after database commit, logging cleanup failures without misreporting a committed save. Material image URLs use the existing `/uploads` proxy.

Migration `CreateMaterialDrafts1790600000018` was applied locally with only that migration selected. The controller constructor test fixture was adapted for the draft service; no lint/tests/build/type checks or browser save/resume validation were run under R0.

The existing POST/PATCH `/materials` accepts an optional nested `processingOutput` (code, name, unitId, specification, packingQuantity, and updatedAt on edits). The source's `ratio` remains the cutting yield; raw packingQuantity is null. One transaction creates or updates a separate PCS Material and stores `master.materials.processing_material_id`. The unique foreign key prevents self-links or sharing one configured output between two sources. Existing stock and receipt quantities are not changed when saving master data.

Edit opens the linked output fields and requires both source and output timestamps to match. Codes are unique without regard to letter case; inactive output masters must be restored first. Changing a source to PCS clears the configuration link while retaining the output Material and its stock/history. Older API clients can omit processingOutput; historical raw masters receive a new output when users complete the second dataset in the form.

Material list/detail and inventory responses include `processingMaterialId` and `processingMaterial`; receiving/processing lookups include the id. The processing dialog prefills its destination and packing size from the configured output, with the source ratio as the initial cutting yield. Users can still select another distinct active destination for an individual operation.

Migration `AddMaterialProcessingOutput1790600000017` was applied locally through a scoped TypeORM runner selecting only this migration. It adds the nullable foreign key, self-link check and unique partial index; existing Material records are not backfilled. No lint/tests/build/type checks or browser submission validation were run under R0.

## Quantities and lifecycle

- Supplier receipt: retain the entered raw units, with one full QR package before processing. Ratio and packing quantity do not convert raw stock.
- Processing consumes a whole-number quantity from one source receiving. Pieces per raw unit is prefilled from its master Ratio, editable for this operation.
- Good pieces = raw units × pieces per unit − scrap pieces. Require positive good output. Scrap is recorded separately and never received as good stock.
- Output packing uses the entered pieces per box, initially set from the chosen destination's master packing quantity. The final box may contain a remainder. One operation supports at most 5,000 boxes.
- A processing record links source receiving, source Material, each consumed source QR package and quantity, destination Material, and output receiving. Output receiving keeps `sourceReceivingId`, inherits source supplier/organization/supplier lot, and receives a new server-generated receiving number and internal lot with new box QR codes.
- Source processing status is independent of receiving status: `WAITING` (0 units processed), `PARTIAL` (some processed), `PROCESSED` (all original units processed). Normal issuing does not count as processing; availability may therefore reach 0 while processing status remains waiting/partial.
- Processed output is excluded from the raw-processing queue, even if the destination's shape is PIPE/SHEET/COIL.

Example: source Material PIPE-A, 1 pipe × 100 pieces, scrap 0, destination Material CUT-A, 50 pieces per box → source stock −1 pipe, destination stock +100 pieces, new receiving with 2 boxes of 50 pieces. With scrap 7, output is 93 pieces in boxes of 50 and 43.

## Atomicity and stock protection

The backend owns one TypeORM transaction for source consumption, stock movements, output receiving/QR creation and confirmation, processing history, processed quantity, and the Audit Event. Lock source receiving and QR packages before reading reservations; available quantity is package remaining quantity minus outstanding hard reservations (`reserved_quantity - issued_quantity`, unreleased rows). Then lock balances in stable Material-id order. Shortfall or any write/QR/audit failure aborts the transaction.

Each form session retains a UUID request key. A matching retry returns the original processing record without consuming stock again; a changed payload or different actor with the same key is rejected. Output receipts cannot be cancelled through the ordinary receiving endpoint, because that would remove the output without restoring the consumed source. Processing reversal is not part of this release.

Historical receipts with a converted `piecesQuantity` different from entered `receiveQuantity` remain visible but cannot be processed until their unit basis is reconciled. Existing stock and historical snapshots are not rewritten.

## API and permissions

### Report traceability across processing

Existing `/material-traceability/main-qr/:id`, `/receivings/:id` and `/sub-qr/:id` responses now include additive `processingHistory`. MAIN traces find committed processing records where the receipt is the source or output. SUB traces include output provenance and only source processing records whose `sourcePackages` contain that SUB QR id. The report's existing receiving-view OR disbursement-view guard protects these read-only fields; no extra manufacturing mutation permission is required.

Each entry contains source/output receiving ids and lots, both Materials, source shape/units, consumed quantity, cutting yield, scrap, good output, packing/package count, the exact source SUB QR quantities, operator, date and remark. Source MAIN traces expose processed quantity separately from ordinary issue history. Disbursement FIFO allocations expose receivingId so the document can drill directly into its supplying lot. Navigation supports raw lot → processing → output lot → SUB QR/issue document and back from issued pieces to the raw lot. Mixed source SUB QR consumption is reported as the recorded group, without inventing a piece-by-piece mapping to individual output boxes.

This reads existing `inventory.material_processings`; no migration or stock/history rewrite is needed. UI lineage calculations are explanatory and never replace the ledger reconciliation or mutate stock. Source inspection only; no automated checks or API/browser replay run under R0.

| Endpoint | Permission | Purpose |
| --- | --- | --- |
| `GET /material-processing?page=&search=&status=` | `MATERIAL_PROCESSING_VIEW` | Server-filtered and paginated raw receipts; all statuses by default |
| `GET /material-processing/lookups` | `MATERIAL_PROCESSING_VIEW` | Active Materials and units |
| `GET /material-processing/receivings/:id/history` | `MATERIAL_PROCESSING_VIEW` | All processing records for one source |
| `GET /material-processing/outputs/:id` | `MATERIAL_PROCESSING_VIEW` | Linked output receipt and box QR data |
| `POST /material-processing` | `MATERIAL_PROCESSING_CREATE` | Consume source and receive distinct destination atomically |

POST fields: `requestKey`, `sourceReceivingId`, `targetMaterialId`, `sourceQuantity`, `piecesPerUnit`, `scrapQuantity`, `packingQuantity`, optional `remark`. Inputs represent counts, so quantities/yield/packing are positive integers and scrap is a nonnegative integer.

## Implementation and rollout

### Receiving business date — 2026-10-08

Processing output receipt dates and receiving's future-date guard both use cps-api `src/common/business-date.ts#getBangkokDate` (`Asia/Bangkok`). The helper explicitly assembles Gregorian, Latin-digit `YYYY-MM-DD` from `formatToParts`, avoiding locale-dependent output layout. The old UTC guard could reject a valid Bangkok date between 00:00 and 06:59 local time. For example, `2026-10-07T17:10:00Z` is already `2026-10-08` in Bangkok. Actual future business dates remain rejected. No schema migration is needed. Inspected changed code only; no test/build/lint/typecheck or API replay run under R0.

### Raw receiving package-count constraint — 2026-10-08

Whole-unit raw receiving sets `packingQuantity = 1`, `packageCount = 1` and puts the full received quantity in that package. The original database constraint still required `package_count >= CEIL(receive_quantity / packing_quantity)`, so receiving more than one raw unit failed with `chk_material_receivings_package_count_fit`.

Migration `1790600000019-FixRawReceivingPackageCount` allows a single package only for PIPE/SHEET/COIL receipts without `source_receiving_id`, while retaining the original rule for all other receipts and historical multiple-package records. Positive quantity/packing/package-count constraints remain in place. Rollback refuses when existing whole-unit receipts would violate the old rule. Applied only this migration locally on 2026-10-08; inspected the stored constraint before and after. No historical stock or quantities were changed; no tests, build, lint, typecheck or receiving API replay was run under R0.

### Destination Material image

The third Material wizard step accepts an optional independent destination image (JPEG, PNG or WebP, up to 5 MiB), with a preview and file validation. Existing output images prefill edits and remain when no replacement is chosen. The shared image picker receives unique input, hint and error ids for each dataset.

Final create/update sends the staged image as `processingOutput.imagePath`. The backend promotes it inside the paired Material transaction, removes replaced output images after commit, and compensates both source/output promotions on rollback. Draft save accepts `outputImagePath`, retains it in the existing draft JSON `data.outputImagePath`, restores its preview on resume, and cleans it on replacement/deletion/final commit. Final saves copy the owned draft file before promotion to keep failed attempts resumable. This uses existing Material image and draft JSON columns; no migration is required. No automated validation or browser checks were run under AGENTS.md R0.

- Backend: `src/modules/material-processing`, `MaterialProcessing` entity, receiving service's transaction-local `receiveProcessedWithManager` seam, menu/permission seed registry.
- Migration `1790600000016-CreateMaterialProcessing` adds `inventory.material_processings` and additive receiving provenance/processed-quantity columns plus a MAIN menu and READ/CREATE permissions. Its rollback refuses to erase existing processing history.
- Frontend: Server Component page, Server Actions with session/permission checks, URL filters, RHF+zod processing dialog, history dialog, existing receiving detail/QR print components.
- Filters use the canonical search/status dropdown/chip modules. With only two supported criteria there is no advanced drawer, following the existing Job Orders exception; do not add placeholder criteria without API support.
- Stock traceability uses existing ISSUE movements on source QR packages and RECEIVE movements on output QR packages. Processing history supplies the cross-Material link.
- Regression tests cover the 1→100→2 example, scrap, invalid counts, package limit, reservation protection, output failure propagation, and idempotent retry. Tests/build/lint/type checks are not run automatically under AGENTS.md R0.

Local rollout on 2026-10-07: applied only `CreateMaterialProcessing1790600000016` through TypeORM's migration runner, within one migration transaction. No other pending migrations were included. The runner returned this migration as applied. Application endpoints and UI have not been executed for validation.


### Docker watcher recovery — 2026-10-07

The local API runs in Docker (cps-api-api-1), with the backend repository bind-mounted at /app. Windows file changes were visible in src/ while Nest watch retained old dist/ code, causing /api/v1/material-processing to return 404. docker-compose.yml now sets TSC_WATCHFILE=DynamicPriorityPolling and TSC_WATCHDIRECTORY=RecursiveDirectoryUsingDynamicPriorityPolling. Recreated only the API container using docker compose up -d --no-build --no-deps api; application startup registered all processing routes. Live application logs then showed 200 for the authenticated queue and lookups requests. An unauthenticated diagnostic request now returns 401 rather than 404, confirming the permission guard is active. No standalone lint/test/build/type-check command was run.
