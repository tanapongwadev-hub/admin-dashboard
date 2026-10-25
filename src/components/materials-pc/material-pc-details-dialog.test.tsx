import test from "node:test";
import assert from "node:assert/strict";
import type * as React from "react";
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
  materialTypeId: null,
  modelId: "model-1",
  loadingPointId: "lp-1",
  processLineName: "Press line 1",
  scale: "1:4",
  packingQuantity: 20,
  minimumStock: "10.0000",
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
  materialTypeMaster: null,
  loadingPoint: { id: "lp-1", code: "LP-BPI", nameEn: "Bang Pa-In" },
  suppliers: [
    { id: "supplier-1", code: "SUP-001", nameEn: "CPS Steel" },
    { id: "supplier-2", code: "SUP-002", nameEn: "ABC Corp" },
  ],
};

function render(props: Partial<React.ComponentProps<typeof MaterialPcDetailsView>> = {}) {
  return renderToStaticMarkup(
    <MaterialPcDetailsView material={material} stockByMaterialId={null} onClose={() => undefined} {...props} />
  );
}

test("renders the identity block with code, name, status and shape badges", () => {
  const html = render();

  assert.match(html, /MAT-PC-001/);
  assert.match(html, /อะคริลิคแผ่นใส 5mm/);
  assert.match(html, /ใช้งาน/);
  assert.match(html, />SHEET</);
  assert.match(html, /รายละเอียด Materials/);
});

test("raw shapes (PIPE/SHEET/COIL) show the source and processed-output panels", () => {
  const html = render();

  assert.match(html, /Material 1 · วัตถุดิบก่อนแปรรูป/);
  assert.match(html, /Material 2 · ชิ้นงานหลังแปรรูป/);
  assert.match(html, /ก่อนแปรรูป/);
});

test("a finished-piece (PCS) material shows a single panel", () => {
  const html = render({ material: { ...material, materialType: "PCS" } });

  assert.match(html, /ข้อมูล Material/);
  assert.doesNotMatch(html, /Material 2 · ชิ้นงานหลังแปรรูป/);
  assert.match(html, /จำนวนต่อแพ็ก/);
});

test("renders an accessible fallback when there is no image", () => {
  const html = render();

  assert.match(html, /ยังไม่มีรูปภาพ/);
  assert.doesNotMatch(html, /ดูรูปภาพ .* ขนาดเต็ม/);
});

test("renders a clickable full-size image button when imagePath is set", () => {
  const html = render({ material: { ...material, imagePath: "/uploads/materials/x.png" } });

  assert.match(html, /aria-label="ดูรูปภาพ อะคริลิคแผ่นใส 5mm ขนาดเต็ม"/);
  assert.match(html, /ดูรูปเต็ม/);
});

test("shows stock quantity and a health badge when stock data is available", () => {
  const html = render({
    stockByMaterialId: { "material-1": { materialId: "material-1", quantity: "50.0000" } as never },
  });

  assert.match(html, /สต็อกวัตถุดิบก่อนแปรรูป/);
  assert.match(html, /tabular-nums text-fg">50/);
  assert.match(html, /สต็อกปกติ/);
  assert.doesNotMatch(html, /ไม่มีสิทธิ์ดูสต็อก/);
});

test("marks zero stock and low stock with the matching health badge", () => {
  const zero = render({ stockByMaterialId: { "material-1": { materialId: "material-1", quantity: "0.0000" } as never } });
  const low = render({ stockByMaterialId: { "material-1": { materialId: "material-1", quantity: "5.0000" } as never } });

  assert.match(zero, /หมดสต็อก/);
  assert.match(low, /สต็อกต่ำ/);
});

test("falls back to a permission note when stock data is not available", () => {
  const html = render({ stockByMaterialId: null });

  assert.match(html, /ไม่มีสิทธิ์ดูสต็อก/);
});

test("lists suppliers, specification (with line breaks preserved) and description", () => {
  const html = render();

  assert.match(html, /CPS Steel, ABC Corp/);
  assert.match(html, /ทนความร้อน 80°C\nUV resistant/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, /ใช้สำหรับงานภายนอกอาคาร/);
});

test("puts storage and operational details in a collapsible section", () => {
  const html = render();

  assert.match(html, /<details/);
  assert.match(html, /สต็อกขั้นต่ำ/);
  assert.match(html, /Bracket A/);
  assert.match(html, /Press line 1/);
});

test("shows created and updated timestamps", () => {
  const html = render();

  assert.match(html, /เพิ่มเมื่อ/);
  assert.match(html, /แก้ไขล่าสุด/);
  assert.match(html, /2569|2026/);
});

test("footer shows Close only, and also the edit button when canEdit and onEdit are set", () => {
  const readOnly = render();
  const editable = render({ canEdit: true, onEdit: () => undefined });

  assert.match(readOnly, />ปิด</);
  assert.doesNotMatch(readOnly, />แก้ไขวัสดุ</);
  assert.match(editable, />แก้ไขวัสดุ</);
});
