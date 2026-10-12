# BOM & Workflow

เมนูหลัก **BOM & Workflow** (`/bom-workflow`) มีเมนูย่อยสองรายการ:

- **BOM & Workflow Materials** (`/bom-workflow/materials`): เลือก Material ปลายทาง กำหนด Material ที่ใช้ต่อปลายทาง 1 หน่วย และลำดับขั้นตอนแปรรูป
- **BOM & Workflow Products** (`/bom-workflow/products`): เลือกสินค้า กำหนดสูตรประกอบและขั้นตอนผลิต โดยใช้ API และข้อมูล Product BOM/Workflow เดิม

แต่ละหน้าเลือกปลายทางแล้วแยกแท็บ BOM/Workflow เพิ่มเป็นร่าง ดูประวัติเวอร์ชัน ทำสำเนาเป็นเวอร์ชันใหม่ และเปิดใช้เวอร์ชันได้ ส่วนประกอบเลือกไม่ซ้ำกัน Workflow เรียงลำดับด้วยปุ่มขึ้น/ลง ทั้งสองชนิดมีเวอร์ชันและสถานะอิสระ เปิดใช้เวอร์ชันใหม่ปิดเวอร์ชันเดิมของชนิดเดียวกัน

Material BOM ห้ามใช้ Material ปลายทางเอง ตรวจ Material/หน่วยที่ active และป้องกันวงจรข้าม Material เมื่อเปิดใช้ วัสดุอ้างอิงใช้หน่วยหลักของตัวเอง ไม่มีการแปลงหน่วยโดยอัตโนมัติ การแก้ข้อมูลเวอร์ชันเดิมใช้การทำสำเนาเพื่อเก็บประวัติ ชุดข้อมูลเหล่านี้ยังไม่สั่งการผลิต/แปรรูปหรือตัดสต็อกอัตโนมัติ

## Permissions

- หน้า Materials แสดง Material ปลายทางเฉพาะ `locationType = internal` และไม่ใช่ PIPE/SHEET/COIL โดยยังเลือกวัตถุดิบเหล่านี้เป็นส่วนประกอบ BOM ได้ตามเงื่อนไขเดิม
- เลือกปลายทาง Materials ต้องมี `MATERIAL_VIEW`; Products ต้องมี `PRODUCTS_VIEW`
- Materials: `MATERIAL_BOMS_VIEW/CREATE/UPDATE` และ `MATERIAL_WORKFLOWS_VIEW/CREATE/UPDATE`
- Products: `BOMS_VIEW/CREATE/UPDATE` และ `PRODUCT_WORKFLOWS_VIEW/CREATE/UPDATE` เดิม
- เพิ่ม BOM ต้องอ่าน Material catalog ได้ (`MATERIAL_VIEW`); เพิ่ม Workflow ต้องอ่านขั้นตอน (`PROCESS_STEP_VIEW`) ได้ เมนูและปุ่มไม่ให้สิทธิ์ข้าม API guards
- ไม่มีการมอบสิทธิ์ใหม่ให้ role ทั่วไปอัตโนมัติ ผู้ดูแลกำหนดสิทธิ์ตามหน้าที่ SUPER_ADMIN ใช้งานได้ตาม guard เดิม

## Backend

Migration `1790600000021-CreateMaterialEngineeringAndMenus` เพิ่ม `master.material_boms`, `material_bom_items`, `material_workflows`, `material_workflow_steps` และ main/submenu ที่เกี่ยวข้อง ย้ายเมนู BOMS เดิมไปใต้ BOM_WORKFLOW โดยเก็บรหัส/id/permission grants เดิมไว้ Product tables และข้อมูลเดิมไม่ได้ย้ายหรือทำซ้ำ

สิทธิ์ Workflow ใช้ BUTTON nodes ใต้ submenu แต่ละอัน เพราะ IAM unique `(menu_id, action_id)` ไม่ให้สอง READ permissions อยู่บนเมนูเดียวกัน Node ต้อง `is_visible=true` เพื่อให้ menu-tree รวม ancestor สำหรับผู้มีเฉพาะสิทธิ์ Workflow; sidebar ข้าม BUTTON ตามพฤติกรรมเดิม จึงยังแสดงเพียงสองเมนูย่อย Migration ขยาย legacy menus menu-type CHECK ให้ตรงกับ entity/DTO (`MAIN/SUB/BUTTON`) และ seed มี parent ก่อน child พร้อม permission mapping เดียวกัน

Material Engineering endpoints:

- `GET /material-engineering/materials/with-bom`: distinct Material owner IDs with any BOM version (DRAFT/ACTIVE/INACTIVE); requires `MATERIAL_BOMS_VIEW`, used by the Materials PC BOM tab without per-Material requests.
- `GET /material-engineering/materials/:id/boms` / `workflows`: ประวัติทุกเวอร์ชันพร้อมรายการ เรียงใหม่ก่อน ต้องมีสิทธิ์ VIEW ของชนิดนั้น
- `POST /material-engineering/boms`: materialId, items (รูปแบบส่วนประกอบเดียวกับ Product BOM), specification?, remark? คืน header เวอร์ชัน DRAFT
- `POST /material-engineering/workflows`: materialId, steps (processStepId, description?), remark? คืน header เวอร์ชัน DRAFT
- `PATCH /material-engineering/boms/:id/activate` / `workflows/:id/activate`: สิทธิ์ UPDATE; เปิดใช้เวอร์ชันเดียวต่อปลายทาง/ชนิด

Service ล็อก Material ปลายทางระหว่างสร้างเวอร์ชัน/เปิดใช้ มี unique owner/version และ partial unique ACTIVE; BOM activation ใช้ transaction advisory lock ร่วมกับ recursive graph query เพื่อกันวงจรที่เกิดจากการเปิดใช้พร้อมกัน ข้อมูลอ้างอิงที่ปิดใช้งานหรือหน่วยเปลี่ยนต้องแก้เป็นเวอร์ชันใหม่ก่อนเปิดใช้

Frontend: `components/engineering/engineering-page.tsx` โหลด catalogs ครบทุกหน้า; client/form ใช้ Radix, RHF+zod และ Server Actions ใน `bom-workflow/actions.ts` ตรวจ session/permission ซ้ำ ใช้ route ที่อนุญาตไว้และ revalidate Products/Materials หลัง mutation

## Installation / inspection

Migration ติดตั้งใน local สำเร็จ สองครั้งแรก rollback ทั้ง transaction จาก legacy menu CHECK และ parameter type ของ permission insert; แก้ก่อน migration สำเร็จ ไม่มีข้อมูลธุรกิจเดิมถูกลบ Environment อื่นต้องรัน migration ก่อนเปิด API ใหม่ จากนั้น refresh session/page เพื่อโหลดเมนู

ตรวจ source เท่านั้นตาม AGENTS R0 ไม่ได้รัน tests/lint/build/typecheck/browser/API replay มี safeguard specs ใน `material-engineering.service.spec.ts` สำหรับ self-reference, duplicate components และ cycle rejection คำสั่งเมื่อผู้ใช้ขอทดสอบคือ `pnpm exec jest src/modules/material-engineering/material-engineering.service.spec.ts --runInBand` จาก cps-api
