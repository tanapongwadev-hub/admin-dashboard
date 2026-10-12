# Main/Sub Material groups

`/materials/pc` has three URL-backed tabs, preserving existing filters and resetting pagination when switching:

- **รายการปกติ** (default, `tab=all` or absent): all Materials matching the current filters, displayed as independent records even when linked to another Material. The default active-status filter still applies; choose all statuses to include inactive records.
- **Pipe / Sheet / Coil** (`tab=raw`): source families whose main Material has one of these shapes. Uses `processingMaterialId`: the source is **Material main** and its configured output is **Material sub**. Unlinked raw Materials remain standalone. Location Type and matching names do not imply a relationship.
- **รายการที่มี BOM** (`tab=bom`): Materials owning at least one Material BOM version (DRAFT, ACTIVE or INACTIVE), displayed as independent records. Being a component of someone else's BOM does not qualify. Requires `MATERIAL_BOMS_VIEW`; the trigger is disabled with an explanation without permission, and direct URLs show a permission message.

Tab counts follow the current filters: normal/BOM counts are records; raw counts are families. Stock-summary cards are omitted; per-Material stock and stock-status filters remain available.

The three tabs sit directly above the table, without a card-header strip or ทะเบียนวัสดุ heading. In card/list views they sit immediately above the collection; empty and permission-denied results keep the tabs available.

The Server Component loads the catalog using the existing complete-catalog loader and gathers the API-filtered matching rows, preserving backend filter/sort behavior. In the raw tab, a match on either member includes its family, including a related inactive member or one that does not itself match the filters. The on-page grouping explanation was removed at the user's request. Families follow the first matching member's sort position. Duplicate matches produce one group; main precedes sub. Normal/BOM tabs never add contextual family members.

Raw-tab pagination operates on groups (20/40/60 groups per page), after completing each family. Normal/BOM pagination operates on individual records, with matching count labels. Every Material retains its own actions, permission gates, status, selection and stock quantity. Stock is fetched only with the existing stock-view permission.

Table view uses two levels: the highlighted Main row followed by indented Sub rows with a branch arrow and Main/Sub badges in the identity cell. There is no additional group-header row. Card/list views wrap each linked family together, with labeled source/output members. Standalone Materials keep their regular card/list/row presentation, without a group header, extra frame or Main/Sub badge; standalone cards use the original responsive grid. The shared `lib/material-groups.ts` owns grouping, duplicate removal and cycle-safe traversal.

The BOM tab uses `GET /material-engineering/materials/with-bom`, guarded by `MATERIAL_BOMS_VIEW`, to retrieve distinct owner IDs in one query. No schema change is required; deploy the backend endpoint with the frontend. The current implementation collects all matching pages (up to four concurrent matching-page requests) and the full catalog on the server before slicing groups. Large catalogs therefore require more reads than the previous item-pagination approach; a future API group-pagination endpoint can replace the collection step while retaining the grouping contract. Matched rows retain inventory last-receiving dates; related contextual rows use the stock-balances response, which does not currently include that date.

The table combines photo/code/name/model into one identity column, category/shape into one column, stock quantity/minimum/health into one stock column, and loading point/process line into operational metadata. Location Type remains explicit. Code/name/stock/last-receiving sorting, checkboxes and row actions remain available. The column headers and identity columns stay visible while scrolling on desktop; mobile uses horizontal scrolling. Scrollbars are hidden while scrolling remains enabled. Click a material code to open its details. Counts remain in tabs, filters and pagination; the table card-header strip has been removed.

Regression cases in `material-pc-table.test.tsx` cover sub-only matches, deduplication, group page boundaries, card/list grouping and flat rendering of related records. No tests/lint/build/typecheck or browser validation were run under R0.
