# Implementation Plan — Production Plan → ใบจัดงาน (Job Order) → จ่ายออก

> **Status**: PLAN ONLY — ยังไม่มีการแก้ Code
> **Date**: 2026-09-23
> **Repos**: Backend `D:\project-cps\New\cps-api` · Frontend `D:\project-cps\New\admin-dashboard`
> **Must read first**: `admin-dashboard/CONTEXT.md`, `admin-dashboard/docs/adr/0001-production-plan-reservations-block-disbursement.md`, `admin-dashboard/docs/handoffs/2026-09-22-production-plan-claude.md`, `cps-api/API_ENDPOINTS.md` § 18

---

## 0. TL;DR — ข้อค้นพบที่เปลี่ยนรูปแบบของงานนี้

Requirement ตั้งต้นว่า Flow เดิมคือ `Approve → ออกใบเบิก → ตัด Stock` และต้องเพิ่ม Reservation ใหม่ **แต่ Code จริงมี Reservation แบบ Package-level อยู่แล้ว** และ Approve **ไม่ได้ตัด Stock อยู่แล้ว**:

| Requirement ข้อ | สถานะใน Code ปัจจุบัน |
| --- | --- |
| Approve แล้ว Reserve Package ตาม FIFO | ✅ มีแล้ว — `ProductionPlansService.approve()` สร้าง `inventory.production_plan_reservations` ต่อ (Plan Line × Package) |
| Approve ห้ามตัด Stock | ✅ มีแล้ว — approve ไม่แตะ `remaining_quantity` / `stock_balances` |
| available = current − reserved | ✅ มีแล้ว — คำนวณสดจาก `remaining_quantity − SUM(active reserved_quantity)` ทั้งใน Plan approve และ Disbursement FIFO (ADR-0001 hard reservation) |
| จ่ายออกเฉพาะ Package ที่ Reserve ไว้ ห้าม FIFO ใหม่ | ✅ มีแล้ว — `ProductionPlansService.issue()` วน `reservations` ของแผนเท่านั้น ไม่เรียก FIFO |
| Transaction + Rollback | ✅ มีแล้ว — ทั้ง issue อยู่ใน `dataSource.transaction` เดียว, lock plan + package + stock balance |
| Cancel ก่อน Issue → Release, ไม่มี Stock IN | ✅ มีแล้ว — `releaseReservations()` แค่ set `released_at` |
| ใบจัดงาน (Job Order) เป็นเอกสาร | ❌ ไม่มี |
| เมนู "จัดการวัสดุ > ใบจัดงาน" | ❌ ไม่มี |
| Print ใบจัดงาน | ❌ ไม่มี |
| Picking step / สถานะ READY_TO_ISSUE | ❌ ไม่มี |
| Partial Issue | ❌ ไม่รองรับ — issue เป็น all-or-nothing |
| Idempotency เมื่อ Partial Issue | ❌ ไม่มี (ตอนนี้กันซ้ำได้ด้วย status check เพราะ all-or-nothing) |
| สิทธิ์ฝั่งคลัง | ❌ ใช้ `PRODUCTION_PLAN_ISSUE` ซึ่งเป็นสิทธิ์ของโมดูลแผนผลิต |

**ดังนั้นงานนี้ไม่ใช่การสร้าง Reservation ใหม่** แต่เป็น:
1. เพิ่มเอกสาร **Job Order** (1:1 กับ Production Plan) ที่ถูกสร้างใน transaction เดียวกับ approve
2. **ย้าย** logic `issue()` จาก `ProductionPlansService` ไปอยู่ที่ Job Order (Material Management) และเปิดให้ Partial Issue
3. **Reuse `production_plan_reservations` เป็นรายการหยิบ (pick lines)** — ไม่สร้าง `material_job_order_items` ซ้ำ
4. เพิ่มหน้า/เมนู/Print/Permission ฝั่งคลัง

---

## 1. Current Architecture (จาก Code จริง)

### 1.1 Backend (cps-api)

| Concern | File | หมายเหตุ |
| --- | --- | --- |
| Plan entity | `src/modules/production-plans/production-plan.entity.ts` | status `DRAFT/APPROVED/ISSUED/CANCELLED/EXPIRED`, `approved_by/at`, `issued_by/at`, `cancelled_*` |
| Plan line | `src/modules/production-plans/production-plan-line.entity.ts` | `product_id`, `bom_id` (ACTIVE BOM pinned), `quantity`, `need_by_date` |
| Reservation | `src/modules/production-plans/production-plan-reservation.entity.ts` | unique (`production_plan_line_id`,`material_receiving_package_id`), `reserved_quantity`, `released_at`, `release_type` (`ISSUED/CANCELLED/EXPIRED`), `released_by` |
| Service | `src/modules/production-plans/production-plans.service.ts` (1027 lines) | `approve()` L260, `issue()` L338, `cancel()` L535, `expireApprovedPlans()` L593, `buildMaterialDemands()` L746, `lockPackageAvailability()` L780, `assertSufficientStock()` L829, `releaseReservations()` L879, `allocatePlanCode()` L915 (advisory lock + MAX), `allocateDisbursementNo()` L935 (**duplicate** ของ disbursement service) |
| Controller | `src/modules/production-plans/production-plans.controller.ts` | `POST /production-plans/:id/issue` guarded by `PRODUCTION_PLAN_ISSUE` |
| Expiry job | `src/modules/production-plans/production-plan-expiry.job.ts` | `@Cron(EVERY_HOUR)` → APPROVED เกิน 3 วัน → EXPIRED + release |
| Permissions | `src/modules/production-plans/production-plan-permissions.ts`, `src/database/seeds/permission-registry.ts` L65/L160, migration `1790300000001-AddProductionPlanMenuAndPermissions.ts` (สร้าง action `APPROVE`,`ISSUE` ใน `iam.actions`) |
| Schema | `src/database/migrations/1790300000000-CreateProductionPlans.ts` | CHECK constraints ของ status/release_type/release_state, partial index `idx_production_plan_reservations_active_package`, FK `materials_disbursements.production_plan_id` |
| Disbursement | `src/modules/materials-disbursement/materials-disbursement.entity.ts` (`production_plan_id`, type `stock_cut|production`, status `draft|confirmed|cancelled`), `material-disbursement-item.entity.ts`, `material-disbursement-package.entity.ts` (allocation ต่อ package, `fifo_order`, `reversed_at`) |
| Disbursement FIFO | `materials-disbursement.service.ts#processFifoForItem` L693 | lock package `pessimistic_write` → ลบ active reservations ออกจาก available (ADR-0001) |
| Disbursement cancel | `materials-disbursement.service.ts#cancel` L420 / `revertFifoForItem` L876 | คืน `remaining_quantity` + stock balance — **ไม่รู้จัก Production Plan/Reservation** |
| Package | `src/entities/inventory/material-receiving-package.entity.ts` | `lot_detail_no` (= SUB QR), `package_no` (Box No.), `quantity` (immutable), `remaining_quantity` (live), status `pending/in_stock/partial/issued/damaged/returned/cancelled` |
| Receiving | `src/entities/inventory/material-receiving.entity.ts` | `internal_lot_no` (= MAIN QR/Lot), `supplier_lot_no`, `receive_date`, `material_id` — **ไม่มี location column** |
| Stock summary | `src/entities/inventory/stock-balance.entity.ts` | 1 แถวต่อ material, **ไม่มี location dimension** |
| Ledger | `src/common/stock-ledger.ts` | `recordStockMovement()` (write seam เดียวของ `stock_transactions`), `recordAuditEvent()` (เขียน `iam.audit_logs` ใน transaction เดียวกัน), `createTraceId()` |
| Audit log | `src/entities/iam/audit-log.entity.ts` | `action varchar(50)`, `target_type varchar(50)` — **ไม่มี DB CHECK**, แต่ TS union ใน `AuditEventInput` จำกัดค่าไว้ |
| Traceability | `src/modules/material-traceability/*` | อ่าน `stock_transactions` + `material_disbursement_packages`; ยังไม่อ่าน reservation |

