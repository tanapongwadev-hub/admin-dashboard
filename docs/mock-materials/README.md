# ข้อมูลตัวอย่าง Materials: main + sub 3 ชุด

เพิ่มใน local cps-api ผ่าน API เมื่อ 2026-10-11 รวม 6 Materials, รูปประกอบ PNG 6 รูป และ Material BOM สถานะ ACTIVE 3 รายการ รหัสทั้งหมดขึ้นต้น `MOCK-` และชื่อมี `(ตัวอย่าง)`

| ชุด | Main (External) | Sub (PCS / Internal) | ส่วนประกอบ BOM ต่อ Sub 1 ชิ้น | อัตราแปรรูปตัวอย่าง |
| --- | --- | --- | --- | --- |
| PIPE | `MOCK-MAIN-PIPE-001` — ท่อ SS400 Ø32 × 2 × 6000 มม. | `MOCK-SUB-PIPE-001` — ปลอกท่อตัดยาว 300 มม. | Main 0.05 เส้น | 20 ชิ้น/เส้น |
| SHEET | `MOCK-MAIN-SHEET-001` — แผ่น SPCC 2 × 1000 × 2000 มม. | `MOCK-SUB-SHEET-001` — แผ่นยึด 500 × 500 มม. | Main 0.125 ชีท | 8 ชิ้น/ชีท |
| COIL | `MOCK-MAIN-COIL-001` — คอยล์ SGCC 0.8 × 100 มม. | `MOCK-SUB-COIL-001` — คลิปยึด 30 × 100 มม. | Main 0.01 คอยล์ | 100 ชิ้น/คอยล์ |

ตัวเลขเป็นอัตราตัวอย่างทางทฤษฎี ไม่รวมรอยตัด/เศษเสีย รูปเป็นภาพประกอบที่วาดสำหรับข้อมูลตัวอย่าง ไม่ใช่ภาพถ่ายสินค้า และไม่ได้สร้างรายการรับเข้า/จ่ายออกหรือยอดสต็อก

- ดูคู่ main/sub: `/materials/pc?tab=raw&search=MOCK-`
- ดูทั้ง 6 รายการ: `/materials/pc?search=MOCK-`
- ดูรายการที่มี BOM: `/materials/pc?tab=bom&search=MOCK-`
- ดู BOM ของ sub: `/bom-workflow/materials` แล้วเลือก Material ปลายทาง `MOCK-SUB-*`

แต่ละ BOM มีส่วนประกอบเป็น main ของคู่เดียวกัน 1 รายการ ใช้หน่วยจริงในระบบ: เส้น/ชีท/คอยล์ และชิ้นสำหรับ sub; ยังคงเงื่อนไขหน้าปลายทางที่แสดงเฉพาะ Internal และไม่ใช่ PIPE/SHEET/COIL

`seed-result.json` เก็บ IDs, image paths และ BOM IDs ที่สร้างจริง รูปต้นฉบับสำหรับ seed อยู่ใน `images/` และถูกอัปโหลดผ่าน `/materials/images` เพื่อให้ API จัดเก็บ/ย้ายไฟล์ตามขั้นตอนปกติ

สร้าง/ดำเนินการต่อด้วย `node scripts/seed-mock-materials.mjs` จากราก admin-dashboard; `--inspect` อ่านเฉพาะหน่วยที่มีอยู่ สคริปต์อ่าน API URL จาก `.env.local` และบัญชี local จาก `cps-api/.env` หรือ `MOCK_USERNAME`/`MOCK_PASSWORD` โดยไม่บันทึก token/password ในรายงาน จำกัด API URL ให้เป็น loopback, ไม่แก้ทับรหัสที่ไม่ใช่ชุดนี้ และไม่เปิดใช้ BOM แทนเวอร์ชัน Active ของผู้อื่น

ดำเนินการ seed จริงและอ่านกลับเพื่อตรวจ main/sub, รูปที่เปิดได้ และ BOM Active ครบทั้ง 3 ชุด ไม่มีการรัน tests/lint/build/typecheck ตาม AGENTS R0
