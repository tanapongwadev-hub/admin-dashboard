# Plan: CRUD Master Data — ประเภทสินค้า (Product Type), รุ่น (Product Model), ลูกค้า (Customer)

Status: **Draft — not yet implemented**
Repos affected: `cps-api` (backend) + `admin-dashboard` (frontend)
Author: Claude (planning pass, 2026-09-20)

---

## 1. Current state (verified by reading source, not assumed)

`Product` (`cps-api/src/entities/master/product.entity.ts`) already has hard FK relations to three master tables:

```ts
@ManyToOne(() => ProductType, { onDelete: 'RESTRICT' }) productType: ProductType;
@ManyToOne(() => ProductModel, { onDelete: 'RESTRICT' }) model: ProductModel;
@ManyToOne(() => Customer, { onDelete: 'RESTRICT' }) customer: Customer;
```

All three **tables already exist** — created by migration
`1786700000005-RebuildProductsAndAddMasters.ts` when Products was first built. They are currently
**read-only**: `products.service.ts` only ever `SELECT`s from them (for `GET /products/lookups`,
used to populate the product form's dropdowns). There is:

- **no controller/service/module** for any of the three (confirmed: `grep -rl "ProductType" src/modules`
  only matches `products.module.ts`/`products.service.ts` — no dedicated module),
- **no permission codes** (`PRODUCT_TYPE_VIEW`, etc. don't exist in `iam.permissions`),
- **no menu entries**, and
- **no admin UI** anywhere in `admin-dashboard`.

This plan adds real CRUD for all three, following this codebase's own established "simple-master
resource" recipe (see `admin-dashboard/AGENTS.md` § Master-data generic CRUD page / § Master-data
CRUD factories — already used for Categories, Loading Points, Delivery Types, Reject Reasons,
Material Models, Suppliers, Units, Material Types, Status Items).

### Entity field shapes (as they exist today, verified from the entity files)

**`master.product_types`** (`product-type.entity.ts`) — used for `materials.type`-style classification
(FG/SFG/RM):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `code` | varchar(20) unique | |
| `name_th` | varchar(100) | |
| `name_en` | varchar(100) nullable | |
| `description` | text nullable | |
| `sort_order` | integer, default 0 | |
| `is_active` | boolean, default true | |
| `created_at` / `updated_at` | timestamp | auto |

→ **Shape**: Categories' shape minus `parentId`/`iconColor` (has `sortOrder`, no color swatch).

**`master.product_models`** (`product-model.entity.ts`) — e.g. Camry, Civic, Corolla:

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `code` | varchar(50) unique | |
| `name_th` | varchar(255) | |
| `name_en` | varchar(255) nullable | |
| `brand` | varchar(100) nullable | **new field not seen on any existing simple-master resource** |
| `description` | text nullable | |
| `is_active` | boolean | |
| `created_at` / `updated_at` | timestamp | auto |

→ **Shape**: Material Models' Shape A (code/nameTh/nameEn/description) + one extra optional
`brand` text field.

**`master.customers`** (`customer.entity.ts`):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `code` | varchar(50) unique | |
| `name_th` | varchar(255) | |
| `name_en` | varchar(255) nullable | |
| `tax_id` | varchar(20) nullable | |
| `contact_name` | varchar(255) nullable | |
| `telephone` | varchar(50) nullable | |
| `email` | varchar(255) nullable | |
| `address` | text nullable | |
| `is_active` | boolean | |
| `created_at` / `updated_at` | timestamp | auto |

→ **Shape**: byte-for-byte identical to Suppliers' Shape D (9 fields, no `description`, wide form).

### Gap found while investigating: no `created_by`/`updated_by`

Every other simple-master table in this project (`categories`, `status_items`, `organizations`,
`material_types`, `loading_points`, ...) carries `created_by BIGINT` / `updated_by BIGINT` audit
columns. `product_types`, `product_models`, and `customers` were created in the Products rebuild
migration **before** that convention existed on this project, so they don't have them. Adding
these three CRUD modules on the existing schema as-is would produce services that can't record who
created/edited a row — the one place this project's simple-master pattern would silently regress.
**Fix**: add `created_by`/`updated_by` to all three tables as part of this migration (see §3).

---

## 2. Scope

**In scope**: full CRUD (create / update / soft-deactivate / restore / list) for all three
resources, backend + frontend, following the exact established recipe — no new UI pattern, no new
architecture decision.

**Out of scope** (flag, don't build): `product_types.sort_order`'s effect on anything besides its
own list-sort; any change to `products.service.ts`'s existing lookups query (it already reads these
tables correctly — nothing here changes what `/products` renders); any change to `Product`'s own
CRUD or its FK columns.

---

## 3. Backend plan (`cps-api`)

### 3.1 Migration — schema change (new file)

One new TypeORM migration, additive only (`ADD COLUMN`, no data loss, fully reversible):

```ts
// src/database/migrations/1790100000000-AddAuditColumnsToProductMasters.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsToProductMasters1790100000000
  implements MigrationInterface
{
  name = 'AddAuditColumnsToProductMasters1790100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // product_types, product_models, and customers were created in
    // 1786700000005-RebuildProductsAndAddMasters.ts before this project's
    // created_by/updated_by convention existed on simple-master tables —
    // every other simple master (categories, status_items, material_types, ...)
    // already has these. Adding them here so the new CRUD services can record
    // who created/edited a row, matching every sibling resource.
    await queryRunner.query(`
      ALTER TABLE master.product_types
        ADD COLUMN IF NOT EXISTS created_by BIGINT,
        ADD COLUMN IF NOT EXISTS updated_by BIGINT
    `);
    await queryRunner.query(`
      ALTER TABLE master.product_models
        ADD COLUMN IF NOT EXISTS created_by BIGINT,
        ADD COLUMN IF NOT EXISTS updated_by BIGINT
    `);
    await queryRunner.query(`
      ALTER TABLE master.customers
        ADD COLUMN IF NOT EXISTS created_by BIGINT,
        ADD COLUMN IF NOT EXISTS updated_by BIGINT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE master.product_types
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by
    `);
    await queryRunner.query(`
      ALTER TABLE master.product_models
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by
    `);
    await queryRunner.query(`
      ALTER TABLE master.customers
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by
    `);
  }
}
```

No table creation needed — `product_types`/`product_models`/`customers` already exist and already
have real data (referenced by existing `products` rows), so this is the **only** schema migration
required.

### 3.2 Migration — menus + permissions (new file, second migration)

This project's own precedent (see `AGENTS.md` § "cps-api migration: added a real sidebar entry for
`/materials/pc`") is: **don't re-run the full `seed:run` against a live, populated database** — it
risks touching unrelated already-seeded state. Instead, a second migration inserts the new
`iam.menus` + `iam.permissions` rows directly, mirroring exactly what `seed:run` would produce for a
fresh install, and `seed.ts`/`permission-registry.ts` are updated in lockstep so a *future* fresh
seed reproduces the same result without needing this migration re-run.

**Verified directly against the live DB** (not assumed — `iam.actions`/`iam.menus` were queried
before writing this):

- `iam.actions` rows are `POST(1)` / `CANCEL(2)` / `CREATE(3)` / `READ(4)` / `UPDATE(5)` / `DELETE(6)`.
  The human-facing permission-code suffix `_VIEW` does **not** match the action's own `code` column —
  every existing simple-master resource's `{PREFIX}_VIEW` permission is wired to the `READ` action
  row (confirmed: `MATERIAL_TYPE_VIEW` → `action_id` for `READ`). Map `VIEW → READ` explicitly in the
  migration; don't look up an action literally named `'VIEW'` (it doesn't exist).
