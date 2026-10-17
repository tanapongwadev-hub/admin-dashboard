# แผนออกแบบ: หน้าจัดการสิทธิ์ (ใครเข้าเมนูไหน ทำ action อะไรได้)

สถานะ: **อนุมัติแล้ว** — ขั้นที่ 1–5 เสร็จ 2026-10-17, ขั้นที่ 6 (ตั้งค่าเริ่มต้นจริง) ยังไม่เริ่ม
วันที่: 2026-10-17
ขอบเขต: cps-api (`src/modules/access-control`, `permissions`, `roles`, `users`) + admin-dashboard (`/system/*`)

## การตัดสินใจที่ผู้ใช้เลือกแล้ว

| เรื่อง | ที่เลือก |
| --- | --- |
| ใครเข้าเมนูไหน กำหนดที่ระดับไหน | **แผนก + role** ใช้โครงสร้างเดิม ไม่เพิ่มตาราง role × เมนู |
| permission ที่ไม่ผูกแผนก | **เพิ่มคอลัมน์ขอบเขต** `permissions.access_scope = ALL \| DEPARTMENTS` |
| ใครจัดการสิทธิ์ได้ | **SUPER_ADMIN เท่านั้น** |
| ที่เก็บเอกสาร | ไฟล์นี้ใน `docs/plans/` |
| พนักงานบางคนต้องเห็นเมนูของหลายแผนกพร้อมกัน | **override "อนุญาต" รายคนมีผลข้ามแผนก** (ไม่ต้องสลับแผนกตอน login) |

### กรณีใช้งานที่ต้องรองรับ

| กรณี | ตั้งค่าอย่างไร |
| --- | --- |
| เมนู A สำหรับแผนก A, เมนู B สำหรับแผนก B | แท็บ "ตามแผนก": เปิดเมนู A ให้แผนก A, เมนู B ให้แผนก B (permission กลายเป็น "เฉพาะแผนก") |
| พนักงานบางคนเข้าได้ทั้งเมนู A และ B | แท็บ "ผู้ใช้": override **อนุญาต** เมนู B ให้คนในแผนก A คนนั้น (ข้ามแผนกได้, ข้อ 3.2) |
| พนักงานทุกคนเห็นเมนู C ร่วมกัน | ปล่อยเมนู C เป็น "เปิดทุกแผนก" (`ALL`) |
| พนักงานบางคนในแผนก A ห้ามเห็นเมนู A | แท็บ "ผู้ใช้": override **ห้าม** (DENY) เมนู A ให้คนนั้น |

ข้อควรรู้: ตอนนี้ทุก permission เปิดทุกแผนก เมนูที่ไม่ได้ตั้งค่าจะยังเห็นได้ทุกแผนก ต้องไล่ปิดเมนูที่ไม่ควรเห็นด้วย

---

## 1. ระบบสิทธิ์ที่มีอยู่จริงตอนนี้ (อ่านจากโค้ดและฐานข้อมูล dev)

### 1.1 ตารางใน schema `iam`

| ตาราง | ความหมาย | ข้อมูลจริง (cps_db) |
| --- | --- | --- |
| `menus` | ต้นไม้เมนู MAIN/SUB/BUTTON | 56 เมนู |
| `actions` | action ทั้งระบบ | CREATE, READ, UPDATE, DELETE, POST, CANCEL, APPROVE, ISSUE, PRINT, PICK, REVERSE |
| `permissions` | คู่ **เมนู × action** มี `code` ไม่ซ้ำ เช่น `MATERIAL_VIEW` (1 permission ผูก 1 เมนู) | 161 รายการ |
| `roles` + `role_actions` | role ได้ "action" ซึ่ง**ใช้กับทุกเมนู** | SUPER_ADMIN/ADMIN = ทุก action, USER = CREATE/READ/UPDATE |
| `department_permissions` | จำกัด permission ให้บางแผนก | **0 แถว** |
| `user_department_roles` | การมอบหมาย ผู้ใช้ + แผนก + role (1 ผู้ใช้มีได้ 1 รายการต่อแผนก) | 2 รายการ (SUPER_ADMIN ทั้งคู่) |
| `user_department_permissions` | override รายผู้ใช้ต่อการมอบหมาย มี `effect` ALLOW/DENY และ `expires_at` | 0 แถว |
| `departments` | แผนก | WE, PS |

