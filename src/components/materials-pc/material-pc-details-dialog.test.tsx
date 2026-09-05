import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialPcDetailsView } from "./material-pc-details-dialog";
import type { Material } from "@/lib/api/materials";

// Tests the inner content layout (MaterialPcDetailsView) directly.
// The Radix Dialog wrapper (MaterialPcDetailsDialog) renders through a
// Portal which `renderToStaticMarkup` can't capture — same Portal-capture
// limitation noted in AGENTS.md § Row actions for the DropdownMenu case.
// The wrapper itself is a thin shell (open + DialogContent + View), so
// testing the content is sufficient; the public dialog is exercised in
// the live app / build.

const material: Material = {
  id: "material-1",
  code: "MAT-PC-001",
  name: "อะคริลิคแผ่นใส 5mm",
  type: "PC",
  materialType: "SHEET",
  ratio: 4,
  unitId: "unit-1",
  deliveryTypeId: null,
  modelId: "model-1",
  loadingPointId: "lp-1",
  processLineName: "Press line 1",
  scale: "1:4",
  packingQuantity: 20,
  imagePath: null,
  specification: "ทนความร้อน 80°C\nUV resistant",
  description: "ใช้สำหรับงานภายนอกอาคาร",
  isActive: true,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  unit: { id: "unit-1", code: "PCS", nameEn: "Piece" },
  model: { id: "model-1", code: "BRKT-A", nameEn: "Bracket A" },
  deliveryType: null,
  loadingPoint: { id: "lp-1", code: "LP-BPI", nameEn: "Bang Pa-In" },
  suppliers: [
    { id: "supplier-1", code: "SUP-001", nameEn: "CPS Steel" },
    { id: "supplier-2", code: "SUP-002", nameEn: "ABC Corp" },
  ],
};

test("renders the hero header with name, code, status badge, and shape badge", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, /MAT-PC-001/);
  assert.match(html, /อะคริลิคแผ่นใส 5mm/);
  assert.match(html, /ใช้งาน/);
  assert.match(html, /SHEET · 4/);
});

test("renders a 4:3 image area sized 320×240 on sm+ viewports (Round 6 redesign)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, /aspect-\[4\/3\]|aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(html, /sm:w-\[320px\]|width:\s*320px/);
  assert.match(html, /sm:h-\[240px\]|height:\s*240px/);
});

test("renders accessible image fallback when imagePath is null", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, /aria-label="ไม่มีรูปภาพสำหรับ อะคริลิคแผ่นใส 5mm"/);
});

test("renders stock + health badge inline in the hero (no separate stock card)", () => {
  // Round 6 redesign: the stock number moved from a separate stats card
  // (Round 5) into the hero section, right under the identity block. This
  // test asserts the inline stock render (not a separate card with
  // bg-primary-soft / bg-warning-soft background — those are gone).
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "อะคริลิคแผ่นใส 5mm",
          quantity: "124.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onClose={() => undefined}
    />
  );

  assert.match(html, /คงเหลือ/);
  assert.match(html, />124</);
  assert.match(html, /PCS|Piece/);
  assert.match(html, /สต็อกเพียงพอ/);
  // No separate stats card backgrounds anymore.
  assert.doesNotMatch(html, /bg-primary-soft[^"]*rounded-lg border p-4/);
});

test("marks low-stock rows as 'ใกล้หมด' (warning color) inline in the hero", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "อะคริลิคแผ่นใส 5mm",
          quantity: "5.0000",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onClose={() => undefined}
    />
  );

  assert.match(html, /ใกล้หมด/);
  // Stock number itself is warning-colored, not a card background.
  // The 5 (low stock) renders in a span that includes both `tabular-nums`
  // and `text-warning` classes (the order doesn't matter).
  assert.match(html, /class="[^"]*text-warning[^"]*"[^>]*>5</);
});

test("marks zero-stock rows as 'หมดสต็อก' (muted color) inline in the hero", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={{
        "material-1": {
          materialId: "material-1",
          materialCode: "MAT-PC-001",
          materialName: "อะคริลิคแผ่นใส 5mm",
          quantity: "0",
          unitCode: "PCS",
          unitNameTh: "ชิ้น",
          lastMovementAt: "2026-09-01T00:00:00.000Z",
        },
      }}
      onClose={() => undefined}
    />
  );

  assert.match(html, /หมดสต็อก/);
  assert.match(html, />0</);
});

test("omits the stock number and shows a permission note in the hero when stockByMaterialId is null", () => {
  // Round 6 redesign: stock is inline in the hero, not a separate card.
  // The permission note ("ไม่มีสิทธิ์ดูสต็อก") is the only stock-related
  // text rendered when the viewer lacks MATERIALS_RECEIVING_VIEW.
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.doesNotMatch(html, />124</);
  assert.match(html, /ไม่มีสิทธิ์ดูสต็อก/);
});