- **There is a real backend menu-tree parent for `/master-data/*`**, not just a frontend-side visual
  grouping — `iam.menus.id = 27`, `code = 'MASTER DATA'` (`menu_type: 'MAIN'`, `path: ''`), and every
  existing simple-master menu (`UNIT_MANAGEMENT`, `SUPPLIER_MANAGEMENT`, `MATERIAL_TYPE_MANAGEMENT`, ...)
  is a `menu_type: 'SUB'` child with `parent_id = 27`. **This corrects a stale claim in
  `admin-dashboard/AGENTS.md`** (§ Master data dashboard hub says the `/master-data` grouping is
  "UI-only... not a real menu-tree parent" — true when written, but a real `MASTER DATA` parent menu
  exists in the current live DB). The 3 new menus should nest under `parent_id = 27` the same way,
  for sidebar consistency with their 10 siblings — flag the AGENTS.md correction as a follow-up doc
  fix alongside this work.
- `iam.permissions.code` is a free-form string set explicitly at insert time (not derived
  mechanically from the action's own `code`) — confirmed via `MATERIAL_TYPE_VIEW`'s row.
- `role_actions` linking `SUPER_ADMIN`'s role to the 4 new actions **is not needed** —
  `SUPER_ADMIN` bypasses `role_actions` entirely (`EffectivePermissionService#getEffectivePermissionCodes`
  short-circuits to "every active permission" for `isSuperAdmin`), so the new permissions are usable
  by the SUPER_ADMIN account the moment the `iam.permissions` rows exist. A future rollout to
  non-admin roles is a separate IAM task (grant via `department_permissions`/
  `user_department_permissions`), same gap already documented for every other simple-master
  resource's "Remaining permissions gap".

```ts
// src/database/migrations/1790100000001-AddProductMasterMenusAndPermissions.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

const MASTER_DATA_PARENT_MENU_ID = '27'; // iam.menus.code = 'MASTER DATA' — verified live, see plan §3.2

export class AddProductMasterMenusAndPermissions1790100000001
  implements MigrationInterface
{
  name = 'AddProductMasterMenusAndPermissions1790100000001';

  private readonly resources = [
    {
      menuCode: 'PRODUCT_TYPE_MANAGEMENT',
      nameTh: 'จัดการประเภทสินค้า',
      nameEn: 'Product Type Management',
      path: '/master-data/product-types',
      icon: 'tag',
      permPrefix: 'PRODUCT_TYPE',
      sortOrder: 10,
    },
    {
      menuCode: 'PRODUCT_MODEL_MANAGEMENT',
      nameTh: 'จัดการรุ่นสินค้า',
      nameEn: 'Product Model Management',
      path: '/master-data/product-models',
      icon: 'car',
      permPrefix: 'PRODUCT_MODEL',
      sortOrder: 11,
    },
    {
      menuCode: 'CUSTOMER_MANAGEMENT',
      nameTh: 'จัดการลูกค้า',
      nameEn: 'Customer Management',
      path: '/master-data/customers',
      icon: 'users',
      permPrefix: 'CUSTOMER',
      sortOrder: 12,
    },
  ];

  // Permission-code suffix -> the iam.actions.code it actually maps to.
  // 'VIEW' is a display-only label; the underlying shared action row is 'READ'.
  private readonly verbToActionCode: Record<string, string> = {
    VIEW: 'READ',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  };

  async up(queryRunner: QueryRunner): Promise<void> {
    const actionIdByCode: Record<string, string> = {};
    for (const actionCode of ['READ', 'CREATE', 'UPDATE', 'DELETE']) {
      const rows = await queryRunner.query(
        `SELECT id FROM iam.actions WHERE code = $1`,
        [actionCode],
      );
      if (rows.length === 0) {
        throw new Error(`iam.actions row for '${actionCode}' not found`);
      }
      actionIdByCode[actionCode] = rows[0].id;
    }

    for (const r of this.resources) {
      const menu = await queryRunner.query(
        `INSERT INTO iam.menus (parent_id, code, name_th, name_en, path, icon, menu_type, sort_order, is_active, is_visible, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'SUB', $7, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [MASTER_DATA_PARENT_MENU_ID, r.menuCode, r.nameTh, r.nameEn, r.path, r.icon, r.sortOrder],
      );
      const menuId = menu[0].id;

      for (const [verb, actionCode] of Object.entries(this.verbToActionCode)) {
        await queryRunner.query(
          `INSERT INTO iam.permissions (menu_id, action_id, code, description, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [menuId, actionIdByCode[actionCode], `${r.permPrefix}_${verb}`, `${r.nameTh} — ${verb}`],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const r of this.resources) {
      await queryRunner.query(
        `DELETE FROM iam.permissions WHERE code LIKE $1`,
        [`${r.permPrefix}_%`],
      );
      await queryRunner.query(`DELETE FROM iam.menus WHERE code = $1`, [r.menuCode]);
    }
  }
}
```

**Note on `sortOrder`**: the 10 existing siblings under parent 27 use a contiguous 0-based sequence
(`0`..`9`, verified live) — this migration continues that sequence at `10, 11, 12` rather than an
arbitrary large number, so a future `/menus` drag-and-drop reorder save (which requires contiguous
per-parent `sort_order`, see AGENTS.md § Menu management) doesn't immediately reject on a gap.
Re-check the live siblings' current `sort_order` right before running this, in case another menu was
added or reordered between writing this plan and executing it (see AGENTS.md's own "Rule for any
future 'add a menu row directly via migration' work").

### 3.3 `seed.ts` / `permission-registry.ts` updates (keep fresh installs in sync)

- `permission-registry.ts`: add 3 new imports (`PRODUCT_TYPE_PERMISSIONS`, `PRODUCT_MODEL_PERMISSIONS`,
  `CUSTOMER_PERMISSIONS`) + 3 new `fromCrud(...)` entries in `MENU_PERMISSION_REGISTRY`, same pattern
  as every existing entry.
- `seed.ts`: append 3 new menu objects to the static `menus` array (no `parentCode` — top-level,
  same as `MATERIAL_TYPE_MANAGEMENT`/`STATUS_ITEM_MANAGEMENT`), `sort_order: 100/101/102`.

### 3.4 New backend modules (3×, each mirrors `material-types` exactly)

For each of `product-types`, `product-models`, `customers`:

```
src/modules/<resource>/
├─ <resource>.controller.ts       # VIEW/CREATE/UPDATE/DELETE guards, restore uses UPDATE
├─ <resource>.service.ts          # findAll/findOne/create/update/deactivate/restore, normalizeCode()
├─ <resource>.module.ts
├─ <resource>-permissions.ts      # { VIEW, CREATE, UPDATE, DELETE }
└─ dto/
   ├─ create-<resource>.dto.ts
   ├─ update-<resource>.dto.ts    # updatedAt: string (ISO8601, required — optimistic concurrency)
   └─ list-<resource>-query.dto.ts
```

Resource-specific notes:

- **`product-types`**: `CreateProductTypeDto`/`UpdateProductTypeDto` add `sortOrder?: number` (int,
  min 0) alongside code/nameTh/nameEn/description/isActive — same shape as `categories`'
  `CreateCategoryDto`'s `sortOrder` field (copy verbatim, don't reinvent). Default list sort:
  `sortOrder` (matches Categories' own precedent for a resource that has this field — see AGENTS.md
  § Categories: "the only simple-master resource where this is true" note now needs updating to say
  "except Categories and Product Types").
- **`product-models`**: `CreateProductModelDto`/`UpdateProductModelDto` add `brand?: string | null`
  (varchar(100), same `nullableTrimmedString` transform as `description`). Default list sort: `code`.
- **`customers`**: copy `suppliers` module field-for-field (`taxId`/`contactName`/`telephone`/`email`/`address`,
  no `description`). Add an `@IsEmail()`-equivalent format check on `email` matching Suppliers'
  existing validation. Default list sort: `code`.

Register all 3 modules in `app.module.ts`'s `imports` array.

### 3.5 `API_ENDPOINTS.md`

Add a new § entry (or extend § 5.1's simple-master table) documenting the 3 new resources' routes —
same shape as the existing simple-master rows in that section.

---

## 4. Frontend plan (`admin-dashboard`)

Per this repo's own **R4 mandatory rule**: a new simple-master CRUD resource must **not** get
hand-written `page.tsx` + `actions.ts` + 6 UI component files. It gets one descriptor + a 3-line
page, using the already-built generic system (`components/master-data/generic-*.tsx`,
`lib/master-data/types.ts`, `lib/create-crud-actions.ts`, `lib/api/create-resource-api.ts`).

### 4.1 Data layer (3×, ~65 lines each, mostly type declarations)

```
src/lib/api/product-types.ts     # createResourceApi<ProductType, ...>('/product-types')
src/lib/api/product-models.ts    # createResourceApi<ProductModel, ...>('/product-models')
src/lib/api/customers.ts         # createResourceApi<Customer, ...>('/customers')

src/app/(dashboard)/master-data/product-types/actions.ts    # createCrudActions({...})
src/app/(dashboard)/master-data/product-models/actions.ts
src/app/(dashboard)/master-data/customers/actions.ts
```

### 4.2 Descriptors (3×, the only genuinely new hand-written code on the frontend)

```
src/lib/master-data/resources/product-type.ts    # Shape: Categories-minus-iconColor (sortOrder field)
src/lib/master-data/resources/product-model.ts   # Shape A + optional `brand` text field
src/lib/master-data/resources/customer.ts        # Shape D, byte-for-byte the Supplier recipe
```

Register all 3 in `src/lib/master-data/resources/index.ts`'s `masterDataResources` map.

### 4.3 Pages (3×, 3 lines each)

```
src/app/(dashboard)/master-data/product-types/page.tsx
src/app/(dashboard)/master-data/product-models/page.tsx
src/app/(dashboard)/master-data/customers/page.tsx
```

Each: `<MasterDataResourcePage resource={xResource} list={(token, params) => listX(token, params)} .../>`
— same shape as every other simple-master `page.tsx` since the 2026-09-19 `list`-prop fix (see
AGENTS.md § "Fixed a real `next build` failure: master-data `list` leaked `next/headers`").

### 4.4 `/master-data` hub

Add 3 new cards to `master-data/page.tsx`'s static resource array (name/description/href/icon/
permission code/list function) and `master-data-dashboard-view.tsx` picks them up automatically —
no component change needed there, per the hub's existing "always list all N resources" design.

### 4.5 Tests (3× API test + 3× actions test, 10 tests each — same pattern as every prior resource)

```
src/lib/api/product-types.test.ts
src/lib/api/product-models.test.ts
src/lib/api/customers.test.ts
src/app/(dashboard)/master-data/product-types/product-types-actions.test.ts
src/app/(dashboard)/master-data/product-models/product-models-actions.test.ts
src/app/(dashboard)/master-data/customers/customers-actions.test.ts
```

Add all 6 new files to `package.json`'s explicit `test` script list.

---

## 5. Verification / rollout order (per this project's R0 + prior-precedent migration discipline)

1. Write all backend code (modules, DTOs, migrations, seed/registry updates).
2. `nest build` + `pnpm lint` + `pnpm test` on `cps-api` — **must be green before any migration runs**.
3. Write all frontend code (descriptors, pages, actions, api client files, tests).
4. `npx tsc --noEmit` + `pnpm lint` + `pnpm test` on `admin-dashboard` — must be green.
5. Only after both repos are green: run the two new migrations against the live dev DB
   (`pnpm migration:run` in `cps-api`) — schema migration first, then the menu/permission migration.
6. Restart the `cps-api-api-1` Docker container (Windows bind-mount `--watch` doesn't reliably
   hot-reload — see AGENTS.md's standing rule on this) so the 3 new modules are actually live.
7. `next build` on `admin-dashboard`, confirm the 3 new routes appear in the route manifest.
8. Live smoke test (real SUPER_ADMIN session): open all 3 new `/master-data/*` pages, create one
   test row per resource, edit it, disable it, restore it, delete the test rows afterward via the
   real soft-delete flow (not a raw DB delete).
9. Update `AGENTS.md` (Project Structure, Stack if any new dep, a Recent Changes entry, and a new
   Conventions § entry per resource — same as every prior simple-master addition).

---

## 6. Open questions / risks (flagging, not blocking)

- **Live-DB menu/permission insert (§3.2) needs the exact current `iam.actions`/`iam.menus` column
  shapes confirmed against the running database before writing literal SQL** — the illustrative SQL
  above is not guaranteed byte-exact; copy the real shape from `seed.ts`'s own insert loop at
  implementation time, same caution this project's own AGENTS.md already flags for every menu-migration
  entry so far.
- **No `role_actions` grant for non-SUPER_ADMIN roles** — matches every other simple-master resource's
  documented gap ("needs permissions assigned through the IAM workflow before non-SUPER_ADMIN users
  can receive it"), not a regression specific to this plan.
- **`product_types.sort_order` UI**: Categories' own `sortOrder` field already has a working
  `heroBadge`/`number`-field descriptor pattern to copy verbatim — no new UI concept needed.
- **Naming collision check**: `PRODUCT_MODEL_*` permission codes must not collide with the existing
  `MATERIAL_MODEL_*` codes — confirmed distinct prefixes, no clash.

---

## 7. Definition of Done

- [ ] 2 new migrations written, reviewed against the live schema, and run successfully
- [ ] 3 new backend modules registered in `app.module.ts`, guarded by their own 4 permission codes
- [ ] `seed.ts` + `permission-registry.ts` updated so a fresh install reproduces the same state
- [ ] `API_ENDPOINTS.md` documents the 3 new resources
- [ ] 3 new frontend descriptors + pages + actions + api-client files, registered in the generic
      master-data registry — **no hand-written CRUD UI components**, per R4
- [ ] `/master-data` hub shows all 3 new resources with real counts
- [ ] 6 new test files (3 API + 3 actions), added to `package.json`'s `test` script
- [ ] Both repos: build + lint + test green
- [ ] Live smoke test done with a real (or disposable) SUPER_ADMIN session, cleaned up afterward
- [ ] `AGENTS.md` updated (Project Structure, Recent Changes, one Conventions § per resource)
