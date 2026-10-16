# แผนการพัฒนาระบบขาย (Sales) — 2026-10-14

สถานะ: **ระยะที่ 1–5 ทำแล้ว** (ดู "สถานะ / ยังไม่ได้ทำ" ท้ายเอกสาร)

## เป้าหมาย

ปิดวงจรจากการผลิตไปถึงลูกค้า: กล่องสินค้าสำเร็จรูป (FG) ที่แพ็กพร้อม QR ในใบสั่งผลิต
ถูกขายออกตามออเดอร์ โดยสอบกลับได้ว่าส่งกล่องไหน (Lot ไหน) ให้ลูกค้าคนใด

1. สร้างออเดอร์ขาย — `/sales/orders`
2. สร้างใบจัดงานขาย — อัตโนมัติเมื่อยืนยันออเดอร์ (`/sales/job-orders`)
3. ตัดสต็อกขาย — สแกน QR กล่องเพื่อหยิบ แล้วตัดสต็อก (`/sales/job-orders/[id]`)
4. รายงานการขาย — `/reports/sales`

## การตัดสินใจ (ยืนยันกับผู้ใช้แล้ว)

| เรื่อง | ทางเลือกที่ใช้ |
| --- | --- |
| แหล่งสต็อก | กล่อง FG ที่แพ็กจากใบสั่งผลิตแบบ LOT (`inventory.production_packages`, สถานะ PACKED) สแกนด้วย QR กล่อง และลงบัญชีสต็อกสินค้าสำเร็จรูป (`product_stock_movements`) ควบคู่ |
| การจอง | จองตอนยืนยันออเดอร์ = สร้างใบจัดงานขาย แบบ hard reservation FIFO (กล่องเก่าสุดก่อน) all-or-nothing ถ้าไม่พอคืน `shortfalls` |
| ราคา | ไม่เก็บ — ออเดอร์/รายงานเป็นจำนวนชิ้นเท่านั้น |

## สถานะเอกสาร (state machine)

```
SalesOrder:    DRAFT ──confirm──▶ CONFIRMED ──issue บางส่วน──▶ PARTIALLY_SHIPPED ──ครบ──▶ SHIPPED
                 │ delete/cancel        │ cancel                     │ cancel (ปล่อยส่วนที่เหลือ)
                 ▼                      ▼                            ▼
              (ลบ)/CANCELLED        CANCELLED                    CANCELLED (ยอดที่ส่งแล้วคงอยู่ในรายงาน)

SalesJobOrder: WAITING_PICKING ──หยิบครบ──▶ READY_TO_ISSUE ──issue──▶ PARTIALLY_ISSUED ──▶ ISSUED
               └─────────── cancel ของออเดอร์ ─────────────▶ CANCELLED (ปล่อยการจองที่ยังไม่ตัด)
```

- แก้ไข/ลบได้เฉพาะ DRAFT; ยืนยันได้เฉพาะ DRAFT
- ตัดสต็อกได้เมื่อหยิบครบทุกกล่องแล้ว (READY_TO_ISSUE / PARTIALLY_ISSUED)
- ตัดสต็อกใช้เฉพาะกล่องที่จองไว้ให้ใบจัดงานนั้น ไม่รัน FIFO ซ้ำ

## โมเดลข้อมูล (cps-api migration `1790600000032-CreateSalesModule`)

ตารางใน schema `inventory`:

- `sales_orders` — `SO-YYYYMMDD-NNNN`, ลูกค้า, วันที่สั่ง/กำหนดส่ง, PO ลูกค้า, สถานะ, `version` (optimistic concurrency)
- `sales_order_lines` — สินค้า (ไม่ซ้ำในออเดอร์เดียว), `quantity`, `shipped_quantity`
- `sales_job_orders` — `SJ-YYYYMMDD-NNNN`, 1:1 กับออเดอร์, สถานะ, `version`, จำนวนครั้งที่พิมพ์
- `sales_job_order_reservations` — กล่องที่จอง (`package_id`), `reserved_qty`, `issued_qty`, picked/released
- `sales_shipments` — สมุดตัดสต็อกแบบ append-only (trigger ห้าม UPDATE/DELETE) เลขที่ใบส่งของ `DO-YYYYMMDD-NNNN` ต่อการกดตัดสต็อก 1 ครั้ง; unique `(request_id, reservation_id)` = idempotency