### 1.2 สูตรคำนวณสิทธิ์ (`AccessControlService.getEffectivePermissionRows` + `EffectivePermissionService`)

ต่อการมอบหมายที่ใช้งานอยู่ (active, ยังไม่หมดอายุ):

1. **จาก role**: permission ทุกตัวที่ `actionId` อยู่ใน `role_actions` ของ role นั้น **และ** ผ่าน `isAllowedInDepartment`
2. **จาก override**: แถว `user_department_permissions` (ALLOW/DENY) ที่ผ่าน `isAllowedInDepartment` เช่นกัน
3. ผลลัพธ์ = ALLOW − DENY

`isAllowedInDepartment`: **ไม่มีแถว department_permissions = ทุกแผนกใช้ได้**, มีแถว = เฉพาะแผนกในรายการ

- `PermissionGuard` คำนวณใหม่ทุก request เทียบกับการมอบหมายที่ active (`activeUserDepartmentRoleId`) ไม่มี cache
- `JwtStrategy` อ่านการมอบหมายปัจจุบันจาก DB ทุก request เปลี่ยน role จึงมีผลทันที
- SUPER_ADMIN ข้ามการตรวจทั้งหมด (`PermissionGuard`, `MenuTreeService` รวมทุกเมนู)
- `MenuTreeService.buildMenuTree`: เมนูแสดงเมื่อผู้ใช้มี **permission ใดก็ได้** ของเมนูนั้น (ไม่จำเป็นต้องเป็น READ) แล้วดึง parent ขึ้นมาอัตโนมัติ; เมนูที่ไม่มี permission ของตัวเองจะแสดงก็ต่อเมื่อมีลูกที่แสดง

### 1.3 API ที่มีแล้ว (ทั้งหมดล็อก SUPER_ADMIN)

| Endpoint | ใช้ทำอะไร |
| --- | --- |
| `GET /permissions`, `GET /permissions/options`, `GET /permissions/:id` | อ่าน permission + แผนกที่ผูก |
| `PUT /permissions/:id/departments` `{ departmentIds }` | ตั้งรายการแผนกของ **permission เดียว** |
| `GET/POST/PATCH/DELETE /roles` (`actionCodes`) | CRUD role และ action ของ role |
| `GET/POST/PATCH/DELETE /departments` | CRUD แผนก |
| `GET /users/:id/assignments`, `POST/PATCH/DELETE .../assignments/:assignmentId` (`permissionIds`) | มอบหมายแผนก/role + override แบบ ALLOW เท่านั้น |
| `GET /users/:id/access-summary` | permission + menu tree ที่ผู้ใช้ได้จริง แยกตามการมอบหมาย |

### 1.4 ปัญหาที่พบระหว่างสำรวจ

1. **`department_permissions` ว่าง** ถ้าวันนี้สร้างผู้ใช้ role USER จะเห็นเกือบทุกเมนู และ CREATE/UPDATE ได้ทุกที่
2. **ล้างแผนกสุดท้ายแล้วกลายเป็นเปิดให้ทุกคน** (`PUT /permissions/:id/departments` ด้วย `[]`) — แก้ด้วย `access_scope` (ข้อ 3.1)
3. **เมนูที่ไม่มี permission ของตัวเองและไม่ใช่กล่องจัดกลุ่ม**: `MATERIALS_PC_OVERVIEW`, `PRODUCTION_TRACEABILITY` — registry ชี้ไปใช้ code ของเมนูอื่น (`MATERIAL_VIEW`, `PRODUCTION_ORDER_VIEW`) แต่ code ห้ามซ้ำ จึงไม่มีแถวของเมนูนี้ ผู้ใช้ทั่วไป**จะไม่เห็นเมนูนี้เลย**
4. **`PATCH /users/:id/assignments/:assignmentId` ลบ override ทั้งหมดก่อนบันทึกใหม่** (`permissionIds ?? []`) ส่งแก้ role โดยไม่ส่ง `permissionIds` = override หายหมด และสร้าง DENY ผ่าน API ไม่ได้
5. ได้ action อื่นแต่ไม่มี READ ยังเห็นเมนูใน sidebar แต่เปิดหน้าแล้ว 403 (หน้าเช็ก `*_VIEW`)
6. การแก้สิทธิ์ใน IAM ยังไม่บันทึก Audit Event
7. `/system/users` ยังเป็น mock data

