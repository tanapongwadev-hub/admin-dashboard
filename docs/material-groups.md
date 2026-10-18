# Main/Sub Material groups

`/materials/catalog` has three URL-backed tabs, preserving existing filters and resetting pagination when switching:

- **รายการปกติ** (default, `tab=all` or absent): Materials matching the current filters **except** raw source Materials (shape PIPE/SHEET/COIL, the Material main / วัตถุดิบต้นทาง). Processed outputs (Material sub) and every other Material appear here as independent records. The default active-status filter still applies; choose all statuses to include inactive records.
- **Pipe / Sheet / Coil** (`tab=raw`): only the raw source Materials (shape PIPE/SHEET/COIL, the Material main), as a flat record list. Their linked outputs (`processingMaterialId`, Material sub) are not shown here; they are in the normal tab. The normal and raw tabs therefore split the filtered result without overlap.
- **รายการวัสดุ ภายใน** (`tab=bom`): Materials owning at least one Material BOM version (DRAFT, ACTIVE or INACTIVE), displayed as independent records. Being a component of someone else's BOM does not qualify. Requires `MATERIAL_BOMS_VIEW`; the trigger is disabled with an explanation without permission, and direct URLs show a permission message.

Tab counts follow the current filters and are all record counts. Stock-summary cards are omitted; per-Material stock and stock-status filters remain available.

The three tabs sit directly above the table, without a card-header strip or ทะเบียนวัสดุ heading. In card/list views they sit immediately above the collection; empty and permission-denied results keep the tabs available.

The Server Component gathers every API-filtered matching row (preserving backend filter/sort behavior), then splits it by shape: PIPE/SHEET/COIL go to the raw tab, everything else to the normal tab. No tab adds contextual family members, and the page no longer loads the complete catalog. The on-page grouping explanation was removed at the user's request.

Every tab paginates individual records (20/40/60 per page). Every Material retains its own actions, permission gates, status, selection and stock quantity. Stock is fetched only with the existing stock-view permission.

`lib/material-groups.ts` and grouped rendering (`groupRelated`) remain in `MaterialPcCollection`, but the catalog page now always passes `groupRelated={false}`. When grouping is enabled, table view uses two levels: the highlighted Main row followed by indented Sub rows with a branch arrow and Main/Sub badges in the identity cell. There is no additional group-header row. Card/list views wrap each linked family together, with labeled source/output members. Standalone Materials keep their regular card/list/row presentation, without a group header, extra frame or Main/Sub badge. The shared `lib/material-groups.ts` owns grouping, duplicate removal and cycle-safe traversal.

The BOM tab uses `GET /material-engineering/materials/with-bom`, guarded by `MATERIAL_BOMS_VIEW`, to retrieve distinct owner IDs in one query. No schema change is required; deploy the backend endpoint with the frontend. The page collects all matching pages (up to four concurrent matching-page requests) on the server before splitting and slicing tabs, so large catalogs need more reads than plain item pagination.

The table combines photo/code/name/model into one identity column, category/shape into one column, stock quantity/minimum/health into one stock column, and loading point/process line into operational metadata. Location Type remains explicit. Code/name/stock/last-receiving sorting, checkboxes and row actions remain available. The column headers and identity columns stay visible while scrolling on desktop; mobile uses horizontal scrolling. Scrollbars are hidden while scrolling remains enabled. Click a material code to open its details. Counts remain in tabs, filters and pagination; the table card-header strip has been removed.

Regression cases in `material-pc-table.test.tsx` cover sub-only matches, deduplication, group page boundaries, card/list grouping and flat rendering of related records.
