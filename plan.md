# Plan: CRUD master data — สถานที่ (Location) และ สายการผลิต (Process Line)

## สถานะปัจจุบัน (ทำเสร็จแล้วในรอบนี้)

**Migration รันจริงแล้วบน dev DB** (`docker exec cps-api-api-1 pnpm run migration:run` — สำเร็จ):

1. [`1790200000000-AddAuditColumnsToLocationAndProcessLine.ts`](D:\project-cps\New\cps-api\src\database\migrations\1790200000000-AddAuditColumnsToLocationAndProcessLine.ts)
   เพิ่มคอลัมน์ `created_by`/`updated_by` ให้ `master.locations` และ `master.process_lines`
   (สองตารางนี้ถูกสร้างตั้งแต่ `1786700000005-RebuildProductsAndAddMasters.ts` ก่อนที่ convention
   created_by/updated_by จะมีในโปรเจกต์ — เหมือนกับที่เพิ่งแก้ให้ `product_types`/`product_models`/`customers`
   ไปเมื่อ 2 วันก่อนใน `1790100000000`)

2. [`1790200000001-AddLocationAndProcessLineMenusAndPermissions.ts`](D:\project-cps\New\cps-api\src\database\migrations\1790200000001-AddLocationAndProcessLineMenusAndPermissions.ts)
   สร้างเมนู + permission จริงใน `iam.menus`/`iam.permissions`:
   - `LOCATION_MANAGEMENT` → `/master-data/locations`, icon `map-pin`, permission `LOCATION_{VIEW,CREATE,UPDATE,DELETE}`
   - `PROCESS_LINE_MANAGEMENT` → `/master-data/process-lines`, icon `git-branch`, permission `PROCESS_LINE_{VIEW,CREATE,UPDATE,DELETE}`
   - ทั้งสองอยู่ใต้เมนูแม่ `MASTER DATA` (เหมือน Product Type/Model/Customer ที่เพิ่งทำไป), `sort_order: 13, 14`
   - ทั้งสองไฟล์เขียนแบบ idempotent (skip ถ้ามีเมนูอยู่แล้ว) และมี `down()` ย้อนกลับได้เต็ม

**สรุปสถานะ backend ก่อนหน้านี้ (ยืนยันจากการอ่านโค้ดจริง ไม่ใช่เดา):**
- `Location`/`ProcessLine` entity มีอยู่แล้ว (`src/entities/master/location.entity.ts`,
  `process-line.entity.ts`, ตาราง `master.locations`/`master.process_lines`) — สร้างพร้อม
  `Product.locationId`/`processLineId` FK ตั้งแต่แรก แต่**ไม่เคยมี module/controller/service/DTO
  ของตัวเอง** ค่า lookup ทุกวันนี้มาจากการ inject repository ตรงเข้าไปใน `ProductsService`
  แล้วส่งออกทาง `GET /products/lookups` เท่านั้น — ไม่มี endpoint `/locations` หรือ `/process-lines`
  แยกต่างหากเลย
- `Material.processLineName` เป็นแค่ **string column ธรรมดา** (`process_line_name`) ไม่ได้ join
  กับ `process_lines` จริง — ถ้าจะให้ Material อ้างอิง ProcessLine master ตัวจริงในอนาคต ต้องทำ
  migration แยก (เพิ่ม `process_line_id` FK + backfill, แบบเดียวกับที่ทำให้ `materials.material_type_id`
  ไปแล้ว) — **ไม่อยู่ใน scope ของแผนนี้**

## Phase ถัดไป (ยังไม่ได้ทำ — งานที่เหลือ)

### 1. Backend: สร้าง module `locations` และ `process-lines` (cps-api)

รูปแบบให้ก็อปปี้จาก `cps-api/src/modules/delivery-types/` (Shape A ที่โปรเจกต์ใช้ซ้ำมาแล้ว 6 ครั้ง)
โดย **Location มี field เพิ่มจาก Shape A มาตรฐาน 2 ตัว**: `zone`, `warehouse` (optional string)
ส่วน **ProcessLine เป็น Shape A ล้วน** (code/nameTh/nameEn/description/isActive)

ไฟล์ที่ต้องสร้างต่อ resource (×2):
- `src/modules/<resource>/<resource>.controller.ts` — 6 route (`GET /`, `GET /:id`, `POST /`,
  `PATCH /:id`, `DELETE /:id` = soft-deactivate, `PATCH /:id/restore`), guard ด้วย
  `JwtAuthGuard, ActiveAssignmentGuard, PermissionGuard` + `@RequirePermissions(<CODE>_<VERB>)`
- `src/modules/<resource>/<resource>.service.ts` — `create`/`update`/`deactivate`/`restore` wrap
  ใน `dataSource.transaction`, `update` ล็อก `pessimistic_write` + เช็ค `dto.updatedAt` ตรงกับแถวจริง
  (409 ถ้าไม่ตรง — optimistic concurrency แบบเดียวกับทุก simple master), `normalizeCode()`
  trim+uppercase, `assertCodeAvailable()` เช็ค unique (case-insensitive) ไม่รวมตัวเอง
- `src/modules/<resource>/<resource>.module.ts` — import `AccessControlModule` +
  `TypeOrmModule.forFeature([Location])` (หรือ `ProcessLine`), providers `[Service, PermissionGuard]`
