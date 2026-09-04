import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductsTable, getProductRowActions } from "./products-table";
import type { Product } from "@/lib/api/products";

const product: Product = {
  id: "product-1",
  code: "PRD-001",
  name: "Rear Seat Frame",
  unitId: "unit-1",
  modelId: "model-1",
  customerId: "customer-1",
  packing: 1,
  locationId: "location-1",
  safetyStock: 100,
  productTypeId: "type-1",
  lotSize: 100,
  minStock: 100,
  deliveryTypeId: "delivery-1",
  scale: null,
  loadingPointId: "loading-1",
  processLineId: "line-1",
  productImagePath: null,
  isActive: true,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  unit: { id: "unit-1", code: "PCS", nameTh: "ชิ้น" },
  model: { id: "model-1", code: "HC24", nameTh: "Honda Civic 2024" },
  customer: { id: "customer-1", code: "CUST-1", nameTh: "บริษัท ฮอนด้า ออโตโมบิล จำกัด" },
  location: { id: "location-1", code: "A1", nameTh: "คลัง A1" },
  productType: { id: "type-1", code: "FG", nameTh: "สินค้าสำเร็จรูป" },
  deliveryType: { id: "delivery-1", code: "D1", nameTh: "จัดส่ง 1" },
  loadingPoint: { id: "loading-1", code: "L1", nameTh: "จุดขึ้นสินค้า 1" },
  processLine: { id: "line-1", code: "PL1", nameTh: "สายการผลิต 1" },
};

test("table view renders one row-actions trigger per product, labelled with the product name", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="table"
      canEdit
      canDelete
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.match(html, /<table/);
  assert.equal(html.match(/PRD-001/g)?.length, 1);
  assert.equal(html.match(/aria-label="ตัวเลือกสำหรับ Rear Seat Frame"/g)?.length, 1);
});

test("table view hides the row-actions trigger entirely when the row has no permitted actions", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="table"
      canEdit={false}
      canDelete={false}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.doesNotMatch(html, /aria-label="ตัวเลือกสำหรับ Rear Seat Frame"/);
});

test("card view renders one card per product with code, name, status, and safety/min stock as the primary numbers", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="card"
      canEdit
      canDelete
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.doesNotMatch(html, /<table/);
  assert.match(html, /<ul[^>]+aria-label="รายการสินค้าแบบการ์ด"/);
  assert.equal(html.match(/PRD-001/g)?.length, 1);
  // "Rear Seat Frame" legitimately appears 3x by design: the <h2> text, its
  // title="" attribute (truncation tooltip), and the image-fallback
  // aria-label — assert the heading itself, not a raw substring count.
  assert.match(html, /<h2[^>]*>Rear Seat Frame<\/h2>/);
  assert.match(html, /bg-success-soft[^>]*><span class="h-1\.5[^>]*><\/span>ใช้งาน<\/span>/);
  assert.match(html, /Safety Stock/);
  assert.match(html, /Min Stock/);
});

test("card view shows edit and disable as visible buttons (not a hidden Meatballs menu) when both permissions are granted", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="card"
      canEdit
      canDelete
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.match(html, />\s*แก้ไข\s*</);
  assert.match(html, />\s*ปิดใช้งาน\s*</);
});

test("card view omits the action row entirely when the row has no permitted actions", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="card"
      canEdit={false}
      canDelete={false}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.doesNotMatch(html, /แก้ไข/);
  assert.doesNotMatch(html, /ปิดใช้งาน/);
});

test("card view shows an accessible image fallback when a product has no image", () => {
  const html = renderToStaticMarkup(
    <ProductsTable
      products={[product]}
      totalItems={1}
      view="card"
      canEdit={false}
      canDelete={false}
      onEdit={() => undefined}
      onToggleStatus={() => undefined}
    />
  );

  assert.match(html, /aria-label="ไม่มีรูปภาพสำหรับ Rear Seat Frame"/);
});

test("getProductRowActions includes edit and destructive disable when active and both permissions are granted", () => {
  const actions = getProductRowActions(product, true, true, { onEdit: () => undefined, onToggleStatus: () => undefined });

  assert.deepEqual(
    actions.map((a) => [a.label, a.variant]),
    [
      ["แก้ไข", "default"],
      ["ปิดใช้งาน", "danger"],
    ]
  );
});

test("getProductRowActions offers non-destructive enable for an inactive row", () => {
  const actions = getProductRowActions({ ...product, isActive: false }, true, true, {
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

test("getProductRowActions omits edit when canEdit is false", () => {
  const actions = getProductRowActions(product, false, true, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.equal(actions.some((a) => a.label === "แก้ไข"), false);
});

test("getProductRowActions omits disable/enable when canDelete is false", () => {
  const actions = getProductRowActions(product, true, false, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.equal(actions.some((a) => a.label === "ปิดใช้งาน" || a.label === "เปิดใช้งาน"), false);
});

test("getProductRowActions returns an empty array when neither permission is granted", () => {
  const actions = getProductRowActions(product, false, false, { onEdit: () => undefined, onToggleStatus: () => undefined });
  assert.deepEqual(actions, []);
});
