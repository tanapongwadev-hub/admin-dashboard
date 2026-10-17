# Handoff — เมนู workspace, ผลิตวัตถุดิบภายใน, ขาย, คู่มือ และจัดการสิทธิ์

วันที่: 2026-10-17 · เขตเวลา Asia/Bangkok · ต่อจาก [2026-10-11-materials-bom-workflow.md](./2026-10-11-materials-bom-workflow.md)

## สถานะสำหรับผู้รับช่วงต่อ

ไฟล์นี้สรุปงานตั้งแต่ 2026-10-12 ถึง 2026-10-17 งานที่ผู้ใช้ขอในช่วงนี้เสร็จแล้ว ยกเว้นสิ่งที่ระบุไว้ใน "งานค้าง / ยังไม่ได้ตรวจ" ด้านล่าง

- Frontend: `admin-dashboard` (branch `development`, commit ล่าสุด `df6ba9d`) · Backend: `cps-api`
- ทั้งสอง repo มีข้อความ commit ทั่วไป ("update", "update ui") ให้ใช้ส่วน Recent Changes ใน `AGENTS.md` เป็นบันทึกรายละเอียดที่ถูกต้อง
- Migration cps-api ที่เพิ่มในช่วงนี้รันบน `cps_db` แล้ว (ช่วง `1790600000024`–`1790600000035`); `033`/`034` รันบน `cps_db_test` ด้วย
- ก่อนแก้งานต่อให้อ่าน `AGENTS.md` โดยเฉพาะ R0: **รัน tests/lint/build/typecheck เฉพาะเมื่อผู้ใช้ขอโดยตรง** ใช้ pnpm และอ่าน guide ใน `node_modules/next/dist/docs/` ก่อนแก้โค้ด Next.js

## 1. โครงสร้างเมนูและ URL ใหม่ (2026-10-13)

เมนูหลักถูกจัดเป็น 7 workspace ผ่าน migration `1790600000030-OrganizeWorkspaceMenus` แล้วย้าย URL ให้ตรงหมวดผ่าน `1790600000031-AlignWorkspaceMenuPaths` ID/permission/visibility ของเมนูเดิมยังคงไว้ และ endpoint ของ API ไม่เปลี่ยน

| URL ใหม่ | เดิม |
| --- | --- |
| `/materials/catalog` | `/materials/pc` |
| `/materials/receiving`, `/materials/disbursements` | `/materials/materials-receiving`, `/materials/materials-disbursement` |
| `/production/products/{plans,orders}` | `/production/plans`, `/products/process-orders` |
| `/production/internal-materials/{plans,orders}` | `/production/material-plans`, `/materials/process-orders` |
| `/engineering/products`, `/engineering/bom` | `/products`, `/bom-workflow` |
| `/reports/{materials,production,audit-logs,analytics}` | หน้า report/audit/analytics เดิม |
| `/system/{menus,users,settings,permissions}` | หน้าระบบที่เคยอยู่ระดับ root |

URL เดิม redirect แบบ 308 จาก `src/lib/legacy-menu-paths.ts` ผ่าน `next.config.ts` (คง suffix และ query) ลิงก์ใหม่และ `revalidatePath` ต้องใช้ path ใหม่เท่านั้น รายละเอียดอยู่ที่ [menu-organization.md](../menu-organization.md)

**หมายเหตุ:** handoff ฉบับก่อนอ้าง `/materials/pc` และ `/bom-workflow/materials` ตอนนี้คือ `/materials/catalog` และ `/engineering/bom/materials`

## 2. แผนผลิตและสั่งผลิตวัตถุดิบภายใน (2026-10-12)

