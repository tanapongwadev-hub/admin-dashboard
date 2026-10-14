# แผนผลิต Materials ภายใน

เมนูหลัก **แผนผลิต** (`PRODUCTION_PLANNING`, MAIN) มีสองเมนูย่อย (SUB): **แผนผลิตสินค้า** (`/production/plans`) และ **แผนผลิตวัตถุดิบภายใน** (`/production/material-plans`) แต่ละหน้าโหลดรายการผ่าน API ด้วย `targetType=product|material` และเลือกปลายทางตอนสร้าง/แก้ไขได้เฉพาะชนิดของหน้านั้น ค้นหาด้วยรหัสหรือชื่อได้

แผนผสมเดิมปรากฏในทั้งสองหน้าและแก้ไขได้ทั้งสองชนิดเพื่อรักษาข้อมูลเดิม ตัวกรองใช้ EXISTS ระดับแผนเพื่อไม่ตัดรายการชนิดอื่นทิ้งจากแผนผสม นำเข้า Excel แสดงเฉพาะหน้าสินค้า

วัสดุปลายทางต้อง active, `locationType = internal`, ไม่ใช่ PIPE/SHEET/COIL และมี Material BOM สถานะ ACTIVE จำนวนผลิตเป็นจำนวนเต็มบวกเหมือนแผนสินค้า บันทึกเป็น DRAFT และตรึง Material BOM เวอร์ชันปัจจุบันจาก server ผู้ใช้ไม่เลือก BOM id เอง

อนุมัติคำนวณวัตถุดิบจาก BOM ที่ตรึงไว้: จำนวนผลิต × จำนวนส่วนประกอบ โดยไม่รวมเศษวัสดุและไม่บวกเปอร์เซ็นต์เผื่อสูญเสีย ใช้การจอง FIFO ระดับ Package เดิม อนุมัติทั้งแผนใน transaction เดียว ถ้าสต็อกไม่พอจะคืน shortfalls และไม่จองบางส่วน

อนุมัติสร้างใบจัดงานใน transaction เดียวกัน หยิบและเบิกจาก Package ที่จองไว้ รองรับเบิกบางส่วน ยกเลิกและหมดอายุใช้กฎเดิม การเบิกไม่ได้สร้างสต็อกปลายทางอัตโนมัติ

## API และฐานข้อมูล

- สิทธิ์เดิม `PRODUCTION_PLAN_*` และ `MATERIAL_JOB_ORDER_*` ใช้กับแผนทั้งสองชนิด
- Migration `1790600000025-SplitProductionPlanMenus` เปลี่ยนชื่อเมนูสินค้าเดิมและเพิ่มเมนู Materials ภายใน พร้อม `MATERIAL_PRODUCTION_PLAN_VIEW` สำหรับการแสดงเมนู โดยคัดลอกข้อจำกัดแผนกและ user overrides (รวม DENY/วันหมดอายุ) จาก `PRODUCTION_PLAN_VIEW`; API/page lifecycle guards ยังใช้สิทธิ์เดิม ติดตั้ง local แล้ว ต้อง refresh session เพื่อรับเมนูใหม่
- Migration `1790600000026-GroupProductionPlanMenus` เพิ่ม MAIN แผนผลิต และย้ายสองเมนูเดิมเป็น SUB ลำดับสินค้า → วัตถุดิบภายใน เก็บ child IDs, paths และ permission mappings เดิม เมนูหลักไม่มี path และแสดงผ่าน ancestor inclusion ของเมนูย่อยที่ผู้ใช้มีสิทธิ์
- `GET /production-plans/lookups` เพิ่ม `materials` พร้อม `activeBomId/activeBomVersion`; `products` คงเดิม
- POST/PATCH แต่ละ line ส่ง `productId` หรือ `materialId` อย่างใดอย่างหนึ่ง พร้อม quantity/needByDate/remark
- รายการ Material เก็บ `material_id/material_bom_id`; `product_id/bom_id` เป็น null มี CHECK constraint บังคับคู่ปลายทางและ FK ป้องกันลบข้อมูลอ้างอิง
- รายละเอียดแผนเพิ่ม `line.material` และ `line.materialBom.items.material`; Product fields คงเดิม
- รายละเอียดใบจัดงานเพิ่ม `materialId/targetType`; legacy `productCode/productName` แสดงรหัสและชื่อปลายทางสำหรับทั้งสองชนิด เพื่อคงสัญญาของหน้าพิมพ์และตารางเดิม
- ค้นหารหัส/ชื่อ Material ได้จากรายการแผนและใบจัดงาน
- Excel import ยังใช้ Product Code แบบเดิม