### 1.2 Frontend (admin-dashboard)

| Concern | File |
| --- | --- |
| Page | `src/app/(dashboard)/production/plans/page.tsx` (7 permission flags รวม `canIssue`) |
| Actions | `src/app/(dashboard)/production/plans/actions.ts` (`issueProductionPlanAction`) |
| API client | `src/lib/api/production-plans.ts` |
| Row actions | `src/components/production-plans/production-plan-table.tsx#getProductionPlanRowActions` — APPROVED + `issue` → "ออกใบเบิก" |
| Client | `src/components/production-plans/production-plan-client.tsx` — `ConfirmDialog` "ออกใบเบิก" |
| Details | `src/components/production-plans/production-plan-details-dialog.tsx` — lifecycle rail (Stage "ออกใบเบิก"), BOM demand, reservations |
| Approve copy | `src/components/production-plans/production-plan-approve-dialog.tsx` L99 "ต้องออกใบเบิกภายใน 3 วัน" |
| Print pattern ที่มีอยู่ | `src/components/materials-receiving/materials-receiving-qr-print-sheet.tsx` (Portal + `hidden print:block` + `window.print()` + `afterprint`), `src/components/material-traceability/material-traceability-exports.tsx` (PDF แบบเดียวกัน), rule `#dashboard-shell { display:none }` ใน `globals.css` `@media print` — **ห้ามใช้ `window.open()`** (AGENTS.md ระบุว่า popup-blocker fragile) |
| Filter architecture | `src/lib/filters/*-filters.ts` + `ui/search-input.tsx` / `ui/filter-dropdown.tsx` / `ui/filter-chip.tsx` + staged Sheet drawer (R4) |
| Menu | สร้างจาก cps-api `iam.menus` (ไม่มี static list) — parent `MATERIALS_MANAGEMENTS` (`/materials`), icon map `src/lib/menu-icons.ts` |

### 1.3 Flow ปัจจุบัน

```
Production Plan DRAFT
  └─ POST /production-plans/:id/approve   (PRODUCTION_PLAN_APPROVE)
       tx: lock plan → build demands (isScrap=false, no wastage) → lock packages FOR UPDATE
           → assert sufficient (remaining − active reservations) → insert reservations (FIFO)
           → plan APPROVED → audit APPROVE
  └─ (≤ 3 วัน) POST /production-plans/:id/issue   (PRODUCTION_PLAN_ISSUE)  ← "ออกใบเบิก"
       tx: lock plan → load active reservations → lock packages FOR UPDATE
           → create MaterialsDisbursement(type=production, status=confirmed, production_plan_id)
           → per material: item + lock stock_balance → per reservation: remaining −= reserved,
             package status partial/issued, allocation row, recordStockMovement(ISSUE),
             reservation released(ISSUED)
           → plan ISSUED → audit STATUS_CHANGE
  └─ cancel → release(CANCELLED) / cron → release(EXPIRED)
```

---

## 2. Current Problem

1. **Responsibility อยู่ผิดที่** — การตัด stock (งานคลัง) อยู่ในหน้าแผนการผลิต และใช้สิทธิ์ `PRODUCTION_PLAN_ISSUE` ของฝ่ายวางแผน
2. **ไม่มีเอกสารหยิบของ** — Reservation มีอยู่แต่ไม่มีใบให้พนักงานคลังพิมพ์ไปหยิบ (QR/Box/Lot/Qty)
3. **All-or-nothing issue** — จ่ายบางส่วนไม่ได้ (`issue()` release ทุก reservation เป็น ISSUED ทีเดียว)
4. **ไม่มี Picking state** — ไม่มีจุดบันทึกว่าใครหยิบ/ตรวจ QR แล้ว
5. **Expiry 3 วันชนกับงานคลัง** — ถ้าหยิบของไม่ทันใน 3 วัน cron จะ release reservation ทั้งที่คลังกำลังเตรียมอยู่
6. **Disbursement ที่เกิดจาก Plan ยกเลิกได้จากหน้าจ่ายออก** — `cancel()` คืน stock แต่ Plan ยัง ISSUED และ reservation ถูก release ไปแล้ว (ADR/handoff ตั้งใจให้เป็น fire-and-forget) → เมื่อมี Job Order จะทำให้สถานะ Job Order ไม่ตรงความจริง
7. **Code ซ้ำ** — `allocateDisbursementNo`, `toScaled/fromScaled` ถูก copy ไว้ในทั้ง 2 service

---

## 3. Target Architecture

```
Production Planning                         Material Management (คลัง)
─────────────────────                       ─────────────────────────────────────────
DRAFT ──approve──► APPROVED ──────────────► Job Order WAITING_PICKING (สร้างใน tx เดียวกับ approve)
  (reserve packages, FIFO เดิม)                 │ print (บันทึก audit, ไม่เปลี่ยน stock)
                                                │ pick/verify QR ต่อรายการ
                                                ▼
                                             READY_TO_ISSUE
                                                │ issue (เฉพาะ reservation ของ JO นี้)
                                                ▼
                                             PARTIALLY_ISSUED ──issue──► ISSUED
                                                                           │
Plan APPROVED ◄───────────── sync ─────────────────────────────────────────┘ Plan ISSUED
Plan cancel/expire ──► release outstanding reservations ──► Job Order CANCELLED
```

**หลักการ**
- Plan ยังคงเป็นเจ้าของ **Reservation** (สร้างตอน approve — ไม่เปลี่ยน FIFO rule)
- Job Order เป็นเจ้าของ **Issue** (ตัด stock) — ย้ายมาจาก Plan
- Reservation row = pick line (ไม่มีตารางใหม่ซ้ำ)
- ทุก issue = 1 `MaterialsDisbursement` (type `production`, status `confirmed`) — partial issue หลายครั้ง = หลายเอกสาร DIS เชื่อมกลับด้วย `material_job_order_id` + `production_plan_id`

---

## 4. Existing Components That Can Be Reused