test("consolidates all 6 essential fields into a single Data Sheet section (ข้อมูลจำเพาะ)", () => {
  // Round 6 redesign: instead of 4 separate sectioned grids (ข้อมูลพื้นฐาน,
  // การจัดส่ง, ซัพพลายเออร์, รายละเอียดเพิ่มเติม) the dialog now shows ONE
  // "ข้อมูลจำเพาะ" section with a single 2-col table containing all 6
  // essential fields — matches the card's Data Sheet pattern so the two
  // views use identical key-value formatting.
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, />ข้อมูลจำเพาะ</);
  // All 6 labels present in the table.
  assert.match(html, />ซัพพลายเออร์</);
  assert.match(html, />รุ่น</);
  assert.match(html, />หน่วย</);
  assert.match(html, />ประเภทการจัดส่ง</);
  assert.match(html, />จุดขึ้นสินค้า</);
  assert.match(html, />สายการผลิต</);
  // The old section labels from Round 5 are gone (replaced by a single
  // "ข้อมูลจำเพาะ" section that holds all 6 fields).
  assert.doesNotMatch(html, />การจัดส่ง</);
  // The standalone "ซัพพลายเออร์" section heading is gone — suppliers
  // moved into the unified data sheet table as a row.
  const supplierSectionMatches = html.match(/<h3[^>]*>ซัพพลายเออร์<\/h3>/g);
  assert.equal(supplierSectionMatches, null);
});

test("renders suppliers as a comma-joined list inside the data table (matches card view)", () => {
  // Round 5 had suppliers as individual pills in a dedicated section;
  // Round 6 puts the full list in the unified data sheet's ซัพพลายเออร์
  // row, same as the card view uses (the table view's supplier cell also
  // uses the joined list).
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  // Both suppliers are present in the markup, joined.
  assert.match(html, /CPS Steel, ABC Corp/);
  // But there are no per-supplier pills anymore.
  assert.equal(html.match(/<li><span[^>]*>CPS Steel<\/span><\/li>/g), null);
});

test("renders the spec/description block only when at least one is non-empty", () => {
  const withSpec = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );
  assert.match(withSpec, /ข้อมูลจำเพาะ/);
  assert.match(withSpec, /ทนความร้อน 80°C/);
  assert.match(withSpec, /รายละเอียด/);
  assert.match(withSpec, /ใช้สำหรับงานภายนอกอาคาร/);

  const noText = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={{ ...material, specification: null, description: null }}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );
  assert.doesNotMatch(noText, /รายละเอียดเพิ่มเติม/);
  assert.doesNotMatch(noText, /ทนความร้อน/);
});

test("preserves newlines in specification and description (whitespace-pre-line)", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, /whitespace-pre-line/);
});

test("renders the activity line (เพิ่มเมื่อ / แก้ไขล่าสุด) inline at the bottom", () => {
  // Round 6 redesign: the "ความเคลื่อนไหว" *card* is gone — the timestamps
  // are now a single inline `<p>` at the bottom of the body, not a separate
  // bordered card. This keeps the activity info visible but stops it from
  // competing with the more important data above for the user's eye.
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  // The "ความเคลื่อนไหว" section heading is gone.
  assert.doesNotMatch(html, />ความเคลื่อนไหว</);
  // The labels still appear inline.
  assert.match(html, /เพิ่มเมื่อ/);
  assert.match(html, /แก้ไขล่าสุด/);
  // Timestamps render via toLocaleString("th-TH", ...) which uses the
  // Buddhist Era (CE year + 543). Asserts the year number is in the markup —
  // 2026 CE = 2569 BE in Thai locale.
  assert.match(html, /2569|2026/);
  // The timestamps are inside <span class="text-fg-secondary"> for the
  // actual date values (label stays muted, value gets the secondary color).
  assert.match(html, /<span class="text-fg-secondary">3 ก\.ย\./);
});

test("footer renders only the Close button when canEdit is false or onEdit is omitted", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      onClose={() => undefined}
    />
  );

  assert.match(html, />ปิด</);
  // แก้ไข is intentionally absent without a permission gate.
  assert.doesNotMatch(html, />แก้ไข</);
});

test("footer renders the Edit button when canEdit is true and onEdit is provided", () => {
  const html = renderToStaticMarkup(
    <MaterialPcDetailsView
      material={material}
      stockByMaterialId={null}
      canEdit
      onEdit={() => undefined}
      onClose={() => undefined}
    />
  );

  // Edit button is rendered (variant=primary gives it the brand color)
  assert.match(html, />แก้ไข</);
});