- แผนผลิตรับปลายทางเป็น Material ภายในที่ไม่ใช่ PIPE/SHEET/COIL ได้ ตราบที่มี Material BOM ACTIVE; ใช้ FIFO reservation และ Job Order ชุดเดียวกับสินค้า (migration `024`)
- เมนูแยก "แผนผลิตสินค้า" กับ "แผนผลิตวัตถุดิบภายใน" (`025`, `026`) API กรองด้วย `targetType`; แผนเก่าที่ปนสองแบบแสดงทั้งสองหน้า Excel import ใช้กับสินค้าเท่านั้น
- ใบจัดงานแยกเมนูสินค้า/วัตถุดิบภายใน (`027`); การสั่งผลิตตามกระบวนการแยกเมนูเช่นกัน (`028`)
- สั่งผลิตวัตถุดิบภายในใช้ LOT/PACKET แบบเดียวกับสินค้า โดยผูก Material Workflow (`029`) กล่องที่ผลิตเสร็จถูกรับเข้าสต็อกวัตถุดิบอัตโนมัติผ่าน `MaterialProductionReceiptService`; QR การผลิตเป็น SUB QR ของสต็อก ใบรับเข้าจากการผลิตยกเลิกเองไม่ได้
- Material ที่มี BOM รับเข้าเองไม่ได้ ต้องรับจากการปิดงานผลิตเท่านั้น (2026-10-17; API ตอบ 409 และฟอร์มซ่อนวัสดุเหล่านี้)

รายละเอียด: [material-production-plans.md](../material-production-plans.md), [bom-workflow.md](../bom-workflow.md)

## 3. ระบบขาย (2026-10-14)

ใบสั่งขาย (`/sales/orders`) → ใบจัดงานขาย + สแกนหยิบ + ตัดสต็อก (`/sales/job-orders`) → รายงานขาย (`/reports/sales`) Backend อยู่ที่ `cps-api/src/modules/sales`, migration `032`

- สต็อกที่ขายได้คือกล่อง FG ที่แพ็กแล้ว (`production_packages` PACKED) การยืนยันใบสั่งขายจองกล่องแบบ FIFO ทั้งหมดหรือไม่จองเลย (409 พร้อม `shortfalls[]`)
- การตัดสต็อกได้เลข `DO-` และ idempotent ตาม `requestId`; การแพ็ก/ยกเลิกแพ็กลงบัญชีสต็อกสินค้าผ่าน `product-stock-ledger.ts`
- สิทธิ์ `SALES_*` อยู่ใน migration เท่านั้น ต้อง grant ผ่าน IAM

แผนพัฒนา: [2026-10-14-sales-module-plan.md](../plans/2026-10-14-sales-module-plan.md)

## 4. คู่มือการใช้งาน (2026-10-16)

`/manuals` และ `/manuals/[slug]` เป็น Server Components ล้วน เนื้อหาเป็นข้อมูลคงที่ใน `src/lib/manuals/content.ts` (20 คู่มือ 8 หมวดตาม sidebar) ภาพหน้าจออยู่ที่ `public/manuals/<slug>/` และมีหมายเลขกำกับสีแดงตรงกับคำอธิบายแต่ละข้อ สร้างภาพใหม่ด้วย `node scripts/capture-manual-screens.mjs [slug ...]`

เมื่อหน้าจอใดเปลี่ยน ต้องแก้ข้อความขั้นตอน, marks ใน PLAN และภาพหน้าจอไปพร้อมกัน สิทธิ์ `USER_MANUAL_VIEW` เปิดให้ทุก role ที่มี READ (migration `033` ของคู่มือ)

มีสคริปต์บันทึกวิดีโอการเพิ่มวัสดุแยกตามชนิดเหล็ก: `scripts/record-material-create-guide.mjs` ทุกครั้งที่รันจะสร้างวัสดุ demo จริงใน dev DB (รหัส `DEMO-<TYPE>-<stamp>`) ส่วน `record-materials-guide.mjs` ตอน create ยังใช้ฟอร์มแบบเก่าก่อนมี wizard และล้าสมัยแล้ว

## 5. จัดการสิทธิ์ `/system/permissions` (2026-10-17)

หน้าใหม่สำหรับ SUPER_ADMIN มี 3 แท็บ:

| แท็บ | หน้าที่ | Backend |
| --- | --- | --- |
| ตามแผนก | ตาราง แผนก × เมนู × action; กดเปิด/เปิดทุกแผนก/ปิด แล้วบันทึกครั้งเดียวพร้อมเหตุผล | `GET /permissions/matrix`, `PUT /permissions/access` (ตรวจ version 409) |
| Role | checkbox role × action (SUPER_ADMIN อ่านอย่างเดียว) | `PUT /roles/actions` |
| ผู้ใช้ | ALLOW/DENY รายบุคคลต่อ assignment พร้อมวันหมดอายุ | `GET/PUT /users/:id/assignments/:assignmentId/permissions` |