---

## 2. หลักการออกแบบ

> **แผนก = ผู้ใช้ทำงานกับเมนูไหน, role = เพดาน action, override รายผู้ใช้ = ข้อยกเว้น**

สิทธิ์ที่ได้จริงของผู้ใช้ในแผนก D ที่มี role R:

```
(permission ที่ "เปิดให้แผนก D" ∩ permission ที่ action อยู่ใน role R)
  ∪ ALLOW override (มีผลแม้แผนก D ไม่ได้เปิดเมนูนั้น และไม่ขึ้นกับ action ของ role)
  − DENY override (ชนะทุกอย่าง)
```

ตัวอย่าง: ให้แผนก WE ทำ "รับเข้าวัตถุดิบ" ได้ READ/CREATE/UPDATE/POST/CANCEL

- สมชาย role USER (CREATE/READ/UPDATE) → ได้ READ/CREATE/UPDATE แต่ยืนยันเอกสาร (POST) ไม่ได้
- หัวหน้า role ADMIN → ได้ครบทั้ง 5
- ให้สมชายยืนยันเอกสารได้คนเดียว → override ALLOW `MATERIALS_RECEIVING_CONFIRM`

ไม่เพิ่มตาราง role × เมนู ใช้ตาราง/สูตรเดิมทั้งหมด เพิ่มแค่ `access_scope` 1 คอลัมน์

---

## 3. โมเดลข้อมูล

### 3.1 เพิ่ม `iam.permissions.access_scope`

```sql
ALTER TABLE iam.permissions
  ADD COLUMN access_scope varchar(12) NOT NULL DEFAULT 'ALL'
  CHECK (access_scope IN ('ALL', 'DEPARTMENTS'));
-- กันข้อมูลที่มีแถวผูกแผนกอยู่ก่อน (ตอนนี้ 0 แถว แต่ทำไว้ให้ปลอดภัย)
UPDATE iam.permissions p SET access_scope = 'DEPARTMENTS'
WHERE EXISTS (SELECT 1 FROM iam.department_permissions dp
              WHERE dp.permission_id = p.id AND dp.is_active);
```

`isAllowedInDepartment` เปลี่ยนเป็น:

| access_scope | ผล |
| --- | --- |
| `ALL` | ทุกแผนกใช้ได้ (ไม่ดู department_permissions) |
| `DEPARTMENTS` | เฉพาะแผนกในรายการ; **รายการว่าง = ไม่มีแผนกไหนใช้ได้** |

ข้อมูลเดิมเป็น `ALL` ทั้งหมด พฤติกรรมไม่เปลี่ยนตอน deploy การปิดจริงเกิดเมื่อ SUPER_ADMIN ตั้งค่าในหน้าใหม่เท่านั้น
Migration ที่เพิ่ม permission ใหม่ในอนาคตได้ค่า `ALL` อัตโนมัติ (ให้ระบุเป็น `DEPARTMENTS` ได้ถ้าต้องการปิดไว้ก่อน)

### 3.2 ตารางเดิมที่ใช้ต่อโดยไม่แก้ schema

- `department_permissions` — เก็บรายการแผนกตามเดิม (soft toggle `is_active` แบบที่ `updateDepartments` ทำอยู่)
- `role_actions` — แก้ผ่าน `PATCH /roles/:id` (`actionCodes`) ที่มีอยู่
- `user_department_permissions` — ใช้ `effect` และ `expires_at` ที่มีอยู่แล้วแต่ยังไม่มี API