Migration `1790600000024-AddMaterialProductionPlanLines` ใน cps-api ติดตั้ง local แล้ว วันที่ 2026-10-12 Environment อื่นต้องติดตั้ง migration ก่อนใช้ API ที่ขยายนี้ การ rollback ปฏิเสธถ้ายังมี Material plan lines เพื่อไม่ลบแผนทิ้ง

## การตรวจสอบ

2026-10-12: แก้ `production-orders.service.ts` ให้ปฏิเสธ Material plan lines อย่างชัดเจนก่อนค้นหา Product เพราะโมดูลใบสั่งผลิตยังรองรับเฉพาะสินค้า การใช้ nullable `productId` โดยไม่ตรวจทำให้ existing Nest watcher compile ไม่ผ่านและ API process เก่ายังปฏิเสธ `targetType` หลังแก้ watcher โหลดโค้ดใหม่สำเร็จ และ authenticated GET `/production-plans?targetType=product|material&page=1&limit=20` ทั้งสองแบบตอบ 200 พร้อม `items/meta` ไม่มีการรันคำสั่ง tests/lint/build/typecheck แยก

ตรวจ source เฉพาะที่เปลี่ยนและติดตั้ง migration local สำเร็จ เพิ่ม backend safeguard specs สำหรับตรึง Material BOM, ปฏิเสธปลายทางกำกวม/วัตถุดิบดิบ และคำนวณยอดจองจาก Material BOM แต่ยังไม่ได้รันตาม R0 ยังไม่ได้ทดสอบ create/approve/pick/issue ผ่าน browser/API

เมื่อผู้ใช้สั่งทดสอบ: จาก cps-api ใช้ `pnpm exec jest src/modules/production-plans/production-plans.service.spec.ts src/modules/material-job-orders/material-job-orders.service.spec.ts --runInBand` และทดสอบวงจรจริงด้วย Material ภายในที่มี BOM และ stock พร้อมใช้งาน

## เมนูใบจัดงานแยกตามปลายทาง

2026-10-12: เมนูใบจัดงานเดิมใต้จัดการวัตถุดิบเป็น container ไม่มี path และมี SUB ใบจัดงานสินค้า (`/materials/job-orders/products`) กับใบจัดงานวัตถุดิบภายใน (`/materials/job-orders/internal-materials`) ใช้ Server Component `job-orders-page.tsx` ร่วมกัน โดยส่ง `targetType=product|material` ไปที่ GET /material-job-orders เพื่อกรองจากชนิดรายการของแผนผลิตก่อนแบ่งหน้า แผนเก่าที่มีทั้งสองชนิดปรากฏได้ทั้งสองรายการและยังแสดงครบทุก line

Migration `1790600000027-SplitMaterialJobOrderMenus` ติดตั้ง local แล้ว ย้าย permission IDs เดิมไปเมนูสินค้าและเพิ่ม navigation permission `INTERNAL_MATERIAL_JOB_ORDER_VIEW` พร้อมคัดลอก department restrictions/user overrides จาก VIEW เดิม ขั้นตอนพิมพ์/หยิบ/เบิกและรายละเอียด `/materials/job-orders/[id]` ใช้ permission เดิม หน้า `/materials/job-orders` ยังคงรายการรวมสำหรับลิงก์เก่า การอนุมัติ/ยกเลิกแผนและการทำรายการใบจัดงาน revalidate สองหน้าใหม่

ตรวจ source เฉพาะที่เปลี่ยน อ่านโครงสร้างเมนูหลัง migration และเรียก authenticated GET ของทั้งสอง targetType ได้ 200 ยังไม่ได้ตรวจผ่าน browser และไม่ได้รัน lint/tests/build/typecheck ตาม R0

## เมนูการสั่งผลิตตามกระบวนการ

2026-10-12: MAIN `PROCESS_PRODUCTION` ชื่อ การสั่งผลิตตามกระบวนการ ไม่มี path และมี SUB สองเมนู: การสั่งผลิตตามกระบวนการสินค้า (`PRODUCT_PROCESS_ORDERS`, `/products/process-orders`) กับการสั่งผลิตตามกระบวนการวัตถุดิบภายใน (`MATERIAL_PROCESS_ORDERS`, `/materials/process-orders`) Migration `1790600000028-GroupProcessOrderMenus` ติดตั้ง local แล้ว โดยคง menu ID/path/permission mappings เดิมของสินค้า และเพิ่ม navigation permission `MATERIAL_PROCESS_ORDER_VIEW` พร้อม department/user restrictions จาก `PRODUCTION_ORDER_VIEW`

ทั้งสอง route ใช้ Server Component `components/production-orders/process-orders-page.tsx` ร่วมกัน กรองแผน ISSUED ตาม targetType และยืนยันว่าใบจัดงานจ่ายครบและทุก line ตรงชนิดปลายทาง หน้าสินค้ายังคงแท็บรอสั่งผลิต/สั่งผลิตแล้วและ LOT/PACKET เดิม หน้าวัตถุดิบภายในใช้แท็บรอสั่งผลิต/สั่งผลิตแล้วและปุ่มสร้างเหมือนสินค้า พร้อมค้นหา/แบ่งหน้า/เปิดแผนและใบจัดงาน และแยกใบสั่งผลิตด้วย targetType