| ประเภท | สิ่งที่ reuse | ใช้ทำอะไร |
| --- | --- | --- |
| Entity | `ProductionPlanReservation` | เป็น pick line ของ Job Order (เพิ่ม column) |
| Entity | `MaterialsDisbursement` / `MaterialDisbursementItem` / `MaterialDisbursementPackage` | ผลลัพธ์ของการจ่ายออก (เหมือน `issue()` เดิม) |
| Entity | `MaterialReceivingPackage`, `MaterialReceiving`, `StockBalance` | ข้อมูล QR/Lot/Box/Supplier lot, ตัด qty |
| Service logic | `ProductionPlansService.issue()` L338–533 | **ย้าย** เป็น `MaterialJobOrdersService.issue()` + ขยายเป็น partial |
| Service logic | `approve()`, `lockPackageAvailability()`, `assertSufficientStock()`, `buildMaterialDemands()` | ไม่เปลี่ยน FIFO; เพิ่มแค่การสร้าง Job Order ท้าย tx และแก้สูตร outstanding |
| Service logic | `releaseReservations()` | ใช้ต่อ, แก้ให้ release เฉพาะ outstanding |
| Util | `src/common/stock-ledger.ts` `recordStockMovement` / `recordAuditEvent` / `createTraceId` | Ledger + audit ของ issue/print/pick |
| Util | `allocatePlanCode()` pattern (`pg_advisory_xact_lock` + MAX) | Job Order numbering |
| Guard/Decorator | `JwtAuthGuard`, `ActiveAssignmentGuard`, `PermissionGuard`, `@RequirePermissions`, `@CurrentUser` | controller ใหม่ |
| Migration pattern | `1790300000001-AddProductionPlanMenuAndPermissions.ts` | เมนู/สิทธิ์ใหม่ + action `PRINT`/`PICK` |
| Cron | `production-plan-expiry.job.ts` | ปรับเงื่อนไข expiry |
| FE primitives | `RowActionsMenu`, `ConfirmDialog`, `DialogContent fullScreenOnMobile`, `Badge`, `SearchInput`, `FilterDropdown`, `FilterChip`, `Sheet` | หน้า Job Order |
| FE pattern | `materials-receiving-qr-print-sheet.tsx` | Print ใบจัดงาน |
| FE pattern | `production-plan-*` (filters/table/details), `materials-disbursement-*` (status badges) | โครง list/detail |
| FE util | `src/lib/user-error.ts#apiErrorMessage`, `src/lib/session-expiry.ts#redirectIfSessionExpired` | Server Actions |

---

## 5. Database Changes (cps-api migration ใหม่ 1 ไฟล์ + menu/permission 1 ไฟล์)

### 5.1 `1790400000000-CreateMaterialJobOrders.ts`

**(a) ตารางใหม่ `inventory.material_job_orders`** (เอกสารหัว 1:1 กับ Plan)

| Column | Type | เหตุผล |
| --- | --- | --- |
| `id` | bigserial PK | convention |
| `code` | varchar(20) UNIQUE | `JO-YYYYMMDD-NNNN` |
| `production_plan_id` | bigint NOT NULL **UNIQUE** FK → `production_plans(id)` ON DELETE RESTRICT | 1 Plan = 1 Job Order; UNIQUE กันสร้างซ้ำ |
| `status` | varchar(20) CHECK IN (`WAITING_PICKING`,`READY_TO_ISSUE`,`PARTIALLY_ISSUED`,`ISSUED`,`CANCELLED`) | state machine |
| `version` | integer NOT NULL DEFAULT 1 | optimistic concurrency / idempotency ของ partial issue |
| `print_count` | integer NOT NULL DEFAULT 0 | ใครพิมพ์กี่ครั้ง (รายละเอียดอยู่ใน audit) |
| `last_printed_by` / `last_printed_at` | bigint / timestamp | |
| `completed_by` / `completed_at` | bigint / timestamp | ตอนเป็น ISSUED |
| `cancelled_by` / `cancelled_at` / `cancel_reason` | bigint / timestamp / varchar(500) | CHECK: CANCELLED ⇒ reason NOT NULL |
| `created_by`, `created_at`, `updated_at` | | convention |

Index: `status`, `created_at`.

**(b) แก้ `inventory.production_plan_reservations`** (reuse เป็น pick line)

| Column | Type | เหตุผล |
| --- | --- | --- |
| `issued_quantity` | numeric(18,4) NOT NULL DEFAULT 0, CHECK `0 <= issued_quantity <= reserved_quantity` | รองรับ partial issue; outstanding = reserved − issued |
| `picked_at` / `picked_by` | timestamp / bigint FK users | บันทึกการหยิบ (MATERIAL_PICKED) |
| `release_type` CHECK | ขยายเป็น `ISSUED`,`CANCELLED`,`EXPIRED`,`PARTIAL_CANCELLED`? — **ไม่ต้อง**: ใช้ค่าเดิม, แยก partial ด้วย `issued_quantity` | ไม่เพิ่ม enum โดยไม่จำเป็น |

Backfill: `UPDATE ... SET issued_quantity = reserved_quantity WHERE release_type = 'ISSUED'` (ข้อมูลเก่าที่ issue ครบแล้ว)

**(c) แก้ `inventory.materials_disbursements`**: `material_job_order_id bigint NULL` FK → `material_job_orders(id)` + index — ใช้ทั้ง traceability และกัน cancel จากหน้าจ่ายออก

**(d) แก้ `inventory.material_disbursement_packages`**: `production_plan_reservation_id bigint NULL` FK + index — trace ตรงจาก allocation → reservation (ตอนนี้ต้อง join ทางอ้อมผ่าน package+plan)

**(e) Backfill Job Order ให้ Plan ที่มีอยู่**
- Plan `APPROVED` → สร้าง JO `WAITING_PICKING`
- Plan `ISSUED` → สร้าง JO `ISSUED` และ set `material_job_order_id` ให้ disbursement ที่ `production_plan_id` ตรงกัน
- Plan `CANCELLED/EXPIRED` ที่เคย approve (`approved_at IS NOT NULL`) → JO `CANCELLED` (reason = cancel_reason ของ plan)
- ใช้ `created_at` ของ plan approve เป็นวันที่ใน code (เลขเรียงตาม `approved_at`)

**(f) Availability query ต้องเปลี่ยน** (ไม่ใช่ schema แต่ผูกกับ (b)) — ทุกที่ที่ `SUM(reserved_quantity)` ต้องเป็น `SUM(reserved_quantity - issued_quantity)`:
- `materials-disbursement.service.ts#processFifoForItem` (~L727)
- `production-plans.service.ts#lockPackageAvailability` (~L800)
- ไม่มีที่อื่น (ตรวจแล้วด้วย grep `production_plan_reservations`)

> **ไม่เพิ่ม `reserved_qty` column บน package** — ระบบคำนวณ available สดจาก ledger อยู่แล้ว (ADR-0001) การ denormalize จะสร้าง source of truth ที่สองที่ drift ได้

### 5.2 `1790400000001-AddMaterialJobOrderMenuAndPermissions.ts`

- `iam.actions`: เพิ่ม `PRINT` (พิมพ์), `PICK` (หยิบ/ตรวจ) — `ISSUE`, `CANCEL`, `READ` มีอยู่แล้ว
- `iam.menus`: `MATERIAL_JOB_ORDERS` "ใบจัดงาน"/"Job Orders", `SUB`, parent `MATERIALS_MANAGEMENTS`, path `/materials/job-orders`, icon `clipboard-check` — **sort_order ต้อง query sibling จริงก่อน** (ดู AGENTS.md rule เรื่อง live sort_order drift)
- `iam.permissions`: `MATERIAL_JOB_ORDER_VIEW`(READ), `MATERIAL_JOB_ORDER_PRINT`(PRINT), `MATERIAL_JOB_ORDER_PICK`(PICK), `MATERIAL_JOB_ORDER_ISSUE`(ISSUE), `MATERIAL_JOB_ORDER_CANCEL`(CANCEL — ใช้เฉพาะถ้าตอบคำถาม Q4 ว่าให้คลังยกเลิกได้)
- role_actions ให้ SUPER_ADMIN/ADMIN แบบ migration เดิม
- `PRODUCTION_PLAN_ISSUE`: **ไม่ลบ** ใน phase นี้ (มี department_permissions ผูกอยู่) — mark deprecated, endpoint เดิมถูกปิด (ดู 6)

---

## 6. Backend Changes (cps-api)