**ต้องแก้ใน service** (ไม่ใช่ schema) ใน `getEffectivePermissionRows`:

- ข้าม override ที่ `expires_at <= now()` — ตอนนี้ยังไม่เช็ก
- **override ALLOW ไม่ผ่าน `isAllowedInDepartment` อีกต่อไป** เพื่อให้พนักงานแผนก A ได้เมนู B เป็นรายคน (ตอนนี้ override ถูกกรองด้วยแผนกเหมือนสิทธิ์จาก role) ส่วน override DENY ยังใช้กับทุก permission เหมือนเดิม
- ผลกระทบ: ตอนนี้ไม่มีแถว override ในระบบ (0 แถว) จึงไม่เปลี่ยนสิทธิ์ของใคร ฝั่ง UI ต้องแสดงชัดว่า override นี้ "ข้ามแผนก" และทุกครั้งบันทึก Audit

---

## 4. API

### 4.1 ใช้ของเดิม

- `GET /departments`, `GET /roles`, `PATCH /roles/:id` (`actionCodes`) — แท็บ Role
- `GET /users`, `GET /users/:id/assignments`, `GET /users/:id/access-summary` — แท็บผู้ใช้

### 4.2 เพิ่มใหม่ (SUPER_ADMIN เท่านั้น, controller ใหม่ใน `access-control` หรือใต้ `permissions`)

**`GET /permissions/matrix`** — ข้อมูลทั้งหมดของหน้าในครั้งเดียว

```ts
{
  version: string;             // sha256 ของ (permission.id, access_scope, updated_at, department ids) — แนวเดียวกับ /menus/reorder
  actions: { id, code, nameTh, sortOrder }[];
  departments: { id, code, nameTh, isActive }[];
  menus: { id, parentId, code, nameTh, menuType, path, sortOrder, isActive, isVisible }[];  // แบนราบ client สร้าง tree
  permissions: { id, code, menuId, actionId, accessScope: 'ALL' | 'DEPARTMENTS', departmentIds: string[], isActive }[];
}
```

**`PUT /permissions/access`** — บันทึกหลายรายการใน transaction เดียว

```ts
{
  version: string;
  items: { permissionId: string; accessScope: 'ALL' | 'DEPARTMENTS'; departmentIds: string[] }[];  // ส่งเฉพาะที่เปลี่ยน
}
```

- version ไม่ตรง → 409 (คนอื่นแก้ไปแล้ว) ฝั่งหน้าเว็บโหลดใหม่ แบบเดียวกับตัวแก้เมนู
- `accessScope = 'ALL'` → ปิด (`is_active = false`) แถว department_permissions ทั้งหมดของ permission นั้น
- ตรวจว่า departmentIds มีอยู่จริง/active
- เขียน Audit Event ต่อ permission ที่เปลี่ยน (ข้อ 8)
- `PUT /permissions/:id/departments` เดิมเก็บไว้ แต่ให้ตั้ง `access_scope = 'DEPARTMENTS'` ด้วยทุกครั้ง เพื่อไม่ให้ `[]` กลายเป็นเปิดทุกคนอีก

**`GET /users/:id/assignments/:assignmentId/permissions`** และ **`PUT` (แทนทั้งชุด)**

```ts
{ items: { permissionId: string; effect: 'ALLOW' | 'DENY'; expiresAt: string | null }[] }
```

- แก้ `PATCH .../assignments/:assignmentId`: ถ้า**ไม่ส่ง** `permissionIds` ให้คง override เดิมไว้ (ตอนนี้ลบทิ้งหมด) — เป็น breaking fix ที่ปลอดภัย เพราะ dashboard ยังไม่มีผู้เรียก API นี้
- ปฏิเสธการ override ให้การมอบหมายของ SUPER_ADMIN (ไม่มีผล)

