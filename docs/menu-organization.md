# Workspace menu organization

The menu tree is owned by cps-api, not hardcoded in the dashboard sidebar.
Migration `1790600000030-OrganizeWorkspaceMenus.ts` organizes existing records
into seven workspace roots:

1. ภาพรวม — `/dashboard`
2. คลังวัสดุ — `/materials`, with ทะเบียนวัสดุ, รับเข้าวัสดุ, ใบจัดงาน (สินค้า / วัสดุภายใน), จ่ายออกวัสดุ.
3. แปรรูปวัตถุดิบ — `/material-processing`
4. วางแผนและดำเนินการผลิต — แผนผลิตสินค้า, แผนผลิตวัสดุภายใน, สั่งผลิตตามกระบวนการ (สินค้า / วัสดุภายใน).
5. สินค้าและวิศวกรรม — ทะเบียนสินค้า, BOM และขั้นตอนการผลิต (สินค้า / วัสดุ).
6. รายงานและตรวจสอบ — รายงานติดตามวัสดุ, สอบกลับการผลิต, บันทึกการตรวจสอบ.
7. ข้อมูลพื้นฐานและระบบ — ข้อมูลพื้นฐาน, ผู้ใช้งานและสิทธิ์, จัดการเมนู.

The warehouse and BOM parent links still open their existing overview pages.
Existing menu IDs, routes, permission mappings, active flags and visibility
flags are preserved. Hidden access-control and audit entries stay hidden.
Permissionless category parents are included by the existing ancestor-inclusion
logic when a user has access to a descendant. No new permission is granted.
Custom menus are retained; all sibling positions (including hidden menus and
BUTTON nodes) are normalized to contiguous zero-based positions for `/menus`.
The deepest standard tree is four levels including BUTTON nodes.

Apply with `pnpm migration:run` in cps-api. Rollback requires a forward migration
to avoid deleting category records or discarding subsequent admin edits.
The historical seed does not encode this layout; do not rerun it to arrange
menus on an existing installation. Subsequent edits use `/menus` as usual.
Refresh the dashboard after applying to retrieve the new permission-filtered tree.

## Canonical browser paths (2026-10-13)

Migration `1790600000031-AlignWorkspaceMenuPaths.ts` updates menu URLs.
The actual App Router directories were moved to these paths; actions, internal
links, navigation and revalidation use the new locations. Backend API endpoints
are unchanged. `src/lib/legacy-menu-paths.ts` defines browser-only aliases used
by `next.config.ts` for permanent 308 redirects, preserving descendant IDs and
query parameters. Specific aliases precede their former parent aliases.

| Page | Canonical path |
| --- | --- |
| Material registry | `/materials/catalog` |
| Receiving | `/materials/receiving` |
| Disbursement | `/materials/disbursements` |
| Job Orders | `/materials/job-orders` (unchanged, including descendants) |
| Product plans | `/production/products/plans` |
| Internal material plans | `/production/internal-materials/plans` |
| Product process orders | `/production/products/orders` |
| Internal material process orders | `/production/internal-materials/orders` |
| Product registry | `/engineering/products` |
| BOM / Workflow hub | `/engineering/bom` |
| Product BOM / Workflow | `/engineering/bom/products` |
| Material BOM / Workflow | `/engineering/bom/materials` |
| Material traceability | `/reports/materials` |
| Production traceability | `/reports/production` |
| Audit | `/reports/audit-logs` |
| Analytics | `/reports/analytics` |
| Menu management | `/system/menus` |
| Users / settings | `/system/users`, `/system/settings` |
| Access-control placeholders | `/system/departments`, `/system/roles`, `/system/permissions`, `/system/sessions` |

`/dashboard`, `/materials`, `/material-processing` and `/master-data/*` retain
their existing meaningful paths. The Reference Data parent now opens the existing
`/master-data` hub. Category-only nodes retain NULL paths. No new placeholder
pages are introduced. `/products/list` is a legacy alias for the product registry;
the moved `/engineering/products/list` entry remains compatible with the shared
product page and is revalidated alongside the canonical registry.

Applied both migrations to the configured database. Read-only HTTP requests to
four old URLs returned 308 with correct canonical locations, including preserved
search/page and document ID/print query values. No lint/tests/build/typecheck run.
