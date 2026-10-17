# แผนงาน: หน้า `/system/users` ใช้ API จริง

สถานะ: โค้ดเสร็จแล้ว (2026-10-17) รอตรวจบนเครื่องจริง — ไฟล์นี้ใช้เป็น handoff ด้วย ดูหัวข้อ "สถานะงาน" และ "สิ่งที่ต้องตรวจ" ด้านล่าง
ต่อจาก: `docs/plans/2026-10-17-permission-management-plan.md` (งานแยกที่เสนอไว้ในข้อ 10)

## เป้าหมาย

SUPER_ADMIN จัดการบัญชีผู้ใช้ได้จริงจากหน้าเว็บ: ดูรายการ ค้นหา กรองสถานะ, สร้างผู้ใช้พร้อมมอบหมายแผนก/role,
แก้ข้อมูลและการมอบหมาย, ระงับ/เปิดใช้งาน, รีเซ็ตรหัสผ่าน, ลบ (เฉพาะบัญชีที่ยังไม่มีประวัติ) — แทนข้อมูลจำลองใน `src/lib/data.ts`

สิทธิ์รายคน (ALLOW/DENY) ยังตั้งที่ `/system/permissions?tab=users` ตามเดิม หน้านี้มีลิงก์ไปที่นั่น

## Backend (cps-api `src/modules/users`)

API เดิม `/users` (SUPER_ADMIN ทั้ง controller) ใช้ต่อ แก้จุดที่ไม่ปลอดภัย:

1. `GET /users` — เพิ่ม query `status=active|inactive` และส่ง `assignments` (แผนก/role แบบย่อ) ของแต่ละคนมาด้วย ไม่ต้องยิงทีละคน
2. `POST /users` — ทำใน transaction เดียว, ตรวจ assignment ด้วย `validateAggregateAssignments` เดิม
   (role ต้อง active, role SYSTEM ต้องไม่มีแผนก, role แผนกต้องมีแผนก, ห้ามซ้ำ), `departmentId` เป็น null ได้สำหรับ role SYSTEM,
   ตรวจ nested DTO (`ValidateNested`), เพิ่ม Audit `iam.user.created`
3. `PATCH /users/:id` (ใช้แก้ข้อมูล + assignment ทั้งชุด มีอยู่แล้ว) — เพิ่ม Audit `iam.user.updated`
4. `PATCH /users/:id/status` — Audit `iam.user.status_changed`
5. `POST /users/:id/reset-password` — เพิ่ม DTO (`newPassword` อย่างน้อย 6 ตัว; เดิมไม่ตรวจเลย ส่งว่างได้ → 500), Audit `iam.user.password_reset` (ไม่เก็บรหัสผ่าน)
6. `DELETE /users/:id` — ถ้าติด foreign key (มีประวัติ session/audit/เอกสาร) ตอบ 409 ภาษาไทยให้ใช้การระงับแทน, Audit `iam.user.deleted`
7. Audit ทุกตัวเขียนผ่าน `recordAuditEvent` ใน transaction เดียวกับการแก้ข้อมูล และเพิ่มใน `docs/activity-logging/event-catalog.md`

## Frontend (admin-dashboard)

ตามรูปแบบ ADR-006 (Server Component โหลดข้อมูล, ตัวกรองอยู่ใน URL, แก้ไขผ่าน Server Action):

- `src/lib/api/users.ts` — type + ฟังก์ชันเรียก API ทั้งหมด (แทน `AppUser` เดิม)
- `src/lib/filters/users-filters.ts` — `search`, `status` + chip (ตัวกรองน้อย ไม่มี drawer แบบเดียวกับใบจัดงาน)
- `src/app/(dashboard)/system/users/page.tsx` — ล็อก SUPER_ADMIN, โหลดผู้ใช้/role/แผนก
- `src/app/(dashboard)/system/users/actions.ts` — `perform*` + wrapper, ใช้ `apiErrorMessage`, `redirectIfSessionExpired`
- `src/components/users/*` — client, filters, table (`getUserRowActions`), ฟอร์มสร้าง/แก้ (RHF + zod, แถว assignment หลายแถว),
  dialog รีเซ็ตรหัสผ่าน, ยืนยันระงับ/ลบด้วย `ConfirmDialog`
- ลบ component จำลองเดิม (`user-table.tsx`, `columns.tsx`, `columns.test.tsx`) และ `AppUser` ใน `lib/types.ts`/`lib/data.ts` ถ้าไม่มีที่ใช้อื่น

## สถานะงาน

- [x] Backend 1–7 — `users.service.ts`, `users.controller.ts`, `dto/create-user.dto.ts`, `dto/reset-password.dto.ts`, spec `users.lifecycle.spec.ts` + เพิ่มกรณีใน `users.aggregate-update.spec.ts`
- [x] Frontend — `system/users/{page,actions}.tsx`, `components/users/{users-client,users-filters,users-table,user-form-dialog,user-password-dialog}.tsx`, `lib/api/users.ts`, `lib/filters/users-filters.ts`, test `users-table.test.tsx` (ลบ `user-table.tsx`, `columns.tsx`, `columns.test.tsx` ของเดิม)
- [x] AGENTS.md + event catalog + cps-api `API_ENDPOINTS.md`
- [x] commit + push ทั้งสอง repo (branch `claude/fervent-shannon-xmg3b2`)

## สิ่งที่ต้องตรวจ (session นี้ไม่มี node_modules และฐานข้อมูล จึงยังไม่ได้รันอะไร)

1. รันคำสั่งด้านล่าง แก้ type/lint ที่ขึ้น (จุดที่น่าสงสัย: zod 4 `superRefine` ใน `user-form-dialog.tsx`, `errors.assignments?.root`, `departmentId: null` ใน `createAssignment` ของ cps-api)
2. restart container `cps-api-api-1` แล้วเปิด `/system/users` ด้วยบัญชี SUPER_ADMIN: สร้างผู้ใช้ (แผนก WE + role พนักงาน), แก้ไข, รีเซ็ตรหัสผ่าน, ระงับ/เปิด, ลบบัญชีที่ยังไม่เคย login (ควรลบได้) และบัญชีที่เคย login (ควรได้ 409)
3. ตรวจตาราง `iam.audit_logs` ว่ามี `iam.user.*` และไม่มีรหัสผ่าน

ไม่ได้รัน lint/test/build ตามกฎ R0 — คำสั่งที่แนะนำหลังเสร็จ:
`pnpm test` + `npx tsc --noEmit -p tsconfig.json` (admin-dashboard), `pnpm jest src/modules/users` (cps-api)