ยอดพร้อมขายต่อสินค้า = Σ `current_qty` ของกล่อง PACKED − Σ (`reserved_qty` − `issued_qty`) ของการจองที่ยังไม่ปล่อย

### เชื่อมกับบัญชีสต็อกสินค้าสำเร็จรูป

`src/common/product-stock-ledger.ts#postProductStockMovement` (ล็อกแถว product แบบเดียวกับ ProductStockService):

- แพ็กกล่อง FG ของสินค้า → `receive` (reference = QR กล่อง)
- ยกเลิกการแพ็ก (void) → `issue` (reference = `VOID-<QR>`)
- ตัดสต็อกขาย → `issue` (reference = เลข DO)
- migration backfill รับเข้ากล่อง PACKED ที่มีอยู่แล้ว (ข้ามกล่องที่มีรายการ reference เดียวกันแล้ว)

ยกเลิกการแพ็กถูกบล็อกถ้ากล่องถูกจองในใบจัดงานขาย

### ลำดับการล็อก (ป้องกัน deadlock / ขายเกิน)

- confirm: แถวออเดอร์ → กล่องของแต่ละสินค้า (เรียงตาม product id แล้ว package id) `FOR UPDATE` → คำนวณยอดจองหลังล็อก
- issue: แถวใบจัดงาน → การจอง → กล่อง (เรียง id) → product (เรียง id)
- เลขเอกสาร: `pg_advisory_xact_lock` ต่อ prefix+วัน (เวลาไทย)

## API (cps-api `src/modules/sales`)

| Method | Path | สิทธิ์ |
| --- | --- | --- |
| GET | `/sales-orders`, `/sales-orders/:id`, `/sales-orders/lookups` | `SALES_ORDER_VIEW` |
| POST | `/sales-orders` | `SALES_ORDER_CREATE` |
| PATCH | `/sales-orders/:id` (`version`) | `SALES_ORDER_UPDATE` |
| DELETE | `/sales-orders/:id?version=` | `SALES_ORDER_DELETE` |
| POST | `/sales-orders/:id/confirm` (`version`) — 409 `{ shortfalls[] }` ถ้าไม่พอ | `SALES_ORDER_CONFIRM` |
| POST | `/sales-orders/:id/cancel` (`version`, `reason`) | `SALES_ORDER_CANCEL` |
| GET | `/sales-job-orders`, `/sales-job-orders/:id` | `SALES_JOB_ORDER_VIEW` |
| POST | `/sales-job-orders/:id/print` | `SALES_JOB_ORDER_PRINT` |
| POST | `/sales-job-orders/:id/pick` (`version`, `qrCode`) | `SALES_JOB_ORDER_PICK` |
| POST | `/sales-job-orders/:id/issue` (`version`, `requestId` UUIDv4, `items[{reservationId, quantity}]`) | `SALES_JOB_ORDER_ISSUE` |
| GET | `/sales-reports?dateFrom&dateTo&customerId&productId&search&page&limit` | `SALES_REPORT_VIEW` |

## เมนู

MAIN ใหม่ `SALES` "การขายและจัดส่ง" (ลำดับก่อน รายงานและตรวจสอบ) มี SUB `SALES_ORDERS` และ
`SALES_JOB_ORDERS`; `SALES_REPORT` อยู่ใต้ `REPORTS_AUDIT` ไอคอน `shopping-cart`, `receipt`,
`package-check`, `chart-column` (เพิ่มใน `lib/menu-icons.ts`) migration ไม่ได้มอบสิทธิ์ให้ role ใด —
ต้องให้สิทธิ์ผ่านหน้าจัดการสิทธิ์ (SUPER_ADMIN เห็นทุกเมนูอยู่แล้ว)