| Action | File | รายละเอียด / เหตุผล / Transaction boundary |
| --- | --- | --- |
| **Create** | `src/modules/material-job-orders/material-job-order.entity.ts` | Entity + `MATERIAL_JOB_ORDER_STATUSES` const |
| **Create** | `src/modules/material-job-orders/material-job-order-permissions.ts` | 5 codes ข้างบน |
| **Create** | `src/modules/material-job-orders/material-job-orders.service.ts` | `findAll`, `findOne` (header + plan + lines + reservations + package + receiving + material + disbursements), `markPrinted`, `pick`, `issue`, `createForPlan(manager, plan, userId)` (**รับ manager จากผู้เรียก — ไม่เปิด tx เอง**), `cancelForPlan(manager, planId, reason, userId)`, `allocateCode(manager)` |
| **Create** | `src/modules/material-job-orders/material-job-orders.controller.ts` | ดู § 8 |
| **Create** | `src/modules/material-job-orders/material-job-orders.module.ts` | `TypeOrmModule.forFeature([...])`, export service ให้ ProductionPlansModule |
| **Create** | `src/modules/material-job-orders/dto/{list-material-job-orders-query,issue-material-job-order,pick-material-job-order}.dto.ts` | validation |
| **Create** | `src/common/decimal.ts` | ย้าย `toScaled/fromScaled` (ซ้ำใน 2 service) มาไว้ที่เดียว |
| **Create** | `src/common/disbursement-number.ts` | ย้าย `allocateDisbursementNo` (ซ้ำใน 2 service) — **ผลลัพธ์ต้องเหมือนเดิม** (`DIS-YYYYMMDD-NNNN`, counter table เดิม) |
| **Modify** | `production-plans.service.ts#approve` | ท้าย tx: `await jobOrders.createForPlan(manager, plan, userId)` + audit `MATERIAL_RESERVED`/`JOB_ORDER_CREATED` → approve + reserve + JO เป็น **atomic** |
| **Modify** | `production-plans.service.ts#issue` | **ลบ logic ออก** ย้ายไป JobOrders; endpoint `POST /production-plans/:id/issue` → คืน `410 Gone` / `409` ข้อความไทย "ย้ายไปจ่ายออกที่ใบจัดงาน" (หรือ delegate — ดู Q6) |
| **Modify** | `production-plans.service.ts#cancel` | ถ้ามี JO: ห้าม cancel เมื่อ JO `PARTIALLY_ISSUED`/`ISSUED` (ดู Q3) มิฉะนั้น `releaseReservations` + `jobOrders.cancelForPlan` ใน tx เดียว |
| **Modify** | `production-plans.service.ts#expireApprovedPlans` | เงื่อนไขใหม่ (ดู Q2): expire เฉพาะ JO ที่ยัง `WAITING_PICKING` และ `issued_quantity` รวม = 0 |
| **Modify** | `production-plans.service.ts#releaseReservations` | release เฉพาะ `released_at IS NULL`; เก็บ `issued_quantity` ไว้ (ไม่ต้องแก้ logic มาก แต่ outstanding = reserved − issued) |
| **Modify** | `production-plans.service.ts#lockPackageAvailability` | สูตร `SUM(reserved - issued)` |
| **Modify** | `production-plans.service.ts#findOne/findAll` | join `jobOrder` (id, code, status) ให้หน้า Plan ลิงก์ได้ |
| **Modify** | `production-plan-reservation.entity.ts` | `issuedQuantity`, `pickedAt`, `pickedBy` |
| **Modify** | `production-plan.entity.ts` | `@OneToOne(() => MaterialJobOrder)` inverse |
| **Modify** | `production-plans.module.ts` | import `MaterialJobOrdersModule` |
| **Modify** | `production-plans.controller.ts` | `GET /production-plans/:id/job-order` (optional, ดู § 8) |
| **Modify** | `materials-disbursement.service.ts#processFifoForItem` | สูตร `SUM(reserved - issued)` |
| **Modify** | `materials-disbursement.service.ts#cancel` | ถ้า `material_job_order_id IS NOT NULL` → 409 "เอกสารนี้ออกจากใบจัดงาน ยกเลิกที่หน้านี้ไม่ได้" (ดู Q5) |
| **Modify** | `materials-disbursement.entity.ts`, `material-disbursement-package.entity.ts` | column FK ใหม่ |
| **Modify** | `src/common/stock-ledger.ts` | ขยาย `AuditEventInput.action` (`RESERVE`,`RELEASE`,`PRINT`,`PICK`,`ISSUE`,`COMPLETE`) และ `targetType` (`MATERIAL_JOB_ORDER`) — DB ไม่มี CHECK จึงไม่ต้อง migration |
| **Modify** | `src/app.module.ts` | register module |
| **Modify** | `src/database/seeds/{seed.ts,permission-registry.ts}` | menu + permission ให้ fresh install เหมือน migration |
| **Modify** | `src/modules/material-traceability/material-traceability.service.ts` | (Phase 7) แสดง JO code / reservation ใน drill-down ของ SUB QR |
| **Modify** | `API_ENDPOINTS.md` | § 18 แก้ issue, เพิ่ม § 19 Material Job Orders |
| **Modify** | `production-plans.service.spec.ts` | ย้าย test ของ issue ไป spec ใหม่ + test approve สร้าง JO |
| **Create** | `material-job-orders.service.spec.ts`, `material-job-orders.controller.spec.ts`, migration spec | § 14 |

---

## 7. Frontend Changes (admin-dashboard)

### 7.1 Production Plan
| Action | File | Change |
| --- | --- | --- |
| Modify | `src/lib/api/production-plans.ts` | type `ProductionPlan.jobOrder?: { id; code; status } \| null`; ลบ `issueProductionPlan` |
| Modify | `src/app/(dashboard)/production/plans/actions.ts` | ลบ `issueProductionPlanAction` |
| Modify | `src/app/(dashboard)/production/plans/page.tsx` | ลบ `canIssue`; เพิ่ม `canViewJobOrder = MATERIAL_JOB_ORDER_VIEW`, `canPrintJobOrder` |
| Modify | `src/components/production-plans/production-plan-table.tsx` | `getProductionPlanRowActions`: แทน "ออกใบเบิก" ด้วย "ดูใบจัดงาน" (link `/materials/job-orders/{jo.id}`) และ "พิมพ์ใบจัดงาน" (link `…?print=1`) เมื่อ `plan.jobOrder` มีอยู่; คอลัมน์สถานะใบจัดงาน |
| Modify | `src/components/production-plans/production-plan-client.tsx` | ลบ issue ConfirmDialog/handler; ใช้ `router.push` สำหรับ link actions |
| Modify | `src/components/production-plans/production-plan-details-dialog.tsx` | Stage "ออกใบเบิก" → "ใบจัดงาน"/"จ่ายออกแล้ว" ตามสถานะ JO, ปุ่ม "ดูใบจัดงาน" |
| Modify | `src/components/production-plans/production-plan-approve-dialog.tsx` | copy "ต้องออกใบเบิกภายใน 3 วัน" → "ระบบจะสร้างใบจัดงานให้คลังเตรียมวัตถุดิบ" |
| Modify | `src/components/production-plans/production-plan-table.test.tsx` (หรือไฟล์ test ที่มีอยู่) | row actions ใหม่ |