**ขยาย `GET /users/:id/access-summary`** — เพิ่ม `sources` ต่อ permission เพื่ออธิบายเหตุผล:

```ts
explain: { code: string; granted: boolean; reasons: ('ROLE' | 'USER_ALLOW' | 'USER_DENY' | 'DEPARTMENT_BLOCKED' | 'ROLE_LACKS_ACTION')[] }[]
```

ข้อมูลส่วนใหญ่มีอยู่แล้วใน `EffectivePermissionRow.source`

---

## 5. UI — หน้า `/system/permissions` "สิทธิ์การเข้าถึง"

ตามรูปแบบ `/system/menus`: Server Component ตรวจ `isSuperAdmin` แล้วดึง `GET /permissions/matrix`, แก้ไขแบบรวมไว้ก่อน (staged) แล้วกดบันทึกครั้งเดียว, Server Actions เรียก API แล้ว `revalidatePath`, ฝั่ง client เก็บแค่สถานะ UI (ADR-006, R4)

เมนูใหม่ `PERMISSION_MANAGEMENT` (SUB ใต้ `REFERENCE_SYSTEM`, path `/system/permissions`, icon `shield-check`) เพิ่มด้วย migration ไม่ต้องมี permission เพราะ SUPER_ADMIN เห็นทุกเมนูอยู่แล้ว

### แท็บ 1 — "ตามแผนก" (หน้าหลัก)

```
แผนก: [WE ▾]     ค้นหาเมนู [_______]     เปลี่ยน 4 รายการ  [รีเซ็ต] [บันทึก]

เมนู                         ดู  สร้าง แก้ไข ลบ  ยืนยัน ยกเลิก อนุมัติ ...
▾ คลังวัสดุ                  [แถวกลุ่ม: ติ๊กทั้งกลุ่ม]
   ทะเบียนวัสดุ              ●   ●    ●    ○   —    —     —
   รับเข้าวัตถุดิบ            ●   ●    ●    ○   ●    ○     —
   รายงานวัสดุ               ◐   —    —    —   —    —     —
▸ วางแผนและดำเนินการผลิต
```

- แถว = ต้นไม้เมนู (ย่อ/ขยายได้ เยื้องตามระดับ), คอลัมน์ = action ที่มีอยู่จริงในระบบ
- ช่องที่เมนูไม่มี permission ของ action นั้น = `—` (คลิกไม่ได้)
- สถานะช่องต่อแผนกที่เลือก:
  - ● เปิดให้แผนกนี้ (`DEPARTMENTS` และมีแผนกนี้)
  - ◐ เปิดทุกแผนก (`ALL`) — มีคำอธิบายบนช่อง
  - ○ ปิด
- **ปิดช่อง ◐**: แจ้งว่า "สิทธิ์นี้เปิดทุกแผนกอยู่ จะเปลี่ยนเป็นเฉพาะแผนกที่เลือก: PS" แล้วแปลงเป็น `DEPARTMENTS` ที่มีแผนกอื่นที่ active ทั้งหมด ยกเว้นแผนกนี้ (และบอกว่าแผนกที่สร้างใหม่ในอนาคตจะไม่ได้สิทธิ์นี้อัตโนมัติ)
- มีปุ่ม "เปิดทุกแผนก" ต่อแถว (คืนเป็น `ALL`)
- **แถวกลุ่ม** (เมนูจัดกลุ่มที่ไม่มี permission เช่น คลังวัสดุ): ติ๊ก/ล้างทั้งคอลัมน์ให้ลูกทุกตัวที่มี permission นั้น ใช้แค่ช่วยกด ไม่เก็บค่าที่ parent
- แถบด้านบนสรุปรวม เช่น "WE เข้าได้ 18 เมนู"

มุมมองเสริม (สลับได้): **"ตาม permission"** — แถว = เมนู × action, คอลัมน์ = `ทุกแผนก | WE | PS` ใช้ดูทีเดียวว่าแต่ละสิทธิ์เปิดให้ใคร เหมาะเมื่อแผนกยังน้อย

