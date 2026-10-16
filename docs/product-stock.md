# สต็อกสินค้าสำเร็จรูป

หน้า `/products` และ `/products/list` แสดงยอดคงเหลือในมุมมองการ์ด ตาราง และรายการ ยอดคงเหลือ = รับเข้าสะสม − จ่ายออกสะสม แยกบัญชีจากสต็อก Materials โดยใช้หน่วยของสินค้าแต่ละรหัส

กด **สต็อกสินค้า** บนการ์ด หรือเมนู **สต็อก / รับเข้า–จ่ายออก** ในแต่ละแถว เพื่อดูยอดและประวัติ 50 รายการล่าสุด ผู้มี `PRODUCTS_VIEW` ดูได้ ผู้มี `PRODUCTS_UPDATE` บันทึกได้ ต้องระบุประเภท จำนวน และเลขเอกสารอ้างอิง หมายเหตุไม่บังคับ

บันทึกแล้วมีผลต่อยอดทันที ไม่มีขั้นตอนร่าง การแก้ยอดใช้รายการชดเชยพร้อมเอกสารอ้างอิงใหม่เพื่อคงประวัติเดิม ไม่อนุญาตให้จ่ายเกินยอด หรือบันทึกสินค้า inactive ระบบไม่ลบ/แก้รายการย้อนหลัง และไม่อนุญาตให้เปลี่ยนหน่วยสินค้าที่มีประวัติแล้ว

สินค้าที่ยังไม่มีรายการเริ่มที่ 0 หากมีสินค้าจริงอยู่แล้ว ให้รับเข้ายอดตั้งต้นด้วยเลขอ้างอิงการตรวจนับ ตั้งแต่ 2026-10-14 การแพ็กกล่อง FG ในใบสั่งผลิตแบบ LOT รับเข้ายอดนี้อัตโนมัติ (อ้างอิง QR กล่อง) การยกเลิกการแพ็กจ่ายออกคืน และการตัดสต็อกขายจ่ายออกด้วยเลข DO — ดู docs/plans/2026-10-14-sales-module-plan.md จำนวนที่ผลิตสะสมที่ยังไม่แพ็ก หรือความสามารถผลิตตาม BOM ไม่นับเป็นยอดสินค้าสำเร็จรูป

## API / persistence

- `GET /products/stock-balances`: `PRODUCTS_VIEW`; sparse array `{ productId, quantity }[]`. หลังโหลดสำเร็จ รหัสที่ไม่มีรายการหมายถึงยอด 0; API ล้มเหลวต้องไม่แสดง 0 แทนข้อผิดพลาด
- `GET /products/:id/stock`: `PRODUCTS_VIEW`; `{ productId, quantity, receivedQuantity, issuedQuantity, movements }` รวมยอดทั้งหมด และประวัติสูงสุด 50 รายการ เรียง id ล่าสุดก่อน แต่ละรายการมี quantity, balanceAfter, referenceNo, remark, actorName และ createdAt
- `POST /products/:id/stock-movements`: `PRODUCTS_UPDATE`; `{ requestId: UUIDv4, type: "receive" | "issue", quantity, referenceNo, remark? }`. จำนวนมากกว่า 0 ทศนิยมไม่เกิน 4 ตำแหน่ง สูงสุด 1,000,000,000 ต่อรายการ คืน snapshot รูปแบบเดียวกับ GET stock

Migration `1790600000020-CreateProductStockMovements` เพิ่ม `inventory.product_stock_movements`, FK ไป `master.products`/`iam.users`, unique `(product_id, request_id)`, index ประวัติ และ CHECK จำนวน/ยอดหลังรายการ ติดตั้งในฐานข้อมูล local แล้ว ไม่ backfill หรือเปลี่ยนประวัติเดิม ต้องรัน migration ก่อนเปิด API เวอร์ชันใหม่นี้ใน environment อื่น

Service ล็อกแถว Product แบบ pessimistic write ภายใน transaction ก่อนรวมยอดและบันทึก ช่วย serialize ทั้งรายการแรกและการจ่ายพร้อมกัน ใช้ PostgreSQL NUMERIC คำนวณยอดเพื่อรักษาทศนิยม การส่ง requestId เดิมพร้อมข้อมูล/ผู้บันทึกเดิมคืนยอดปัจจุบันโดยไม่ลงรายการซ้ำ ข้อมูลหรือผู้บันทึกเปลี่ยนจะ 409 ทั้งการเปลี่ยนหน่วยและการลงรายการใช้ lock เดียวกัน ส่วนอ่านรายละเอียดใช้ REPEATABLE READ ให้ยอดและประวัติสอดคล้องกัน

Server Actions ตรวจ session/permission และ revalidate ทั้งสองหน้าเมื่อบันทึกสำเร็จ หาก invalidate cache ล้มเหลวไม่เปลี่ยนผลบันทึกเป็น failure การ retry ข้อมูลเดิมใน dialog ใช้ requestId เดิม

## Verification

รัน migration local สำเร็จ ตรวจเฉพาะ source ตาม AGENTS R0 ยังไม่ได้รัน tests/lint/build/typecheck หรือบันทึกสต็อกทดลอง มี safeguard cases ใน `cps-api/src/modules/products/product-stock.service.spec.ts`; คำสั่งเป้าหมายเมื่อผู้ใช้ขอทดสอบคือ `pnpm exec jest src/modules/products/product-stock.service.spec.ts --runInBand` จาก cps-api และควรตรวจการจ่ายพร้อมกันกับ PostgreSQL จริงก่อนใช้ production