### 7.2 Material Management — Job Order List (`/materials/job-orders`)
| Action | File |
| --- | --- |
| Create | `src/lib/api/material-job-orders.ts` — types + `listMaterialJobOrders/getMaterialJobOrder/markPrinted/pick/issue` |
| Create | `src/lib/filters/material-job-orders-filters.ts` — `readMaterialJobOrderFilters/buildMaterialJobOrderChips` (search: JO/PP/product code; status; approvedDate from/to) |
| Create | `src/app/(dashboard)/materials/job-orders/page.tsx` — gate `MATERIAL_JOB_ORDER_VIEW`, URL filters, default status = open (`WAITING_PICKING,READY_TO_ISSUE,PARTIALLY_ISSUED`) |
| Create | `src/app/(dashboard)/materials/job-orders/actions.ts` — `perform*`/public wrapper pattern + `redirectIfSessionExpired` + `apiErrorMessage` |
| Create | `src/components/material-job-orders/job-order-client.tsx`, `job-order-filters.tsx`, `job-order-advanced-filters.tsx`, `job-order-table.tsx` (`getJobOrderRowActions` pure fn) |

คอลัมน์: JO No., PP No., วันที่ต้องใช้ (min need-by), สินค้า (code/name — หลายรายการแสดง "+N"), จำนวนผลิต, จำนวนวัสดุ (distinct material), จำนวนกล่อง (reservation rows), สถานะ, อนุมัติเมื่อ/โดย, สร้างเมื่อ/โดย, Action

### 7.3 Job Order Detail (`/materials/job-orders/[id]`)
- Create `src/app/(dashboard)/materials/job-orders/[id]/page.tsx` — Server Component; เลือก route แยกแทน dialog เพราะต้อง deep-link จากหน้า Plan และใช้งานหน้างานนาน (ข้อยกเว้นที่มีเหตุผลต่อ pattern dialog เดิม — R4)
- Create `src/components/material-job-orders/job-order-detail.tsx` — Production info, Material requirements (Required/Reserved/Issued/Outstanding ต่อ material), ตาราง pick lines ต่อ material: QR (`lotDetailNo`), Material, Lot (`internalLotNo`), Supplier Lot, Box No. (`packageNo`), Location (ดู Q1), Current (`remainingQuantity`), Reserved, Issued, To-issue, Picked ✓, Status
- Create `src/components/material-job-orders/job-order-pick-panel.tsx` — ช่องสแกน/พิมพ์ QR (keyboard-wedge scanner) → match `lotDetailNo` กับ pick line ของ JO นี้เท่านั้น; QR ผิด → error ชัดเจน; ไม่มี camera lib (ไม่เพิ่ม dependency)

### 7.4 Print ใบจัดงาน
- Create `src/components/material-job-orders/job-order-print-sheet.tsx` — ใช้ pattern เดียวกับ `materials-receiving-qr-print-sheet.tsx` (Portal → `hidden print:block`, `window.print()`, cleanup ด้วย `afterprint`) + checkbox `[ ]` ต่อกล่อง, ช่องลงชื่อ Prepared/Picked/Issued, QR code ของ JO (ใช้ string เท่านั้น เว้นแต่ Q7 ต้องการ QR image)
- ก่อนเปิด print dialog เรียก `markJobOrderPrintedAction` (audit `JOB_ORDER_PRINTED`, `print_count++`) — ไม่ block การพิมพ์ถ้า log ล้มเหลว
- `?print=1` บน detail page เปิด print อัตโนมัติ (ใช้ pattern strip param แบบ `?open=create`)

### 7.5 Material Issue Dialog
- Create `src/components/material-job-orders/job-order-issue-dialog.tsx` — `DialogContent fullScreenOnMobile size="xl"`, RHF + zod `mode:"onChange"`; default = outstanding ของทุก line ที่ picked; แก้ qty ได้ (≤ outstanding) ถ้ารองรับ partial; ส่ง `version` + `items[{reservationId, quantity}]`; แสดงผลรวมต่อ material; 409 stale → toast + `router.refresh()`

### 7.6 อื่น ๆ
- Modify `src/lib/menu-icons.ts` — `"clipboard-check": ClipboardCheck`
- Modify `src/components/materials-disbursement/materials-disbursement-table.tsx` — ซ่อน "ยกเลิก" เมื่อ `materialJobOrderId` มีค่า + badge ลิงก์ไป JO; `src/lib/api/materials-disbursement.ts` type
- Modify `AGENTS.md` (R2) — Project Structure, Conventions § Job Orders, Recent Changes
- Modify `CONTEXT.md` — เพิ่มศัพท์ **Job Order (ใบจัดงาน)**, **Pick**, ปรับนิยาม **Issue** ("ย้ายจาก Plan มา Job Order")

---

## 8. API Changes

| Method / Path | Permission | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `GET /material-job-orders` | `MATERIAL_JOB_ORDER_VIEW` | `page, limit, search, status (csv), approvedDateFrom/To` | `{ items: JobOrderListRow[], meta }` | 400 validation |
| `GET /material-job-orders/:id` | VIEW | — | header + plan(lines/product) + `materials[]` (required/reserved/issued) + `pickLines[]` (reservation+package+receiving+material) + `disbursements[]` | 404 |
| `POST /material-job-orders/:id/print` | `MATERIAL_JOB_ORDER_PRINT` | — | `{ printCount, lastPrintedAt }` | 404, 409 ถ้า CANCELLED |
| `POST /material-job-orders/:id/pick` | `MATERIAL_JOB_ORDER_PICK` | `{ version, reservationId, scannedCode }` | JO detail (status อาจเป็น READY_TO_ISSUE) | 400 QR ไม่ตรง line, 404 reservation ไม่ใช่ของ JO นี้, 409 stale version/สถานะ |
| `POST /material-job-orders/:id/issue` | `MATERIAL_JOB_ORDER_ISSUE` | `{ version, items: [{ reservationId, quantity }] }` (quantity > 0, ≤ outstanding, 4 decimals; `items` non-empty, unique reservationId) | JO detail + `disbursementId/No` | 400 validation, 404, **409** stale version / JO ISSUED หรือ CANCELLED / reservation released / package qty ไม่พอ, 422? → ใช้ 409 ตาม convention เดิม |
| `GET /production-plans/:id/job-order` | `PRODUCTION_PLAN_VIEW` | — | `{ id, code, status } \| null` — **อาจไม่จำเป็น** เพราะ `GET /production-plans/:id` จะ embed `jobOrder` อยู่แล้ว → แนะนำไม่สร้าง |
| `POST /production-plans/:id/issue` | — | — | **ปิด**: 410/409 พร้อมข้อความไทย | |
| `POST /material-job-orders/:id/cancel` | — | — | **ไม่สร้างใน phase แรก** — การยกเลิกผ่าน Plan cancel (Plan เป็นเจ้าของ reservation) เว้นแต่ Q4 ตอบว่าคลังต้องยกเลิกเองได้ | |
| `GET /material-job-orders/:id/print` | — | — | **ไม่สร้าง** — print ทำฝั่ง browser จาก detail payload (ไม่มี server PDF ใน project) | |

Error messages ผ่าน global Thai exception filter เดิม — เพิ่มคำแปลใน translator กลางของทั้ง 2 repo (`src/lib/user-error.ts`) ไม่ใช่ใน component

---

## 9. State Machine — Job Order

```
                 pick (ทุก line picked)
WAITING_PICKING ─────────────────────────► READY_TO_ISSUE
      │  ▲ (unpick? ไม่ทำ phase แรก)            │
      │                                          │ issue (บางส่วน)
      │ issue (ถ้า Q8 อนุญาตข้าม pick)           ▼
      │                                   PARTIALLY_ISSUED ──issue (ครบ)──► ISSUED (terminal)
      │                                          │
      └── plan cancel / expire ──► CANCELLED ◄───┘ (เฉพาะถ้า Q3 อนุญาต cancel หลัง partial)
READY_TO_ISSUE ── issue ครบในครั้งเดียว ──► ISSUED
```