## Frontend

- `src/lib/api/sales.ts`, `src/lib/filters/sales-filters.ts`, `src/app/(dashboard)/sales/actions.ts`
- `src/components/sales/*`: filter bar + pagination ร่วม, ฟอร์มออเดอร์ (RHF + zod, หลายรายการ, ไม่ให้เลือกสินค้าซ้ำ, แสดงยอดพร้อมขาย), dialog ยกเลิก/ขาดสต็อก/รายละเอียด, รายการใบจัดงาน, หน้ารายละเอียดใบจัดงาน (สแกนหยิบ, หยิบทั้งหมด, ตัดสต็อกพร้อม requestId, พิมพ์), รายงาน (KPI, กราฟรายวัน, ตามสินค้า/ลูกค้า, รายการรายกล่อง + CSV)

## ระยะงาน

1. ✅ ฐานข้อมูล + เมนู/สิทธิ์ + เชื่อมบัญชีสต็อกสินค้า (packing/void/backfill)
2. ✅ API ออเดอร์ขาย (CRUD ร่าง, ยืนยัน + จอง FIFO, ยกเลิก)
3. ✅ API ใบจัดงาน (พิมพ์, สแกนหยิบ, ตัดสต็อก idempotent)
4. ✅ API รายงาน
5. ✅ หน้าจอทั้ง 4 ส่วน

## สถานะ / การทดสอบ / ยังไม่ได้ทำ

- รัน migration แล้วทั้ง `cps_db` และ `cps_db_test`
- ทดสอบวงจรเต็มด้วยสคริปต์บน `cps_db_test` (กล่อง FG จริง 63 กล่อง): ขาดสต็อก rollback, ตรวจสินค้าซ้ำ/version, จอง FIFO, กฎการหยิบ, ตัดบางส่วน + replay requestId, ยกเลิกหลังส่งบางส่วน, ยืนยันพร้อมกัน 2 ออเดอร์แย่งกล่องเดียวกัน (ผ่าน 1 ไม่จองเกิน), ตัวเลขรายงาน — ผ่านทั้งหมด
- ทดสอบหน้าจอใน browser กับ `cps_db`: สร้างร่าง → ยืนยัน (แสดงกล่องขาด) → ลบร่าง, หน้าใบจัดงานและรายงานแสดงผลไม่มี error — 2026-10-15 ทดสอบหน้ารายละเอียดใบจัดงานใน browser กับ cps_db_test แล้ว (สแกนผิดถูกปฏิเสธ, สแกน QR ตัวพิมพ์เล็ก, หยิบทั้งหมด, ตัดสต็อก DO-20261015-0001 150 ชิ้น 3 กล่อง กล่องที่จองบางส่วนเหลือ 15 ชิ้น, รายงานแสดงรายการ) ยังไม่ได้ทดสอบการพิมพ์ใบจัดงาน
- ยังไม่ได้รัน lint / typecheck / unit tests / `pnpm test:production` (ตาม AGENTS R0) — ควรรัน `pnpm test:production` เพื่อยืนยันว่าการแพ็ก/void ยังผ่านหลังเพิ่มการลงบัญชีสต็อก
- ยังไม่ได้ทำ: ราคา/ใบแจ้งหนี้, การรับคืนสินค้า (return) / กลับรายการตัดสต็อก, การขายจากใบสั่งผลิตแบบ PACKET (กล่องเก่าไม่มีใน `production_packages`), แสดงข้อมูลการขายในหน้าสอบกลับการผลิต, permission-registry/seed (เมนูใหม่อยู่ใน migration เท่านั้น เช่นเดียวกับ Job Order)
