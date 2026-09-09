import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MaterialPcCollection, getMaterialRowActions, getStockHealthLabel, getStockTone } from "./material-pc-table";
import type { Material, StockBalance } from "@/lib/api/materials";

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

test("card grid scales from one through five columns", () => {
  const html = render("card");
  assert.match(html, /grid-cols-1/);
  assert.match(html, /@min-\[36rem\]:grid-cols-2/);
  assert.match(html, /@min-\[60rem\]:grid-cols-3/);
  assert.match(html, /@min-\[82rem\]:grid-cols-4/);
  assert.match(html, /@min-\[100rem\]:grid-cols-5/);
});

test("card uses the real low-stock label and keeps edit/status in Meatballs", () => {
  const html = render("card", "5");
  assert.match(html, /สต็อกต่ำ/);
  assert.match(html, /ตัวเลือกสำหรับ Laser-cut bracket/);
  assert.doesNotMatch(html, />แก้ไข</);
});

test("list view remains dense and uses the shared Meatballs action", () => {
  const html = render("list", "0");
  assert.match(html, /รายการวัสดุ PC แบบแถว/);
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
  assert.deepEqual(actions.map((action) => action.label), ["ดูรายละเอียด", "รับเข้า", "แก้ไข", "ปิดใช้งาน"]);
  assert.equal(actions.at(-1)?.variant, "danger");
  assert.deepEqual(
    getMaterialRowActions(material, false, false, {
      onEdit: handlers.onEdit,
      onToggleStatus: handlers.onToggleStatus,
    }).map((action) => action.label),
    []
  );
});