| From | Event | To | Guard |
| --- | --- | --- | --- |
| (none) | Plan approve | WAITING_PICKING | ใน tx approve |
| WAITING_PICKING | pick line สุดท้าย | READY_TO_ISSUE | ทุก active reservation `picked_at IS NOT NULL` |
| READY_TO_ISSUE / PARTIALLY_ISSUED | issue, outstanding รวม > 0 | PARTIALLY_ISSUED | |
| READY_TO_ISSUE / PARTIALLY_ISSUED | issue, outstanding รวม = 0 | ISSUED | + Plan → ISSUED |
| WAITING_PICKING / READY_TO_ISSUE | Plan cancel / expire | CANCELLED | release outstanding |
| ISSUED / CANCELLED | any mutation | — | 409 |

Plan status **ไม่เพิ่มค่าใหม่**: Plan คง `APPROVED` ระหว่าง JO เปิดอยู่ แล้วเป็น `ISSUED` เมื่อ JO `ISSUED` (UI แสดงสถานะ JO ประกอบ)

---

## 10. Transaction Design — `MaterialJobOrdersService.issue()`

ทั้งหมดใน `dataSource.transaction(async manager => …)` เดียว; exception ใด ๆ → rollback ทั้งหมด (TypeORM behavior เดิมที่ `issue()` ใช้อยู่)

1. **Lock JO** `SELECT … FOR UPDATE` (`lock: pessimistic_write`); ถ้า `version !== dto.version` → 409 stale; status ∉ {READY_TO_ISSUE, PARTIALLY_ISSUED} → 409
2. **Lock Plan** `FOR UPDATE`; ต้อง `APPROVED`
3. **Load reservations** `WHERE id IN (:ids) AND line.production_plan_id = jo.production_plan_id AND released_at IS NULL` — จำนวนแถวต้องเท่ากับ `items.length` มิฉะนั้น 404/409 (**นี่คือจุดบังคับกฎข้อ 9: จ่ายได้เฉพาะ package ที่ reserve ให้ JO นี้** — ไม่มีการเรียก FIFO)
4. validate `quantity ≤ reserved − issued`; (ถ้า Q8 บังคับ pick) `picked_at IS NOT NULL`
5. **Lock packages** `FOR UPDATE ORDER BY pkg.id` (ลำดับคงที่กัน deadlock — pattern เดิม); ตรวจ `status IN ('in_stock','partial')` และ `remaining ≥ quantity`
6. **Allocate DIS no.** (`common/disbursement-number.ts`, counter row lock เดิม) → create `MaterialsDisbursement` (type `production`, status `confirmed`, `production_plan_id`, `material_job_order_id`, `trace_id = createTraceId('ISS')`)
7. ต่อ material: create `MaterialDisbursementItem`; **lock `stock_balances` FOR UPDATE**; ต้อง ≥ total
8. ต่อ reservation: `remaining −= qty`, package status `partial/issued`; insert `MaterialDisbursementPackage` (+`production_plan_reservation_id`); `recordStockMovement(ISSUE, subQrId=pkg.id, mainQrId=receiving.id, productionOrder=plan.code, referenceNo=jo.code)`; `reservation.issued_quantity += qty`; ถ้าครบ → `released_at=now, release_type='ISSUED'`
9. save stock balance (`quantity`, `last_movement_at`)
10. recompute outstanding ของ JO → status PARTIALLY_ISSUED/ISSUED; `version += 1`; ถ้า ISSUED → `completed_*`, Plan → ISSUED (`issued_by/at`)
11. `recordAuditEvent`: `MATERIAL_ISSUED` (JO), + `JOB_ORDER_COMPLETED` & Plan `STATUS_CHANGE` ถ้าครบ

**Approve boundary** (เดิม + เพิ่ม): lock plan → demands → lock packages → assert → insert reservations → plan APPROVED → **insert JO + allocate JO code (advisory lock)** → audits — ใน tx เดียว

**Cancel boundary**: lock plan → lock JO → (guard Q3) → release outstanding reservations → JO CANCELLED → plan CANCELLED → audits `RESERVATION_RELEASED`, `JOB_ORDER_CANCELLED` — **ไม่มี** `recordStockMovement` (stock ไม่เคยถูกตัด)

---

## 11. Concurrency Protection

| Risk | Mechanism |
| --- | --- |
| Double-click / API ซ้ำ (full issue) | Lock JO + status check → ครั้งที่สอง 409 (JO ISSUED) |
| Double-click / API ซ้ำ (partial issue) | `version` ใน body: ครั้งแรก version++ → ครั้งที่สองเห็น stale → 409 ไม่มี transaction ซ้ำ (สอดคล้อง convention optimistic concurrency `updatedAt` ของทั้ง app) + ปุ่ม disabled ระหว่าง pending (`useTransition`) |
| หลายเครื่องเปิด JO เดียวกัน | เหมือนข้างบน; ผู้แพ้ได้ 409 + refresh |
| Plan cancel ชน JO issue | ทั้งคู่ lock Plan row `FOR UPDATE` ก่อน → serialize; ลำดับ lock เดียวกัน: **JO → Plan → packages (id ASC) → stock_balance (material id ASC)** — ต้องปรับ `cancel()` ให้ lock ตามลำดับเดียวกัน (ตอนนี้ lock plan ก่อน) เพื่อกัน deadlock |
| Plan approve หลายแผนแย่ง lot | เดิม: lock package rows FOR UPDATE ก่อนอ่าน reservation (ADR-0001) — ไม่เปลี่ยน |
| Ordinary disbursement แย่ง lot ที่ reserve | เดิม: FIFO ลบ active reservation — แก้สูตรเป็น outstanding |
| Expiry cron ชน issue | cron ใช้ `lockPlan` + recheck สถานะ JO ภายใน tx |
| JO numbering race | `pg_advisory_xact_lock(hashtext('JO-YYYYMMDD-'))` + MAX (pattern `allocatePlanCode`) + UNIQUE constraint |
| สร้าง JO ซ้ำต่อ plan | UNIQUE `production_plan_id` |

---

## 12. Traceability

```
material_receivings (internal_lot_no = MAIN QR, supplier_lot_no, receive_date, supplier_id)
  └─ material_receiving_packages (lot_detail_no = SUB QR, package_no = Box)
       └─ production_plan_reservations (reserved, issued, picked_at/by, released_*)
            ├─ production_plan_lines → production_plans (approved_by/at, code PP-…)
            │                              └─ material_job_orders (code JO-…, print/complete/cancel by/at)
            └─ material_disbursement_packages (production_plan_reservation_id ใหม่, disbursed_qty, fifo_order)
                 └─ material_disbursement_items → materials_disbursements (DIS-…, production_plan_id, material_job_order_id, confirmed_by/at)
                      └─ stock_transactions (ISSUE, trace_id, main_qr_id, sub_qr_id, production_order=PP, reference_no=JO)
iam.audit_logs (trace_id = PP code / JO code): APPROVE, RESERVE, JOB_ORDER_CREATED, PRINT, PICK, ISSUE, COMPLETE, CANCEL, RELEASE
```

ตอบคำถาม "ใคร": Approve = `production_plans.approved_by`; Print = audit PRINT + `last_printed_by`; Pick = `reservations.picked_by`; Issue = `materials_disbursements.confirmed_by` + stock_transactions.created_by; เมื่อไร = timestamps เดียวกัน — **ไม่มีการลบ row ใด ๆ** (release ใช้ `released_at`)

