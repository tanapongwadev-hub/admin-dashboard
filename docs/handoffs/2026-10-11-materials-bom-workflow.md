# Handoff — Materials, BOM & Workflow และข้อมูลตัวอย่าง

วันที่: 2026-10-11 · เขตเวลา Asia/Bangkok

## สถานะสำหรับผู้รับช่วงต่อ

งานตามคำขอล่าสุดเสร็จแล้ว รวมการเพิ่มข้อมูลตัวอย่างลงระบบ local จริง ผู้ใช้ขอให้สร้าง handoff เป็นงานสุดท้าย ไม่มีงานพัฒนาอื่นที่ตกลงแล้วค้างอยู่

Frontend อยู่ที่ `D:\project-cps\New\admin-dashboard`; Backend อยู่ที่ `D:\project-cps\New\cps-api` ทั้งสอง working tree มี changes หลายรายการจากงานก่อนหน้า และมีไฟล์ใหม่ที่ยัง untracked ใช้ diff รายไฟล์ก่อนแก้ไขเพื่อรักษางานเหล่านั้น สถานะนี้ยังไม่ได้ commit/push/deploy

ก่อนแก้งานต่อให้อ่าน `AGENTS.md` โดยเฉพาะ R0: **รัน tests/lint/build/typecheck เฉพาะเมื่อผู้ใช้ขอโดยตรง** ใช้ pnpm และอ่าน Next.js guide ใน `node_modules/next/dist/docs/` เมื่อแก้โค้ด Next.js

## พฤติกรรมล่าสุดที่ผู้ใช้ต้องการ

### `/materials/pc`

มี 3 แท็บซึ่งเก็บใน URL และคงคำค้นหา/ตัวกรองเดิมเมื่อสลับ พร้อมกลับหน้าแรก:

| แท็บ | Query | การแสดงผล |
| --- | --- | --- |
| รายการปกติ | ไม่มี `tab` หรือ `tab=all` | วัสดุทั้งหมดตามตัวกรอง แสดงแยกรายการ ไม่จัด main/sub; default ยังเป็นสถานะ active |
| Pipe / Sheet / Coil | `tab=raw` | กลุ่มที่ main เป็น PIPE/SHEET/COIL พร้อม sub ที่เชื่อมโยง |
| รายการที่มี BOM | `tab=bom` | วัสดุที่เป็นเจ้าของ Material BOM อย่างน้อยหนึ่งเวอร์ชัน ไม่ใช่แค่ส่วนประกอบของ BOM ผู้อื่น |

แท็บ BOM ต้องมี `MATERIAL_BOMS_VIEW`; ไม่มีสิทธิ์จะแสดงแท็บ disabled พร้อมคำอธิบาย และ URL ตรงแสดงข้อความไม่มีสิทธิ์ ทุกเวอร์ชัน DRAFT/ACTIVE/INACTIVE นับว่ามี BOM

การจัดกลุ่มอาศัย `processingMaterialId` เท่านั้น เมื่อสมาชิกตรงตัวกรองจะแสดงทั้งครอบครัว แม้สมาชิกอีกตัว inactive หรืออยู่นอกตัวกรอง Pagination ของ raw นับกลุ่ม ส่วน normal/BOM นับราย Material วัสดุไม่มี sub แสดงเป็นรายการปกติ

ตาราง raw มีสองระดับ: Main ไฮไลต์ ตามด้วย Sub เยื้องพร้อมลูกศรและ badge; card/list ครอบคู่ด้วยกรอบเดียว ทุก Material มี stock/actions ของตัวเองและยังแสดง Location Type

**การปรับหน้าจอล่าสุด:** แท็บอยู่เหนือตาราง; เอาแถบ Card Header/หัวข้อทะเบียนวัสดุ, helper text, การ์ดสรุปสถานะสต็อก และข้อความอธิบายการจัดกลุ่มออกแล้ว ซ่อนสกอร์บาร์ของตาราง/แถบแท็บ แต่ยังเลื่อนได้ด้วย overflow เดิม (ตารางยังจำกัดความสูง `68vh`) ตัวกรอง stock และ stock ราย Material ยังอยู่

รายละเอียด grouping และข้อจำกัด: [material-groups.md](../material-groups.md)