### แท็บ 2 — "Role"

- ตาราง role × action แบบ checkbox (`PATCH /roles/:id` ที่มีอยู่)
- แถว SUPER_ADMIN อ่านอย่างเดียว พร้อมข้อความ "ข้ามการตรวจสิทธิ์ทั้งหมด"
- แจ้งเตือนว่ากระทบผู้ใช้ทุกคนในทุกแผนกที่ใช้ role นี้ พร้อมจำนวนการมอบหมาย

### แท็บ 3 — "ผู้ใช้"

- เลือกผู้ใช้ → เลือกการมอบหมาย (แผนก + role)
- ต้นไม้เมนู × action แบบเดียวกับแท็บ 1 แต่แสดง**สิทธิ์ที่ได้จริง** ทุกช่องอธิบายที่มาได้ (จาก role / override / แผนกปิด / role ไม่มี action)
- คลิกช่องเพื่อ override: `ตามค่าเริ่มต้น → อนุญาตเพิ่ม → ห้าม` พร้อมวันหมดอายุ (เลือกได้)
- ช่องที่แผนกปิดอยู่ override เป็น "อนุญาต" ได้ แสดงป้าย "ข้ามแผนก" พร้อมยืนยันก่อนบันทึก
- ตัวกรอง "แสดงเฉพาะที่มี override" เพื่อตรวจข้อยกเว้นรายคนได้ง่าย และหน้าแท็บแผนกแสดงจำนวนคนที่ได้ override ข้ามแผนกต่อเมนู
- ดูตัวอย่าง sidebar ของผู้ใช้คนนั้น (`access-summary.menus`)

> การสร้างผู้ใช้/มอบหมายแผนก-role ยังอยู่ที่ `/system/users` ซึ่งเป็น mock — ทำให้ใช้ API จริงเป็นงานแยก (ดูข้อ 10)

### ไฟล์ตามโครงสร้างเดิม

```
src/app/(dashboard)/system/permissions/{page.tsx, actions.ts, loading.tsx}
src/lib/api/access-control.ts           # matrix, saveAccess, overrides, roles actions
src/lib/permission-matrix.ts             # pure: สร้าง tree, คำนวณสถานะช่อง, diff, กติกา READ (มี test)
src/components/permissions/
  permission-matrix-client.tsx           # tabs + staged changes + save/reset/conflict
  department-matrix.tsx, role-actions-table.tsx, user-override-matrix.tsx
  permission-cell.tsx                    # 1 ช่อง: สถานะ + คำอธิบาย + aria
```

ใช้ `ui/select.tsx` (ค้นหาได้), `ui/checkbox.tsx`, `ui/tabs.tsx`, `ConfirmDialog`, toast `sonner` และ theme token เดิม ช่องต้องมี `aria-label` เช่น "รับเข้าวัตถุดิบ – ยืนยัน – แผนก WE: เปิด" และบอกสถานะเป็นข้อความหรือไอคอน ไม่ใช้สีอย่างเดียว

---

## 6. กติกา parent/child และ action

1. **parent แสดงตามลูก** (ไม่เปลี่ยนจาก `MenuTreeService`) ไม่เก็บสิทธิ์ที่เมนูจัดกลุ่ม
2. **READ เป็นพื้นฐาน**: ใน UI เมื่อเปิด action อื่นของเมนูใด ให้เปิด READ ของเมนูนั้นให้อัตโนมัติ และปิด READ = ปิดทุก action ของเมนูนั้นในแผนกนั้น (มีแจ้งเตือน) แก้ปัญหาข้อ 1.4-5 ฝั่ง API ตรวจแล้วตอบ 400 ถ้าเปิด action อื่นโดยไม่มี READ ในแผนกเดียวกัน
3. **BUTTON menu** (เช่น workflow ใน BOM) แสดงเป็นแถวย่อยใต้เมนูแม่ ใช้กติกาเดียวกัน
4. **เมนูที่ inactive/ซ่อน** แสดงแบบจางพร้อมป้าย "ปิดใช้งาน" ยังตั้งสิทธิ์ได้ แต่ sidebar ไม่แสดงจนกว่าจะเปิดเมนู
5. **permission ที่ใช้ร่วมกันหลายหน้า** (เช่น `MATERIAL_VIEW` คุมทั้งทะเบียนวัสดุและภาพรวม) แสดงป้าย "ใช้กับหน้า: …" เพื่อไม่ให้ admin เข้าใจผิดว่าปิดหน้าเดียว