กติกาสำคัญ:

- `iam.permissions.access_scope` มีค่า `ALL` หรือ `DEPARTMENTS` (migration `034`); `DEPARTMENTS` ที่ไม่มีแผนกเลยหมายถึงไม่มีใครได้
- DENY ที่ยังไม่หมดอายุชนะเสมอ ALLOW ใช้ข้ามแผนกได้ override ที่หมดอายุไม่นับ
- เปิด action อื่นจะเปิด READ ให้ด้วย ปิด READ จะปิดทั้งเมนู
- การแก้ override ไม่ทำให้ session หลุด (ไม่ bump `permissionVersion`)
- กฎ frontend อยู่ที่ `src/lib/permission-matrix.ts` (มี test); กฎ backend อยู่ที่ `access-control/permission-access.ts`
- migration `035` ให้ 3 เมนูที่ไม่มีสิทธิ์นำทางของตัวเองได้สิทธิ์ `*_VIEW` แล้ว: `MATERIALS_PC_OVERVIEW`, `PRODUCTION_TRACEABILITY`, `MATERIALS_REPORT`

แผนออกแบบ: [2026-10-17-permission-management-plan.md](../plans/2026-10-17-permission-management-plan.md); API: `cps-api/API_ENDPOINTS.md` §4.5

## 6. งานเล็กอื่นที่ควรรู้

- **Select ทั้งแอปค้นหาได้** ผ่าน `ui/select.tsx`; ห้ามใช้ native `<select>` หรือ Select2 `SearchableFilterSelect` เป็น adapter ของตัวเดียวกัน
- **พิมพ์ QR** ทุกจุดใช้ `data-qr-print-sheet` เพื่อซ่อน dialog/toast ตอนพิมพ์ ป้ายการผลิตพิมพ์ 8 ป้ายต่อ A4 (93.5 × 62 มม.) ปุ่ม "พิมพ์ QR งานค้าง" บน process board พิมพ์ซ้ำยอดคงเหลือ
- **`/materials/catalog`**: แท็บรายการปกติไม่แสดงวัสดุต้นทาง PIPE/SHEET/COIL แล้ว แท็บ Pipe/Sheet/Coil แสดงเฉพาะ main แบบรายการแบน ไม่จัดกลุ่ม (ต่างจาก handoff ฉบับก่อน) วัสดุที่มี BOM ไม่มีปุ่มรับเข้าหรือ "รายการรับเข้า"
- **ฟอร์มวัสดุ**: เลือก supplier แล้วเพิ่มทันที ไม่มีปุ่ม "เพิ่ม" แยกแล้ว

## 7. ต่อจากฉบับนี้: `/system/users` ใช้ API จริงแล้ว (2026-10-17, รอบหลัง)

หน้า `/system/users` เดิมเป็นข้อมูลตัวอย่าง ตอนนี้เรียก cps-api `/users` จริง (frontend อย่างเดียว ไม่แก้ backend) ทำให้ขั้นที่ 6 ของแผนสิทธิ์ (สร้างผู้ใช้ทั่วไปแล้วไล่ตั้งสิทธิ์) ทำผ่านหน้าเว็บได้

| ทำอะไรได้ | ไฟล์ |
| --- | --- |
| รายการ + ค้นหา + แบ่งหน้า 20 คน (URL `?search=&page=`), SUPER_ADMIN เท่านั้น | `src/app/(dashboard)/system/users/page.tsx`, `components/users/users-client.tsx` |
| เพิ่มผู้ใช้ (ต้องเลือกแผนก + role แรก), แก้ชื่อ/อีเมล/เบอร์ | `components/users/user-form-dialog.tsx` |
| เพิ่ม/เปลี่ยน/ถอด แผนกและ role (บันทึกทีละแถว, ไม่ลบสิทธิ์รายบุคคล) | `components/users/user-assignments-dialog.tsx` |
| ตั้งรหัสผ่านใหม่ (ผู้ใช้ถูก logout ทุกเครื่อง), เปิด/ปิดใช้งาน, ลบถาวร | `user-password-dialog.tsx`, `users-client.tsx` |
| กติกาเมนูแถว / ชื่อแสดง / role ที่เลือกได้ (ไม่มี SUPER_ADMIN) | `components/users/user-row-actions.ts` (+ test) |
| Server Actions + API client | `system/users/actions.ts` (+ `users-actions.test.ts`), `src/lib/api/users.ts` |