### `/bom-workflow/materials`

Material ปลายทางใช้ searchable dropdown (`SearchableFilterSelect` ที่ใช้แทน SELECT2) และกรองฝั่ง server ให้ `locationType === 'internal'` พร้อมตัด shape PIPE/SHEET/COIL ออก เงื่อนไขนี้ใช้กับรายการปลายทางเท่านั้น; ส่วนประกอบ BOM ยังเลือกวัตถุดิบได้ และหน้าปลายทาง Products ใช้พฤติกรรมเดิม

### รับเข้าและแปรรูป

- `/materials/materials-receiving` มีทางลัดแปรรูปใน toolbar และเมนูแต่ละรายการ เฉพาะ receipt ต้นทาง confirmed ที่เป็น PIPE/SHEET/COIL และผู้ใช้มีสิทธิ์ดูแปรรูป
- เมนูแต่ละรายการเปิด `/material-processing?search=<internalLotNo>`
- Dialog แปรรูปตั้ง `sourceQuantity: Number(source.receiveQuantity)` เพื่อใช้จำนวนรับเข้าเต็มตั้งต้น โดย guard จำนวนพร้อมใช้/การจองเดิมยังทำงาน

### ลบ Material ถาวร

มี dialog แยก loading/error/blocked/ready, แสดงรหัส/ชื่อ/Location Type/สถานะ, retry และให้กรอกรหัสตรงก่อนลบ Backend ตรวจ dependencies และ lock; ลบ supplier mappings พร้อมบันทึก Audit ใน transaction สามารถกลับไปใช้ปิดใช้งานเมื่อมีข้อผูกพัน

ใช้ `GET /materials/:id/deletion-check` และ `DELETE /materials/:id/permanent`; endpoint `DELETE /materials/:id` เดิมยังหมายถึงปิดใช้งาน ไม่ใช่ลบถาวร ไม่ได้ทดลองลบข้อมูลจริงในช่วงงานนี้

รายละเอียดและข้อจำกัด: [material-deletion.md](../material-deletion.md)

## ข้อมูลตัวอย่างที่เพิ่มจริงใน local

ผู้ใช้ยืนยันให้เพิ่มในระบบ local: main + sub 3 คู่ รวม 6 Materials พร้อมภาพประกอบ PNG 6 รูปและ BOM Active 3 รายการ แต่ละ sub มีส่วนประกอบเป็น main ของคู่เดียวกัน 1 รายการ

| ชุด | Main code / ID | Sub code / ID | BOM ID | ใช้ Main ต่อ Sub 1 ชิ้น |
| --- | --- | --- | --- | --- |
| PIPE | `MOCK-MAIN-PIPE-001` / 25 | `MOCK-SUB-PIPE-001` / 24 | 1 | 0.05 เส้น |
| SHEET | `MOCK-MAIN-SHEET-001` / 27 | `MOCK-SUB-SHEET-001` / 26 | 2 | 0.125 ชีท |
| COIL | `MOCK-MAIN-COIL-001` / 29 | `MOCK-SUB-COIL-001` / 28 | 3 | 0.01 คอยล์ |

Main เป็น External, sub เป็น PCS/Internal จึงเลือก sub ในหน้า BOM Materials ได้ ภาพเป็น illustration ไม่ใช่ภาพถ่าย อัตรา 20/8/100 ชิ้นต่อต้นทางเป็นข้อมูลตัวอย่างทางทฤษฎี ไม่รวมเศษเสีย/รอยตัด ไม่มีการสร้างใบรับเข้า/จ่ายออกหรือยอดสต็อก