---

## 7. SUPER_ADMIN

- ไม่ได้รับผลกระทบจาก matrix เลย (guard ข้าม, เห็นทุกเมนู) — หน้าแสดงข้อความนี้ชัดเจน
- แถว SUPER_ADMIN ในแท็บ Role อ่านอย่างเดียว และไม่ให้ override การมอบหมายของ SUPER_ADMIN
- การป้องกัน "SUPER_ADMIN คนสุดท้าย" เดิม (`assertAssignmentCanStopBeingSuperAdmin`) คงไว้
- หน้านี้ตรวจ `session.user.isSuperAdmin` ทั้งฝั่งหน้าเว็บและ API (`@Roles(SUPER_ADMIN)`)

## 8. Audit

เพิ่มใน `docs/activity-logging/event-catalog.md` ก่อนเขียนโค้ด (เขียนลง DB ตรงใน transaction เดียวกัน, ไม่ใช้ queue):

- `iam.permission.department_scope_changed` (ชื่อตาม event catalog) — before/after `{ code, accessScope, departmentIds }` และ**ต้องระบุเหตุผล** ใน `PUT /permissions/access`
- `iam.role.actions_changed` — before/after action codes
- `iam.user_permission.overrides_changed` — before/after `{ permissionCode, effect, expiresAt }[]`

## 9. Cache และการรีเฟรช session

| ส่วน | พฤติกรรม | ต้องทำอะไร |
| --- | --- | --- |
| API (`PermissionGuard`, `JwtStrategy`) | คำนวณจาก DB ทุก request ไม่มี cache | มีผลทันที ไม่ต้องทำอะไร |
| `/auth/me` + `getCurrentSession` | `React.cache` ต่อ request เท่านั้น | — |
| Sidebar ของผู้ใช้ที่ถูกแก้สิทธิ์ | layout ไม่ render ใหม่ตอน soft navigation | sidebar อัปเดตเมื่อรีเฟรช/โหลดหน้าใหม่ ระหว่างนั้นถ้ากดเมนูที่ถูกปิดจะเจอหน้า 403 ของหน้านั้น — **ยอมรับใน v1** |
| ผู้ดูแลที่กดบันทึก | Server Action `revalidatePath("/system/permissions")` + `router.refresh()` | — |

ทางเลือกภายหลัง (ไม่ทำใน v1): ใส่ `permissionsVersion` ใน `/auth/me` แล้ว `AuthHeartbeat` ที่มีอยู่เช็กเป็นระยะ ถ้าเปลี่ยนให้ `router.refresh()`

ด้านประสิทธิภาพ: `getEffectivePermissionRows` โหลด permission ทั้งหมดพร้อม department mapping ทุก request (161 แถว) ยังรับได้ ถ้าเพิ่มมากค่อยทำ cache ในหน่วยความจำ ล้างเมื่อบันทึก

---

## 10. ลำดับการทำงาน (หลังอนุมัติ)

