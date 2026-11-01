# Knowledge Graph ของ admin-dashboard

กราฟอยู่ใน `knowledge-graph.json` คำอธิบายโหนด ชั้นสถาปัตยกรรม และ guided tour เป็นภาษาไทย ตั้งค่าภาษาใน `config.json`

## การใช้งานใน Codex

- `$understand-dashboard D:/project-cps/New/admin-dashboard` เปิดกราฟแบบโต้ตอบ
- `$understand-chat` ถามคำถามโดยอ้างอิงกราฟ
- `$understand-explain` อธิบายไฟล์หรือฟังก์ชันที่ต้องการ
- `$understand-diff` ตรวจผลกระทบของ diff ปัจจุบัน
- `$understand D:/project-cps/New/admin-dashboard` วิเคราะห์การเปลี่ยนแปลงหลัง commit
- `$understand D:/project-cps/New/admin-dashboard --full --language th` สร้างใหม่ทั้งหมด รวมการแก้ไขที่ยังไม่ได้ commit

เริ่มอ่านจาก guided tour แล้วกรองตามชั้นสถาปัตยกรรมเพื่อแยกโค้ด runtime ออกจากเอกสารและชุดเครื่องมือ agent

## ขอบเขตและข้อจำกัด

- วิเคราะห์ working tree ของ repository นี้ รวม source, tests, docs, scripts และชุดเครื่องมือใน `.agents/` กับ `.claude/` ตาม inventory ใน `intermediate/scan-result.json`
- `cps-api` เป็นระบบภายนอกสำหรับกราฟนี้ กราฟครอบคลุมฝั่ง client/API adapter ของ dashboard โดยไม่ได้วิเคราะห์ implementation ของ backend
- ดูข้อยกเว้นการสแกนใน `.understandignore` เช่น `.env`, กุญแจ, build output และ dependencies
- ไฟล์ไบนารี 17 รายการแสดงเป็นโหนดไฟล์ประกอบโดยไม่ได้วิเคราะห์เนื้อหา
- มี 11 ไฟล์ที่ parser พบการเรียกใช้แต่ไม่สกัด declaration ของฟังก์ชัน ได้แก่ bundled JavaScript ในเครื่องมือ agent และ callback ใน `next.config.ts` กราฟระดับไฟล์ยังคงอยู่
- เส้น import และโครงสร้างที่ parser รองรับเป็นข้อมูลเชิงโครงสร้าง ส่วนคำอธิบายและความสัมพันธ์เชิงความหมายเป็นผลการวิเคราะห์ ควรเปิด source ตรวจสอบก่อนตัดสินใจแก้โค้ด
- README หลักยังมีรายละเอียดของ template รุ่นเก่า ให้เทียบกับ source ปัจจุบันและ AGENTS.md
- ป้ายเมนูของ viewer อาจใช้ภาษาอังกฤษเมื่อไม่มี locale ไทย แม้เนื้อหากราฟเป็นภาษาไทย

`analysis-report.json` เก็บผลตรวจกราฟและข้อจำกัด ส่วน `fingerprints.json` และ `meta.json` ใช้เป็นฐานสำหรับการวิเคราะห์ครั้งถัดไป การอ้างอิง commit ใน metadata ควรอ่านร่วมกับสถานะ working tree ในรายงาน

เก็บ `knowledge-graph.json`, `config.json`, `meta.json`, `fingerprints.json`, `.understandignore` และรายงานไว้ร่วมกันเมื่อต้องการแบ่งปันกราฟกับทีม ไฟล์ชั่วคราวถูกละเว้นผ่าน `.gitignore` ภายในโฟลเดอร์นี้