เดิมรอบเพิ่มเมนูเป็น read-only; รอบถัดมาได้เพิ่มการสั่งผลิตและรับ stock ตามรายละเอียดด้านล่าง ตรวจ source และ menu readback หลัง migration; ยังไม่ได้ browser verification หรือรัน lint/tests/build/typecheck ตาม R0

## การสั่งผลิตวัตถุดิบภายใน (2026-10-12)

- หน้า `/materials/process-orders` มีสองแท็บและเลือก LOT/PACKET เหมือนสินค้า รายละเอียดอยู่ที่ `/materials/process-orders/[id]` ใช้ server detail loader/board/dialog/permissions เดิมร่วมกัน และ redirect รายละเอียดที่เปิดผ่าน route ผิดประเภทไป URL ที่ถูกต้อง
- สร้างได้จากแผน ISSUED ที่ใบจัดงาน ISSUED ครบแล้วเท่านั้น ต้องเป็นปลายทางประเภทเดียวทั้งแผน ไม่รับแผนว่าง/ผสม วัตถุดิบต้อง active, locationType=internal และไม่ใช่ PIPE/SHEET/COIL พร้อม Material Workflow ACTIVE ที่มีขั้นตอน ระบบตรึง material_workflow_id; เปลี่ยนเวอร์ชัน ACTIVE ภายหลังไม่เปลี่ยนใบสั่งผลิตเดิม
- LOT ใช้ WIP/produce/reject/transfer/close/pack/reconciliation/traceability เดิม Material Workflow แบบ LOT ต้องมีอย่างน้อยสองขั้นตอนและ FG/STORE เฉพาะขั้นตอนสุดท้าย (ขั้นแรกสร้าง ORIGIN ตามโมเดลเดิม) PACKET ใช้บันทึกผลผลิต สแกนเลื่อนขั้นตอน และแยกกล่องบางส่วนเดิม
- รับ stock วัตถุดิบเฉพาะกล่องที่ผลิตเสร็จ: LOT ตอนแพ็ก FG/STORE, PACKET เมื่อผ่านขั้นตอนสุดท้าย (รวม Workflow ขั้นเดียวตอนบันทึกผลผลิต) ไม่รับซ้ำตอน produce Lot หรือระหว่างขั้นตอน ทุกการรับใช้ EntityManager/transaction เดียวกับ movement พร้อม stock balance/stock ledger/audit จาก MaterialsReceivingService
- หนึ่งกล่องผลิตเชื่อมหนึ่ง confirmed MaterialReceiving และหนึ่ง SUB package ผ่าน `production_material_receipts` ที่ unique(source_kind,source_id); supplier เป็น null สำหรับผลผลิตภายในและไม่สร้าง supplier lot สมมติ Ledger เก็บ production order code ใช้ QR เดียวกับกล่องผลิตเป็น stock SUB QR จึงนำไปจอง/หยิบ/เบิกในแผนต่อไปได้
- ล็อก Material ก่อนรับ stock เพื่อ serialize การสร้าง balance ครั้งแรก ตรวจ destination อีกครั้งขณะรับ ไม่รับ raw/external/inactive ที่ถูกเปลี่ยนภายหลัง ป้องกันการยกเลิก receiving แยกจากการผลิตและห้ามย้อนแพ็กกล่อง Material ที่รับ stock แล้ว เพื่อไม่ให้ยอดผลิตกับยอด stock แยกจากกัน การย้อนผลิตก่อนแพ็กยังใช้กติกาเดิม
- Migration `1790600000029-AddMaterialProcessProduction` ติดตั้ง local แล้ว: เพิ่ม Material/MaterialWorkflow FK และ exactly-one-target checks บน order lines, Material targets บน lots/packages, supplierless production receipt link และ unique receipt bridge Environment อื่นต้องติดตั้ง migration ก่อนใช้โค้ดนี้

ตรวจ source เฉพาะที่เปลี่ยนและดู existing Docker watcher ที่โหลดใหม่สำเร็จ Authenticated GET รายการ production-orders ทั้ง product/material, Material plan ISSUED, รายละเอียด Material order และ board ตอบ 200 (board มี 4 steps และ targetType=material) ไม่ได้สร้าง/บันทึกผลผลิต/รับ stock ผ่านการตรวจรอบนี้ และไม่ได้รัน lint/tests/build/typecheck ตาม R0 วงจร produce/transfer/pack/stock และ PACKET split/final receive ยังต้องตรวจครบก่อนใช้งานจริง