1. **Backend พื้นฐาน** — migration `access_scope`, แก้ `isAllowedInDepartment` + ข้าม override หมดอายุ, `GET /permissions/matrix`, `PUT /permissions/access` (version + audit), แก้ `PUT /permissions/:id/departments`, spec ทดสอบ — **เสร็จแล้ว**: migration รันใน dev DB แล้ว, เพิ่ม `reason` ที่ต้องกรอกตอนบันทึก (UI ขั้นที่ 2 ต้องมีช่องเหตุผล)
2. **หน้าแท็บ "ตามแผนก"** + เมนู `PERMISSION_MANAGEMENT` + `lib/permission-matrix.ts` + test — **เสร็จแล้ว**: เมนู PERMISSION_MANAGEMENT มีอยู่แล้วใน DB (ไม่ต้อง migration) ช่องเหตุผลอยู่ในกล่องยืนยันบันทึก
3. **แท็บ Role** (ใช้ API เดิม) + audit `iam.role.actions_changed` — **เสร็จแล้ว**: ใช้ endpoint ใหม่ `PUT /roles/actions` (บันทึกหลาย role ใน transaction เดียว ต้องระบุเหตุผล) แทนการเรียก PATCH ทีละ role
4. **แท็บผู้ใช้** — API override, แก้ `PATCH assignments` ไม่ให้ลบ override, ขยาย access-summary — **เสร็จแล้ว**: คำนวณสิทธิ์ที่ได้จริงฝั่งหน้าเว็บด้วยกติกาเดียวกับ API (ยังไม่ได้ขยาย access-summary) และไม่เพิ่ม permissionVersion เพื่อไม่ให้ผู้ใช้หลุด login
5. **แก้เมนูที่ไม่มี permission** (`MATERIALS_PC_OVERVIEW`, `PRODUCTION_TRACEABILITY`) — ดูคำถามข้อ 11.1 — **เสร็จแล้ว**: migration `1790600000035` เพิ่ม permission นำทาง `MATERIALS_PC_OVERVIEW_VIEW`, `PRODUCTION_TRACEABILITY_VIEW` และพบเพิ่ม `MATERIALS_REPORT_VIEW` (ขอบเขตเริ่มต้นคัดลอกจากสิทธิ์ข้อมูล) หน้าจอยังใช้สิทธิ์ข้อมูลเดิม จึงไม่ต้องแก้ guard
6. **ตั้งค่าเริ่มต้นจริง** — หลังหน้าใช้งานได้ SUPER_ADMIN ไล่ปิด/เปิดให้ WE, PS ก่อนสร้างผู้ใช้ทั่วไป

งานแยก (เสนอเป็น session ต่างหาก): ทำ `/system/users` ให้ใช้ API จริง (สร้างผู้ใช้, มอบหมายแผนก/role)

## 11. คำถามที่ยังต้องตัดสินใจ (ไม่บล็อกขั้น 1–4)

1. **เมนูที่ใช้ permission ร่วมกับเมนูอื่น** — (ก) สร้าง permission นำทางของตัวเอง เช่น `MATERIALS_PC_OVERVIEW_VIEW` และให้หน้ารับ `RequireAnyPermissions` ทั้งของเดิมและของใหม่ (แบบเดียวกับ `MATERIAL_PROCESS_ORDER_VIEW`) หรือ (ข) ย้ายหน้าไปเป็นแท็บของเมนูแม่แล้วลบเมนูนี้ — แนะนำ (ก) — **ตัดสินแล้ว: (ก)** แต่ไม่ต้องใช้ RequireAnyPermissions เพราะ permission ใหม่คุมแค่การแสดงเมนู
2. **ค่าเริ่มต้นตอนแปลง ◐ → เฉพาะแผนก** — แนะนำ "แผนกอื่นที่ active ทั้งหมด ยกเว้นแผนกที่ปิด" (ไม่ทำให้แผนกอื่นเสียสิทธิ์ทันที)
3. ~~ผู้ใช้ที่ต้องเห็นเมนูหลายแผนก~~ — **ตัดสินแล้ว**: ใช้ override ALLOW ข้ามแผนก (ข้อ 3.2) ไม่ต้องมอบหมายหลายแผนกหรือรวมสิทธิ์ทุกแผนก
4. **override ข้ามแผนกควรได้ action อะไร** — ข้อเสนอ: ให้ตาม permission ที่ติ๊กรายตัว (เช่น ให้แค่ "ดู" เมนู B) ไม่ผูกกับ role เพื่อให้ข้อยกเว้นแคบที่สุด
