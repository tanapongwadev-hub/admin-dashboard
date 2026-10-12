import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialPcCollection, getMaterialRowActions, getStockHealthLabel, getStockTone } from "./material-pc-table";
import type { Material, StockBalance } from "@/lib/api/materials";
import { groupMaterials } from "@/lib/material-groups";

const material: Material = {
  id: "material-1",
  code: "MAT-PC-001",
  name: "Laser-cut bracket",
  type: "PC",
  materialType: "SHEET",
  ratio: 4,
  unitId: "unit-1",
  deliveryTypeId: null,
  materialTypeId: null,
  modelId: "model-1",
  loadingPointId: "point-1",
  processLineName: "Press line 1",
  scale: null,
  imagePath: null,
  specification: null,
  description: null,
  packingQuantity: 20,
  minimumStock: "10.0000",
  isActive: true,
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
  unit: { id: "unit-1", code: "PCS", nameEn: "Piece" },
  model: { id: "model-1", code: "BRKT-A", nameEn: "Bracket A" },
  deliveryType: null,
  materialTypeMaster: null,
  loadingPoint: { id: "point-1", code: "LP-1", nameEn: "Dock A" },
  suppliers: [{ id: "supplier-1", code: "SUP-001", nameEn: "CPS Steel" }],
};

const stock = (quantity: string): Record<string, StockBalance> => ({
  [material.id]: {
    materialId: material.id,
    materialCode: material.code,
    materialName: material.name,
    quantity,
    unitCode: "PCS",
    unitNameTh: "ชิ้น",
    lastMovementAt: "2026-09-08T00:00:00.000Z",
    lastReceivedAt: "2026-09-07",
  },
});

const handlers = {
  onEdit: () => undefined,
  onToggleStatus: () => undefined,
  onViewDetails: () => undefined,
  onReceive: () => undefined,
  onViewReceivingHistory: () => undefined,
  onViewDisbursementHistory: () => undefined,
  onViewBomUsage: () => undefined,
};

function render(view: "card" | "list", quantity = "12") {
  return renderToStaticMarkup(
    <MaterialPcCollection
      materials={[material]}
      view={view}
      canEdit
      canDelete
      stockByMaterialId={stock(quantity)}
      {...handlers}
    />
  );
}

test("derives stock status from the real minimum stock boundary", () => {
  assert.equal(getStockHealthLabel(getStockTone(0, 10)).label, "หมดสต็อก");
  assert.equal(getStockHealthLabel(getStockTone(9.9999, 10)).label, "สต็อกต่ำ");
  assert.equal(getStockHealthLabel(getStockTone(10, 10)).label, "สต็อกปกติ");
});

test("compact card prioritizes stock, minimum, operations and primary receive action", () => {
  const html = render("card");
  assert.match(html, /aspect-\[16\/9\]/);
  assert.match(html, /คงเหลือ/);
  assert.match(html, /ขั้นต่ำ/);
  assert.match(html, /จุดขึ้นสินค้า/);
  assert.match(html, /สายการผลิต/);
  assert.match(html, /\+ รับเข้า/);
  assert.match(html, /รายละเอียด/);
  assert.doesNotMatch(html, /ข้อมูลจำเพาะ/);
});

test("standalone card retains its normal grid without group decoration", () => {
  const html = render("card");
  assert.match(html, /grid-cols-1/);
  assert.match(html, /@min-\[36rem\]:grid-cols-2/);
  assert.doesNotMatch(html, /aria-label="กลุ่มวัสดุ /);
  assert.doesNotMatch(html, /Material main/);
  assert.doesNotMatch(html, /Material sub/);
});

test("matching only a sub material includes its main and deduplicates the pair", () => {
  const main = { ...material, id: "main", processingMaterialId: "sub" };
  const sub = { ...material, id: "sub", code: "CUT-001", processingMaterialId: null };
  const groups = groupMaterials([sub, main, sub], [main, sub]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((entry) => entry.id), ["main", "sub"]);
  assert.equal(groupMaterials([sub], [main, sub])[0].main.id, "main");
});

test("group pagination never separates a main and sub across page boundaries", () => {
  const main = { ...material, id: "main", processingMaterialId: "sub" };
  const sub = { ...material, id: "sub", processingMaterialId: null };
  const standalone = { ...material, id: "single", processingMaterialId: null };
  const groups = groupMaterials([standalone, sub, main], [main, standalone, sub]);
  assert.deepEqual(groups.slice(1, 2).flatMap((group) => group.members.map((entry) => entry.id)), ["main", "sub"]);
});

test("card and list render main and sub inside one family", () => {
  const main = { ...material, id: "main", processingMaterialId: "sub" };
  const sub = { ...material, id: "sub", code: "CUT-001", processingMaterialId: null };
  for (const view of ["card", "list"] as const) {
    const html = renderToStaticMarkup(<MaterialPcCollection materials={[main, sub]} view={view} canEdit canDelete stockByMaterialId={null} {...handlers} />);
    assert.equal((html.match(/aria-label="กลุ่มวัสดุ /g) ?? []).length, 1);
    assert.match(html, /Material main/);
    assert.match(html, /Material sub/);
    assert.match(html, /CUT-001/);
  }
});

test("normal and BOM views can render related materials as ordinary independent records", () => {
  const main = { ...material, id: "main", processingMaterialId: "sub" };
  const sub = { ...material, id: "sub", code: "CUT-001", processingMaterialId: null };
  for (const view of ["card", "list"] as const) {
    const html = renderToStaticMarkup(<MaterialPcCollection materials={[main, sub]} groupRelated={false} view={view} canEdit canDelete stockByMaterialId={null} {...handlers} />);
    assert.match(html, /CUT-001/);
    assert.match(html, /Laser-cut bracket/);
    assert.doesNotMatch(html, /aria-label="กลุ่มวัสดุ |Material main|Material sub/);
  }
});

test("card uses the real low-stock label and keeps edit/status in Meatballs", () => {
  const html = render("card", "5");
  assert.match(html, /สต็อกต่ำ/);
  assert.match(html, /ตัวเลือกสำหรับ Laser-cut bracket/);
  assert.doesNotMatch(html, />แก้ไข</);
});

test("list view remains dense and uses the shared Meatballs action", () => {
  const html = render("list", "0");
  assert.match(html, /รายการวัสดุแบบแถว/);
  assert.match(html, /หมดสต็อก/);
  assert.match(html, /ตัวเลือกสำหรับ Laser-cut bracket/);
});

test("stock presentation is omitted when the user lacks stock permission", () => {
  const html = renderToStaticMarkup(
    <MaterialPcCollection materials={[material]} view="card" canEdit={false} canDelete={false} stockByMaterialId={null} {...handlers} />
  );
  assert.doesNotMatch(html, /คงเหลือ/);
  assert.doesNotMatch(html, /สต็อกต่ำ|สต็อกปกติ|หมดสต็อก/);
});

test("row actions preserve view/receive/edit/status permission ordering", () => {
  const actions = getMaterialRowActions(material, true, true, handlers);
  assert.deepEqual(actions.map((action) => action.label), [
    "ดูรายละเอียด",
    "รับเข้า",
    "รายการรับเข้า",
    "รายการจ่ายออก",
    "BOM / Products",
    "แก้ไข",
    "ปิดใช้งาน",
  ]);
  assert.equal(actions.at(-1)?.variant, "danger");
  assert.deepEqual(
    getMaterialRowActions(material, false, false, {
      onEdit: handlers.onEdit,
      onToggleStatus: handlers.onToggleStatus,
    }).map((action) => action.label),
    []
  );
});
