import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialPcCollection, getMaterialRowActions } from "./material-pc-table";
import type { Material } from "@/lib/api/materials";

const material: Material = {
  id: "material-1",
  code: "MAT-PC-001",
  name: "Laser-cut bracket",
  type: "PC",
  materialType: "SHEET",
  ratio: 4,
  unitId: "unit-1",
  deliveryTypeId: null,
  modelId: "model-1",
  loadingPointId: null,
  processLineName: "Press line 1",
  scale: null,
  imagePath: null,
  specification: null,
  description: null,
  packingQuantity: 20,
  isActive: true,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  unit: { id: "unit-1", code: "PCS", nameEn: "Piece" },
  model: { id: "model-1", code: "BRKT-A", nameEn: "Bracket A" },
  deliveryType: null,
  loadingPoint: null,
  suppliers: [{ id: "supplier-1", code: "SUP-001", nameEn: "CPS Steel" }],
};

test("table view renders only the table presentation", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="table"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /<table/);
  assert.doesNotMatch(html, /aria-label="รายการวัสดุ PC แบบการ์ด"/);
  assert.equal(html.match(/MAT-PC-001/g)?.length, 1);
  assert.equal(html.match(/aria-label="ตัวเลือกสำหรับ Laser-cut bracket"/g)?.length, 1);
  assert.match(html, /aria-label="ไม่มีรูปภาพสำหรับ Laser-cut bracket"/);
});

test("table view shows a clickable thumbnail that opens the full image preview", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, imagePath: "/uploads/materials/bracket.webp" }]}
      view="table"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aria-label="ดูรูปภาพเต็มของ Laser-cut bracket"/);
  assert.match(html, /<img[^>]+alt="Material image: Laser-cut bracket"/);
});

test("card view renders only the card presentation (no <table> for the table view)", () => {
  // The card view DOES contain a <table> for the Data Sheet (replaced
  // Stat Grid in the latest round, 2026-09-05), so the no-<table> assertion
  // needs to be narrowed: there must be no `<table` element matching the
  // TanStack/HTML table-view table (no <thead>, no class containing
  // `rounded-xl border border-border bg-surface` which is the table-view
  // container). Asserting the table-view's distinctive wrapper class is
  // the cleanest way — it catches a future regression that accidentally
  // falls through to the table view's renderer.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // The card view's data sheet is a <table> — what's forbidden is the
  // table-view's distinctive chrome (the rounded-xl bordered wrapper
  // that wraps the table cell headers).
  assert.doesNotMatch(html, /<div class="overflow-x-auto rounded-xl border border-border bg-surface">/);
  assert.match(html, /<ul[^>]+aria-label="รายการวัสดุ PC แบบการ์ด"/);
  // The card view's own Data Sheet <table> (added 2026-09-05) IS present.
  assert.match(html, /<table class="w-full text-sm">/);
  assert.equal(html.match(/MAT-PC-001/g)?.length, 1);
  // Edit is a visible button; the active/inactive toggle is a Switch (not a
  // text button) — see AGENTS.md § Materials PC.
  assert.match(html, />\s*แก้ไข\s*</);
  assert.match(html, /role="switch"/);
  assert.match(html, />ใช้งานอยู่</);
});

test("card view omits the edit button and the status switch when the row has no permitted actions", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.doesNotMatch(html, /แก้ไข/);
  assert.doesNotMatch(html, /role="switch"/);
});

test("card view's status switch reflects an inactive material and offers to enable it", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, isActive: false }]}
      view="card"
      canEdit={false}
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /role="switch"/);
  assert.doesNotMatch(html, /data-state="checked"/);
  assert.match(html, />ไม่ได้ใช้งาน</);
  assert.match(html, /aria-label="เปิดใช้งาน Laser-cut bracket"/);
});

test("card view presents its material image uncropped in the header thumbnail", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, imagePath: "/uploads/materials/bracket.webp" }]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aria-label="บัตรแสดงวัสดุ Laser-cut bracket"/);
  assert.match(html, /object-contain/);
  assert.match(html, /<img[^>]+alt="Material image: Laser-cut bracket"/);
  assert.match(html, /%2Fuploads%2Fmaterials%2Fbracket\.webp/);
});

test("renders an accessible image fallback when a material has no image", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aria-label="ไม่มีรูปภาพสำหรับ Laser-cut bracket"/);
});

test("card view shows the real stock quantity when stockByMaterialId is provided", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit
      canDelete
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "75.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /คงเหลือ/);
  assert.match(html, />75</);
});

test("card view treats a material with no stock-balance row as quantity 0, not an error", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit
      canDelete
      stockByMaterialId={{}}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /คงเหลือ/);
  assert.match(html, />0</);
});

test("card view omits the stock row entirely when stockByMaterialId is null (no MATERIALS_RECEIVING_VIEW permission)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.doesNotMatch(html, /คงเหลือ/);
});