- `src/modules/<resource>/location-permissions.ts` / `process-line-permissions.ts` — const
  `{ VIEW, CREATE, UPDATE, DELETE }` = `LOCATION_*` / `PROCESS_LINE_*` (**ตรงกับโค้ดที่ migration
  เพิ่งสร้างไว้ใน `iam.permissions` แล้ว** — ห้ามใช้ prefix อื่น)
- `src/modules/<resource>/dto/{create,update,list}-<resource>.dto.ts` — ใช้ shared
  `trimString`/`nullableTrimmedString`/`sourceValue` transform helper จาก `delivery-types/dto/`
  เป็นต้นแบบ; `UpdateDto` ต้องมี `updatedAt: @IsISO8601({strict:true})` required
- ลงทะเบียน module ใน `app.module.ts`
- เขียน `.spec.ts` คู่กับ controller/service (ทุก simple master มี test คู่กันเสมอ)

**ย้ำ**: `ProductsService`'s `locationRepository`/`processLineRepository` (สำหรับ `/products/lookups`)
**ไม่ต้องแก้** — เป็นคนละ concern กัน (lookup แบบ read-only เพื่อประกอบ dropdown ตอนสร้างสินค้า
vs. CRUD เต็มรูปแบบสำหรับหน้า admin) ปล่อยไว้แบบเดิม

### 2. Frontend: descriptor-based CRUD page (admin-dashboard)

ตาม R4 ("New simple-master CRUD resource → เขียน descriptor เดียว ห้ามเขียน 6 component เอง")
สองหน้าใหม่ทำตามสูตรเดียวกับ `/master-data/units`, `/master-data/suppliers` ที่มีอยู่แล้ว:

- `src/lib/api/locations.ts` / `process-lines.ts` — สร้างผ่าน `createResourceApi()` เท่านั้น
  (ไม่ copy ไฟล์จาก resource อื่นแล้วเปลี่ยนชื่อ — ดู § Master-data CRUD factories ใน AGENTS.md)
- `src/app/(dashboard)/master-data/locations/actions.ts` / `process-lines/actions.ts` — สร้างผ่าน
  `createCrudActions()`
- `src/lib/master-data/resources/location.ts` / `process-line.ts` — descriptor ใหม่ 1 ไฟล์ต่อ resource
  - Location: fields `code`/`nameTh`/`nameEn`/`description`/`zone`/`warehouse`/`isActive`
    (Shape A + 2 field พิเศษ — ใกล้เคียง Shape C ของ Categories แต่ไม่มี sortOrder/iconColor)
  - ProcessLine: fields Shape A มาตรฐานล้วนๆ (เหมือน `unit.ts`/`delivery-type.ts` เป๊ะๆ)
  - ทั้งสอง register ใน `src/lib/master-data/resources/index.ts`
- `src/app/(dashboard)/master-data/locations/page.tsx` / `process-lines/page.tsx` — 3 บรรทัด
  ครอบ `<MasterDataResourcePage resource={...} list={...} />` (ดู pattern การแก้ 2026-09-19
  ที่แยก `list` ออกจาก descriptor เพราะ leak `next/headers` เข้า client bundle — ต้องรับ `list`
  เป็น prop แยก ไม่ใส่กลับเข้าไปใน descriptor)
- test: `src/lib/api/locations.test.ts` + `locations-actions.test.ts` (10+10 test ตาม pattern เดิม
  ทุก resource อื่น), เหมือนกันสำหรับ process-lines
- เพิ่ม entry ใน `package.json`'s `test` script (explicit file list ไม่ใช่ glob)

**ไม่ต้องแก้ `src/lib/menu-icons.ts`** — `map-pin` และ `git-branch` มีอยู่แล้วในแมพ (ใช้ซ้ำตาม
migration ด้านบน)

### 3. อัปเดต AGENTS.md (ตาม R2)

หลังสร้างเสร็จ ต้องเพิ่ม:
- Project Structure: บรรทัดใหม่สำหรับ `master-data/locations/`, `master-data/process-lines/`,
  `lib/api/locations.ts`, `lib/api/process-lines.ts`
- Conventions: ส่วนใหม่ "Location (CRUD)" / "Process Line (CRUD)" ตาม pattern ที่ทำมาแล้ว 7 ครั้ง
  (Categories/Loading Points/Delivery Types/Reject Reasons/Material Models/Suppliers/Units)
- Recent Changes: entry สรุปการเพิ่ม migration + module + descriptor page วันนี้

## หมายเหตุขอบเขต

- **ไม่แตะ** `Material.processLineName` — ยังเป็น free-text ตามเดิม การเชื่อมกับ ProcessLine
  master จริงเป็นงานแยกในอนาคต (ถ้าต้องการ ต้องถามก่อนว่าจะแปลง `processLineName` เป็น
  `processLineId` FK หรือเก็บคู่กันไว้)
- **ไม่แตะ** `ProductsService`'s lookup logic — `/products/lookups` ยังทำงานเหมือนเดิมทุกอย่าง
- Backend module (Phase 1) เป็นงานที่ใหญ่ที่สุดที่เหลือ — แนะนำให้ทำทีละ resource
  (Location ก่อน แล้วค่อย Process Line) เพื่อลด risk ต่อรอบ