### Audit event mapping (ใช้ `recordAuditEvent` เดิม — ไม่สร้าง logging ใหม่)

| Requirement event | action | targetType | ที่ไหน |
| --- | --- | --- | --- |
| PRODUCTION_PLAN_APPROVED | `APPROVE` (มีแล้ว) | PRODUCTION_PLAN | approve |
| MATERIAL_RESERVED | `RESERVE` (after: รายการ package/qty) | PRODUCTION_PLAN | approve |
| JOB_ORDER_CREATED | `CREATE` | MATERIAL_JOB_ORDER | approve |
| JOB_ORDER_PRINTED | `PRINT` | MATERIAL_JOB_ORDER | print |
| MATERIAL_PICKED | `PICK` | MATERIAL_JOB_ORDER | pick |
| MATERIAL_ISSUED | `ISSUE` | MATERIAL_JOB_ORDER | issue |
| JOB_ORDER_COMPLETED | `COMPLETE` | MATERIAL_JOB_ORDER | issue ครบ |
| JOB_ORDER_CANCELLED | `CANCEL` | MATERIAL_JOB_ORDER | plan cancel/expire |
| RESERVATION_RELEASED | `RELEASE` | PRODUCTION_PLAN | cancel/expire |

(ถ้าต้องการชื่อ event ตรงตาม requirement เป๊ะ ๆ สามารถใช้ชื่อยาวเป็น `action` ได้เพราะ column เป็น varchar(50) ไม่มี CHECK — ดู Q9)

---

## 13. Edge Cases

| Case | Handling |
| --- | --- |
| Stock ไม่พอตอน approve | เดิม: 409 + `shortfalls[]` — ไม่มี JO ถูกสร้าง (tx rollback) |
| Reserved stock ถูกแก้/ถูกใช้ | ordinary disbursement ถูก block โดย hard reservation; ถ้า package qty ต่ำกว่า outstanding ตอน issue → 409 ระบุ QR, ไม่ตัดอะไรเลย |
| Package ถูก disable (`damaged/cancelled/returned`) หลัง reserve | issue ตรวจ status → 409 "กล่อง {QR} ใช้งานไม่ได้" — **ไม่ auto-substitute** (กฎข้อ 9) ทางออก: cancel plan แล้วสร้างใหม่ (Q10: ต้องการ "re-allocate" ไหม) — Receiving cancel ต้องตรวจเพิ่มว่ามี active reservation หรือไม่ (ตอนนี้ยังไม่ตรวจ → ควร block ใน Phase 8) |
| Package qty ไม่ตรงตอน reserve | ดูบรรทัดบน |
| Plan cancel ก่อน issue | release ทั้งหมด, JO CANCELLED, ไม่มี stock IN |
| Plan cancel หลัง partial issue | ตาม Q3 (แนะนำ: block) |
| Issue ซ้ำ | version/status → 409 |
| Partial issue | `issued_quantity` + PARTIALLY_ISSUED |
| QR scan ผิด | pick endpoint 400 "QR นี้ไม่อยู่ในใบจัดงาน" |
| Package ของ Plan อื่น | reservationId ไม่อยู่ใน JO → 404; scan code ของ JO อื่น → 400 |
| Transaction fail กลางทาง | rollback ทั้งหมด (single tx) + test ด้วย mock throw |
| เปิดหลายเครื่อง | version lock |
| ยกเลิก DIS ที่มาจาก JO ในหน้าจ่ายออก | block 409 (Q5) — ป้องกัน reservation ถูก release ไปแล้วแต่ stock คืน |
| Expiry ระหว่างหยิบ | ตาม Q2 |
| Plan มีหลาย Line/หลาย Product | JO เดียวแสดงทุก line (group ตาม product → material → package) |
| Material เดียวกันใช้หลาย line | reservation แยก line อยู่แล้ว (unique line×package) — print รวมต่อ material แต่แสดง line ref |
| ข้อมูลเก่า Plan ISSUED / APPROVED | backfill § 5.1(e) |

---

## 14. Test Plan

**Unit (cps-api, Jest, mock manager แบบ spec เดิม)**
- `material-job-orders.service.spec.ts`: issue full → ISSUED + plan ISSUED; partial → PARTIALLY_ISSUED + `issued_quantity`; stale version 409; reservation ของ JO อื่น 404; qty > outstanding 400; package status invalid 409; package remaining < qty 409; stock balance insufficient 409; ไม่เคยเรียก FIFO query; pick QR ผิด 400; pick ครบ → READY_TO_ISSUE; print count/audit
- `production-plans.service.spec.ts`: approve สร้าง JO ใน tx เดียว (JO create throw → reservations ไม่ถูก save); cancel release + JO CANCELLED + ไม่มี `recordStockMovement`; cancel หลัง partial → 409 (Q3); expiry เงื่อนไขใหม่; `/issue` เดิมถูกปิด
- `materials-disbursement.service.spec.ts`: availability ใช้ `reserved − issued`; cancel DIS ที่มี JO → 409
- migration spec: backfill `issued_quantity`, JO ต่อ plan status, constraints

**Unit (admin-dashboard, node test + tsx)**
- `getJobOrderRowActions`, `getProductionPlanRowActions` (ไม่มี "ออกใบเบิก" แล้ว), filters read/chips, issue-dialog zod schema (qty ≤ outstanding, ≥ 1 item), `job-order-print-sheet` SSR render (QR/Lot/Box/Qty/checkbox)
- actions test (`perform*` + fetch mock): URL/body/`version`, 409 → Thai message, missing token redirect

**Integration (cps-api ต่อ DB จริง/Docker)**
- approve → JO + reservations; ordinary disbursement ไม่สามารถกิน reserved lot; partial issue 2 ครั้ง → 2 DIS, stock_transactions per package, balance ถูกต้อง
- rollback: บังคับ error หลัง step 8 → package/balance/reservation/JO ไม่เปลี่ยน

**Stock Consistency**
- หลังทุก scenario: `SUM(stock_transactions in−out) == stock_balances.quantity` (ใช้ reconciliation ของ material-traceability `hasMismatch=false`); `SUM(remaining_quantity of in_stock/partial) == stock_balances.quantity`; `issued_quantity ≤ reserved_quantity`

**Concurrency**
- 2 issue พร้อมกัน JO เดียว version เดียว → 1 สำเร็จ 1 409, ledger มีชุดเดียว
- plan cancel ‖ issue → serialize ไม่มี deadlock, ผลเป็นหนึ่งในสองแบบที่ถูกต้อง
- 2 plans approve แย่ง lot เดิม (regression)

**E2E (browser, temp SUPER_ADMIN ตาม convention ของ repo)**
- Approve plan → เห็น JO ในเมนู จัดการวัสดุ > ใบจัดงาน → print (ตรวจ print sheet) → scan QR → จ่ายบางส่วน → จ่ายครบ → Plan ISSUED → Traceability SUB QR แสดง JO/PP

---

## 15. Implementation Phases