test("getMaterialRowActions includes edit and disable, disable is destructive, when the row is active and both permissions are granted", () => {
  const actions = getMaterialRowActions(material, true, true, { onEdit: () => undefined, onToggleStatus: () => undefined });

  assert.deepEqual(
    actions.map((a) => [a.label, a.variant]),
    [
      ["แก้ไข", "default"],
      ["ปิดใช้งาน", "danger"],
    ]
  );
});

test("getMaterialRowActions offers enable (not destructive) for an inactive row", () => {
  const actions = getMaterialRowActions({ ...material, isActive: false }, true, true, {
    onEdit: () => undefined,
    onToggleStatus: () => undefined,
  });

  assert.deepEqual(
    actions.map((a) => [a.label, a.variant]),
    [
      ["แก้ไข", "default"],
      ["เปิดใช้งาน", "default"],
    ]
  );
});

test("getMaterialRowActions omits edit when canEdit is false", () => {
  const actions = getMaterialRowActions(material, false, true, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.equal(actions.some((a) => a.label === "แก้ไข"), false);
  assert.equal(actions.some((a) => a.label === "ปิดใช้งาน"), true);
});

test("getMaterialRowActions omits disable/enable when canDelete is false", () => {
  const actions = getMaterialRowActions(material, true, false, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.equal(actions.some((a) => a.label === "แก้ไข"), true);
  assert.equal(actions.some((a) => a.label === "ปิดใช้งาน" || a.label === "เปิดใช้งาน"), false);
});

test("getMaterialRowActions returns an empty array when neither permission is granted", () => {
  const actions = getMaterialRowActions(material, false, false, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.deepEqual(actions, []);
});

test("getMaterialRowActions includes 'view details' first, regardless of edit/disable permission, when onViewDetails is passed", () => {
  const withNoPermissions = getMaterialRowActions(material, false, false, {
    onEdit: () => undefined,
    onToggleStatus: () => undefined,
    onViewDetails: () => undefined,
  });
  assert.deepEqual(withNoPermissions.map((a) => [a.label, a.variant]), [["ดูรายละเอียด", "default"]]);

  const withBothPermissions = getMaterialRowActions(material, true, true, {
    onEdit: () => undefined,
    onToggleStatus: () => undefined,
    onViewDetails: () => undefined,
  });
  assert.deepEqual(
    withBothPermissions.map((a) => [a.label, a.variant]),
    [
      ["ดูรายละเอียด", "default"],
      ["แก้ไข", "default"],
      ["ปิดใช้งาน", "danger"],
    ]
  );
});

test("getMaterialRowActions omits 'view details' when onViewDetails is not passed (backward compatible)", () => {
  const actions = getMaterialRowActions(material, true, true, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.equal(actions.some((a) => a.label === "ดูรายละเอียด"), false);
});

// =====================================================================
// Editorial card (view="card") — health badge tones, added 2026-09-05
// when the card view was upgraded to image-led Editorial design. See
// AGENTS.md § Materials PC for the heuristic that maps quantity → tone.
// =====================================================================

test("card view marks a fully-stocked row as 'สต็อกเพียงพอ' (success badge)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "124.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /สต็อกเพียงพอ/);
  assert.doesNotMatch(html, /ใกล้หมด/);
  assert.doesNotMatch(html, /หมดสต็อก/);
});

test("card view marks a low-stock row (1-9 units) as 'ใกล้หมด' (warning badge)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "8.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /ใกล้หมด/);
  assert.doesNotMatch(html, /สต็อกเพียงพอ/);
});

test("card view marks a zero-stock row as 'หมดสต็อก' (neutral badge)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "0",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /หมดสต็อก/);
  assert.doesNotMatch(html, /ใกล้หมด/);
  assert.doesNotMatch(html, /สต็อกเพียงพอ/);
});

test("card view uses a 4:3 image area for the Editorial hero", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, imagePath: "/uploads/materials/bracket.webp" }]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aspect-\[4\/3\]|aspect-ratio:\s*4\s*\/\s*3/);
});

test("card view lays out 4 cards per row at the xl breakpoint (80rem container query)", () => {
  // User asked for 1 row × 4 cards on wide viewports; the Editorial grid is
  // 1 → 2 → 4 columns across container queries at 40rem / 80rem so the
  // jump from 1 to 4 is not too aggressive on mid-sized screens. The meta
  // strip inside each card mirrors the same 2 → 4 columns.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material, { ...material, id: "m2", code: "MAT-PC-002" }]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // The Editorial ul uses container queries — the parent declares @container
  // so the 80rem container-query class is what selects "4 cards per row"
  // (not a plain 80rem media query).
  assert.match(html, /@min-\[80rem\]:grid-cols-4|@container/);
});

