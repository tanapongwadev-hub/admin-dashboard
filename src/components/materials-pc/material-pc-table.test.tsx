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
    />
  );

  assert.match(html, /aria-label="ดูรูปภาพเต็มของ Laser-cut bracket"/);
  assert.match(html, /<img[^>]+alt="Material image: Laser-cut bracket"/);
});

test("card view renders only the card presentation", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit
      canDelete
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<ul[^>]+aria-label="รายการวัสดุ PC แบบการ์ด"/);
  assert.equal(html.match(/MAT-PC-001/g)?.length, 1);
  // Card actions are visible buttons, not the Meatballs RowActionsMenu used
  // in the table view — see AGENTS.md § Materials PC for why.
  assert.match(html, />\s*แก้ไข\s*</);
  assert.match(html, />\s*ปิดใช้งาน\s*</);
});

test("card view omits the action row entirely when the row has no permitted actions", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.doesNotMatch(html, /แก้ไข/);
  assert.doesNotMatch(html, /ปิดใช้งาน/);
});

test("renders the material image at the top of its card", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection
      materials={[{ ...material, imagePath: "/uploads/materials/bracket.webp" }]}
      view="card"
      canEdit={false}
      canDelete={false}
      stockByMaterialId={null}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

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