ข้อจำกัดที่รู้:

- **ยังไม่ได้รันอะไรเลย** — session นี้ไม่มี `node_modules` และไม่มี cps-api/DB ให้ต่อ จึงไม่ได้รัน test/lint/typecheck และไม่ได้เปิดใน browser สิ่งแรกที่ควรทำ (ถ้าผู้ใช้ขอ): `pnpm install`, `npx tsc --noEmit -p tsconfig.json`, `pnpm lint`, `npx tsx --test src/components/users/user-row-actions.test.ts "src/app/(dashboard)/system/users/users-actions.test.ts"` แล้วลองสร้างผู้ใช้จริงบน `cps_db_test`
- แถวรายการไม่มีเบอร์โทร (API list ไม่ส่งมา) ฟอร์มแก้ไขจึงเริ่มช่องเบอร์ว่าง และการเว้นว่างจะคงค่าเดิม ลบอีเมล/เบอร์ทิ้งจากหน้านี้ไม่ได้ (cps-api `update` ข้ามค่าว่าง)
- ไม่มีปุ่มปลดล็อกบัญชี (ไม่มี endpoint) สถานะ "ถูกล็อก" แสดงอย่างเดียว
- ลบผู้ใช้เป็นการลบถาวร ถ้าผู้ใช้มีประวัติที่อ้างถึง (audit, เอกสาร) cps-api อาจตอบ error ให้ใช้ปิดใช้งานแทน — ยังไม่ได้ทดสอบกรณีนี้
- สร้าง SUPER_ADMIN จากหน้านี้ไม่ได้โดยตั้งใจ (assignment ต้องมีแผนก)

## งานค้าง / ยังไม่ได้ตรวจ

- ไม่มี SUPER_ADMIN อื่นหรือผู้ใช้ธรรมดาใน local นอกจาก `permtest_*` ใน `cps_db_test` grid override ในแท็บผู้ใช้จึงทดสอบบน `cps_db_test` เท่านั้น
- ส่วนที่ยังไม่ได้รันกับข้อมูลจริง:
  - รอบรับเข้าเต็ม LOT/PACKET ของสั่งผลิตวัตถุดิบภายใน
  - การพิมพ์ใบจัดงานขาย
  - การพิมพ์/PDF ป้าย QR (ตรวจจาก source เท่านั้น)
- ข้อมูลในหน้า `/dashboard` ยังเป็นข้อมูลตัวอย่าง (mock)
- `next-themes` ยังอยู่ใน `package.json` แม้ไม่มีโค้ดใช้แล้ว ลบได้เมื่อมีการ sync lockfile ครั้งถัดไป
- Test ที่รันแล้วในช่วงนี้มีเฉพาะที่ผู้ใช้ขอ:
  - cps-api `pnpm test:production` 20/20
  - jest ของ permissions/access-control/roles/users/auth/common 95/95
  - `permission-matrix.test.ts` 13/13
- ส่วนอื่นยังไม่ได้รัน lint/typecheck/build ตาม R0

## เริ่มงานต่ออย่างไร

1. อ่าน `AGENTS.md` (ตาราง "Current route locations" และ Recent Changes ช่วง 2026-10-12 ถึง 10-17)
2. ตรวจว่า cps-api รันอยู่และ migration ถึง `1790600000035` แล้ว ถ้า API ใน Docker ไม่ reload หลังแก้ไฟล์ ให้รัน `docker restart cps-api-api-1`
3. งานที่แตะสิทธิ์ ให้อ่าน plan เรื่อง permission ก่อน งานขายให้อ่าน plan เรื่อง sales; ทุก plan อยู่ใน `docs/plans/`