| Phase | Files | Changes | Acceptance Criteria | Risk |
| --- | --- | --- | --- | --- |
| **1 Domain/Data Model** | migrations `1790400000000`, `1790400000001` (+spec), entities (JO new, reservation, disbursement, disbursement-package), `common/decimal.ts`, `common/disbursement-number.ts`, `CONTEXT.md` | schema + backfill + menu/permission; refactor duplicate helpers (no behavior change) | migration up/down สะอาด; backfill ถูกต้องบน DB dev; test เดิมผ่านทั้งหมด | backfill ผิดสถานะ; `down` ต้องคืน constraint เดิม |
| **2 Approval + Reservation** | `production-plans.service.ts` (approve/cancel/expire/lockPackageAvailability), `materials-disbursement.service.ts` (FIFO outstanding), `production-plan-expiry.job.ts`, `stock-ledger.ts` | approve สร้าง JO atomically; availability = outstanding; cancel/expire sync JO | approve ไม่ตัด stock, JO ถูกสร้าง, FIFO rule ไม่เปลี่ยน (regression test เดิมผ่าน) | แก้ FIFO ที่ shipped แล้ว (ADR-0001) |
| **3 Job Order Backend (read/print/pick)** | `src/modules/material-job-orders/*`, `app.module.ts`, seeds, `API_ENDPOINTS.md` | list/detail/print/pick endpoints | API ตาม § 8, permission guard ถูกต้อง | payload detail ใหญ่ (N+1) → ใช้ query builder join ครั้งเดียว |
| **4 Job Order UI** | `lib/api/material-job-orders.ts`, `lib/filters/…`, `materials/job-orders/{page,actions,[id]/page}.tsx`, `components/material-job-orders/*`, `menu-icons.ts`; production-plan FE changes (§ 7.1) | list + detail + pick panel; Plan page เปลี่ยนเป็น "ดูใบจัดงาน" | เมนูแสดงเมื่อมีสิทธิ์; Plan APPROVED ไม่มี "ออกใบเบิก" | ช่วง deploy: FE เก่า + BE ใหม่ → ต้อง deploy BE/FE พร้อมกัน |
| **5 Print** | `job-order-print-sheet.tsx`, `globals.css` (ถ้าต้องเพิ่ม print rule) | print ใบจัดงาน + audit | พิมพ์ได้ใน Chrome/Edge, ไม่ใช้ popup, ข้อมูลครบตาม § 7 requirement | layout A4 ภาษาไทย/ตัดหน้า |
| **6 Material Issue** | `material-job-orders.service.ts#issue`, controller, `job-order-issue-dialog.tsx`, ปิด `POST /production-plans/:id/issue`, block DIS cancel | partial issue + version idempotency | AC 7–11 ผ่าน; ไม่มี FIFO ในเส้นทาง issue | ความถูกต้องของ stock — highest risk |
| **7 Audit/Traceability** | `stock-ledger.ts`, `material-traceability.service.ts` + FE details | events ครบ, SUB QR drill-down แสดง PP/JO | trace PP → Lot/QR ได้ | — |
| **8 Testing/Hardening** | specs ทั้งหมด § 14, receiving-cancel guard ต่อ active reservation, AGENTS.md | concurrency/consistency tests, docs | lint/tsc/test/build ผ่านทั้ง 2 repo (รันเมื่อได้รับอนุญาต — R0) | test concurrency บน DB จริง |

---

## 16. Final Flow

```
Production Plan (DRAFT)
→ Approve                                   [PRODUCTION_PLAN_APPROVE]
→ Calculate Material Requirement            (BOM ACTIVE, isScrap=false, no wastage — เดิม)
→ Allocate FIFO Packages                    (remaining − outstanding reservations — เดิม)
→ Reserve Packages                          (production_plan_reservations — เดิม)
→ Create Job Order (WAITING_PICKING)        (ใหม่, tx เดียวกับ approve)
→ Print Job Order                           [MATERIAL_JOB_ORDER_PRINT]  audit PRINT
→ Warehouse Picking + QR verify             [MATERIAL_JOB_ORDER_PICK]   → READY_TO_ISSUE
→ Confirm Issue                             [MATERIAL_JOB_ORDER_ISSUE]  (version)
→ Deduct Reserved Packages only             (ห้าม FIFO ใหม่)
→ Material Transaction                      (MaterialsDisbursement + stock_transactions ISSUE)
→ Update Stock                              (stock_balances, package remaining/status, reservation issued_qty)
→ Job Order Completed (ISSUED) → Production Plan ISSUED
```

---

## 17. Open Questions / Conflicts (ต้องตอบก่อน Implement)

- **Q1 Location**: ไม่มี location ต่อ package/receiving และ `stock_balances` ไม่มีมิติ location — ใบจัดงานจะแสดง "Location" จากอะไร? ตัวเลือก: (a) `materials.loading_point_id` (จุดขึ้นสินค้า) เป็น proxy, (b) ไม่แสดง, (c) เพิ่ม `location_id` ให้ receiving (งานใหญ่แยก)
- **Q2 Expiry 3 วัน**: เมื่อมี JO แล้วยังให้ auto-expire หรือไม่? แนะนำ: expire เฉพาะ JO `WAITING_PICKING` ที่ยังไม่หยิบ/ไม่จ่าย; หยุดนับเมื่อเริ่มหยิบ
- **Q3 Cancel หลัง Partial Issue**: แนะนำ block (409) — ถ้าต้องการปิดยอดคงค้าง ควรเป็น action "ปิดใบจัดงาน (Short-close)" แยก ซึ่งจะทำให้ Plan เป็นสถานะใด?
- **Q4 คลังยกเลิกใบจัดงานเองได้ไหม** หรือยกเลิกผ่าน Plan เท่านั้น (แนะนำ: ผ่าน Plan — Plan เป็นเจ้าของ reservation)
- **Q5 DIS ที่ออกจาก JO**: block การยกเลิกจากหน้าจ่ายออก (แนะนำ) — ขัดกับ decision #10 ใน handoff 2026-09-22 ที่ให้ยกเลิกที่หน้า Disbursement ได้ → ต้องยืนยัน
- **Q6 `POST /production-plans/:id/issue`**: ปิด (แนะนำ) หรือคงไว้ให้ delegate ไป JO full-issue ช่วงเปลี่ยนผ่าน? และลบ permission `PRODUCTION_PLAN_ISSUE` เมื่อไร
- **Q7 Print**: ต้องมี QR image ของ JO/กล่องบนใบจัดงานไหม (package `qr_code` data URL มีอยู่แล้ว — พิมพ์ได้แต่ใบยาว)
- **Q8 Picking บังคับไหม**: ต้อง scan/pick ครบก่อนจ่าย (WAITING_PICKING → READY_TO_ISSUE) หรืออนุญาตจ่ายจาก WAITING_PICKING ได้เลย? Partial issue จ่ายได้เฉพาะกล่องที่ pick แล้ว?
- **Q9 Audit naming**: ใช้ action vocabulary เดิม (`PRINT/PICK/ISSUE/...` + targetType `MATERIAL_JOB_ORDER`) หรือชื่อ event ตาม requirement (`JOB_ORDER_PRINTED`, …)?
- **Q10 Package เสีย/ถูกยกเลิกหลัง reserve**: ต้องมี "re-allocate" (FIFO ใหม่เฉพาะส่วนที่ขาด โดยผู้มีสิทธิ์) หรือบังคับ cancel plan แล้วสร้างใหม่?
- **Q11 JO ต่อ Plan หรือต่อ Line**: Plan เป็น multi-product; requirement ตัวอย่างเป็น 1 product → แนะนำ 1 JO ต่อ Plan (UNIQUE) — ยืนยัน
- **Q12 Numbering**: `JO-YYYYMMDD-NNNN` (daily, ตาม DIS) หรือ `JO-YYYYMM-NNNN` (monthly, ตาม PP)?