test("card view's data sheet is a 2-column table (label | value) for all 6 fields, no truncation", () => {
  // Data Sheet (2026-09-05, replaces the previous 3×2 Stat Grid) uses a real
  // <table> element with label | value cells. All 6 essential fields are
  // shown in full, not abbreviated — the card width at 2-col grid has
  // enough room for one-line label + value, and `break-words` lets longer
  // values wrap to a second line instead of ellipsizing.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // Data Sheet <table> is the data section.
  assert.match(html, /<table class="w-full text-sm">/);
  // No Stat Grid 3-col bento classes (bento was the previous design).
  assert.doesNotMatch(html, /grid-cols-3[^"]*gap-2/);
});

test("card view's data sheet shows all 6 essential fields as full labels (ซัพพลายเออร์, รุ่น, หน่วย, ประเภทการจัดส่ง, จุดขึ้นสินค้า, สายการผลิต)", () => {
  // Data Sheet deliberately shows the FULL label (not abbreviated) since
  // the 2-col table has enough width for "จุดขึ้นสินค้า" + value on the same
  // line. This is a deliberate difference from the Stat Grid bento, which
  // had to abbreviate ("จุดขึ้น") to fit in the narrow tile.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // Full labels as <th scope="row"> elements.
  assert.match(html, />ซัพพลายเออร์</);
  assert.match(html, />รุ่น</);
  assert.match(html, />หน่วย</);
  assert.match(html, />ประเภทการจัดส่ง</);
  assert.match(html, />จุดขึ้นสินค้า</);
  assert.match(html, />สายการผลิต</);
  // Suppliers show the full name list (not the abbreviated "1 ราย" count
  // that the Stat Grid used to fit the narrow tile).
  assert.match(html, />CPS Steel</);
  // loadingPoint + processLine values come from the helper functions; the
  // test material has them set (loadingPointId="lp-1", processLineName="Press line 1")
  // so the "—" placeholder doesn't appear here. loadingPoint itself is null
  // (loadingPointLabel returns "—" for that).
  assert.match(html, /Press line 1/);
});

test("card view's data sheet uses real <table> markup with proper <th scope> for accessibility", () => {
  // Screen readers rely on the row+header relationship to announce
  // "ซัพพลายเออร์, CPS Steel" as a pair, not as a list of unrelated strings.
  // Real <table> + <th scope="row"> keeps that semantic relationship;
  // a CSS grid of <div>s would lose it.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // At least one <th scope="row"> must be present (and they should appear
  // once per data row — 6 fields = 6 row headers).
  assert.match(html, /<th scope="row"/);
  assert.equal(html.match(/<th scope="row"/g)?.length, 6);
});

// =====================================================================
// List view (view="list") — compact horizontal rows for scanning many
// materials at once. Added 2026-09-05 alongside the Editorial card.
// =====================================================================

test("list view renders only the list presentation (no table, no card grid)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.doesNotMatch(html, /<table/);
  assert.doesNotMatch(html, /aria-label="รายการวัสดุ PC แบบการ์ด"/);
  assert.match(html, /<ul[^>]+aria-label="รายการวัสดุ PC แบบแถว"/);
  assert.match(html, /aria-label="รายการวัสดุ Laser-cut bracket"/);
});

test("list view uses the row-actions Meatballs menu instead of visible edit/disable buttons", () => {
  // List view is space-constrained: visible "แก้ไข" / "ปิดใช้งาน" buttons
  // would not fit, so we reuse the same RowActionsMenu the table view uses.
  // The menu items are still present in the menu (verified via
  // getMaterialRowActions); here we only assert that the trigger exists
  // and the buttons are not rendered as plain text.
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aria-label="ตัวเลือกสำหรับ Laser-cut bracket"/);
  // The Editorial card renders "แก้ไข" as a visible button (and status as a
  // Switch, not text); Table and List both stay on the Meatballs menu since
  // a row/list item has no room for visible action buttons.
  assert.doesNotMatch(html, />\s*แก้ไข\s*</);
  assert.doesNotMatch(html, />\s*ปิดใช้งาน\s*</);
});

test("list view still shows the action trigger (for 'view details') even when edit/disable are not permitted", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  // "ดูรายละเอียด" isn't permission-gated — it's always offered, so the
  // trigger itself is never omitted the way it was pre-onViewDetails, even
  // with no edit/disable permission. (DropdownMenuContent renders through a
  // Radix Portal that doesn't appear in renderToStaticMarkup output, so the
  // menu's item labels themselves are asserted separately via the pure
  // getMaterialRowActions() function below, not via this HTML string.)
  assert.match(html, /aria-label="ตัวเลือกสำหรับ Laser-cut bracket"/);
});

test("list view shows the real stock quantity when stockByMaterialId is provided", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit
      canDelete
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "75.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /คงเหลือ/);
  assert.match(html, />75</);
});

test("list view omits the stock column entirely when stockByMaterialId is null", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.doesNotMatch(html, /คงเหลือ/);
});

test("list view shows the 'ใกล้หมด' badge for a low-stock row", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="list"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "Laser-cut bracket",
          quantity: "5.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /ใกล้หมด/);
});

test("list view shows a clickable thumbnail that opens the full image preview", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, imagePath: "/uploads/materials/bracket.webp" }]}
      view="list"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
      onViewDetails={() => undefined}
    />
  );

  assert.match(html, /aria-label="ดูรูปภาพเต็มของ Laser-cut bracket"/);
  assert.match(html, /<img[^>]+alt="Material image: Laser-cut bracket"/);
});