- ดูคู่: [Materials raw mock](http://localhost:3000/materials/pc?tab=raw&search=MOCK-)
- ดูทุก Material: [Materials mock](http://localhost:3000/materials/pc?search=MOCK-)
- ดูรายการที่มี BOM: [Materials BOM mock](http://localhost:3000/materials/pc?tab=bom&search=MOCK-)
- รายละเอียด/คำสั่ง seed: [mock-materials/README.md](../mock-materials/README.md)
- IDs และ image paths ที่สร้างจริง: [seed-result.json](../mock-materials/seed-result.json)

สคริปต์ `scripts/seed-mock-materials.mjs` เรียก API พร้อมระบบ upload/promote ภาพและ activation ปกติ จำกัด API URL เป็น loopback, อ่าน credentials จาก env, ใช้ marker แยกชุด demo และปฏิเสธการทับรหัส/Active BOM ผู้อื่น มี checkpoint รายคู่และ reuse รายการเดิมได้ รูป seed เก็บที่ `docs/mock-materials/images/`; รูปที่ระบบใช้อยู่เก็บโดย cps-api ใต้ `uploads/materials/` การย้ายเครื่องต้องย้ายข้อมูลฐานข้อมูลและ uploads หรือ seed ใหม่ตาม README; ID ในตารางข้างบนเป็นของ local นี้

## จุดแก้โค้ดสำคัญ

| งาน | Frontend (`admin-dashboard/`) | Backend (`cps-api/`) |
| --- | --- | --- |
| โหลดแท็บ/count/pagination/stock | `src/app/(dashboard)/materials/pc/page.tsx` | `src/modules/material-engineering/material-engineering.{controller,service}.ts` สำหรับ distinct BOM owner IDs |
| แท็บ/ตัวกรอง/ตาราง | `src/components/materials-pc/material-pc-{client,filters,table}.tsx`, `src/lib/material-groups.ts` | ใช้ Materials/Inventory APIs เดิม |
| BOM destination selector | `src/components/engineering/engineering-{page,client}.tsx`, `src/lib/api/engineering.ts` | `src/modules/material-engineering/` |
| ลบถาวร | `src/components/materials-pc/material-pc-delete-dialog.tsx`, `src/app/(dashboard)/materials/pc/actions.ts`, `src/lib/api/materials.ts` | `src/modules/materials/materials.{controller,service}.ts`, `dto/delete-material.dto.ts` |
| Receiving shortcut | `src/components/materials-receiving/materials-receiving-{client,table}.tsx` | ใช้ processing API เดิม |
| จำนวนเต็มตั้งต้น | `src/components/material-processing/material-processing-form-dialog.tsx` | guard ปริมาณเดิม |
| ข้อมูลตัวอย่าง | `scripts/seed-mock-materials.mjs`, `docs/mock-materials/` | ใช้ API และ upload storage จริง |

## หลักฐานตรวจสอบและข้อจำกัด

- ไม่ได้รัน tests/lint/build/typecheck ตาม R0 มี regression assertions เพิ่มใน `material-pc-table.test.tsx` และ backend deletion specs แต่ยังไม่ได้ execute
- Seed ดำเนินการจริงสำเร็จทั้ง 3 คู่ อ่านกลับตรวจความเชื่อมโยง main/sub, image paths, BOM Active และส่วนประกอบครบ พร้อม HTTP ตรวจว่ารูปทั้ง 6 เปิดได้; ดูภาพตัวอย่าง main pipe/main coil/sub sheet แล้ว
- ยังไม่ได้ยืนยันหน้าจอทุก view/permission ใน browser หลังการปรับ UI ล่าสุด คำสั่งเปิดหน้าใน Codex ส่งแล้วและ tool ตอบ queued จึงไม่ถือเป็นหลักฐานว่า UI render ผ่าน
- การแบ่งกลุ่มยังอ่านทุก matching page และ catalog เต็มก่อน paginate; matching pages ทำพร้อมกันสูงสุด 4 รายการ มีต้นทุนเมื่อ catalog ใหญ่
- Related contextual rows ใช้ stock balances ที่ยังไม่มี lastReceivedAt จึงอาจแสดง `—`; matched inventory rows เก็บวันรับเข้าล่าสุดไว้
- Frontend ต้องใช้ backend ที่มี `GET /material-engineering/materials/with-bom` ซึ่งตรวจ `MATERIAL_BOMS_VIEW`; deploy ให้พร้อมกัน รายละเอียด schema/permissions อยู่ใน [bom-workflow.md](../bom-workflow.md)

หากผู้ใช้ขอทดสอบต่อ ให้เริ่มจากกลุ่ม regression ที่เกี่ยวข้องและตรวจ normal/raw/BOM, ตัวกรองที่ตรงเฉพาะ sub, pagination, ข้อมูล mock, และผู้ไม่มีสิทธิ์ดู BOM ก่อนขยายขอบเขตการตรวจ
