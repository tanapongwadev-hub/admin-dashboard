import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductsWizardDialog, ProductsWizardView } from "./products-wizard-dialog";
import { Dialog } from "@/components/ui/dialog";
import type { Product, ProductLookups } from "@/lib/api/products";
import type { Material } from "@/lib/api/materials";

const materials: Material[] = [];

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

const lookups: ProductLookups = {
  units: [{ id: "unit-1", code: "PCS", nameTh: "ชิ้น" }],
  productModels: [{ id: "model-1", code: "HC24", nameTh: "Honda Civic 2024" }],
  customers: [{ id: "customer-1", code: "CUST-1", nameTh: "บริษัท ฮอนด้า" }],
  locations: [{ id: "location-1", code: "A1", nameTh: "คลัง A1" }],
  productTypes: [{ id: "type-1", code: "FG", nameTh: "สินค้าสำเร็จรูป" }],
  deliveryTypes: [{ id: "delivery-1", code: "D1", nameTh: "จัดส่ง 1" }],
  loadingPoints: [{ id: "loading-1", code: "L1", nameTh: "จุดขึ้นสินค้า 1" }],
  processLines: [{ id: "line-1", code: "PL1", nameTh: "สายการผลิต 1" }],
};

// Interactive step-to-step navigation (react-hook-form's async `trigger()`
// gating each "ถัดไป" click) can't be exercised via renderToStaticMarkup —
// there's no real DOM/event loop here, same limitation documented in
// AGENTS.md § Row actions for Radix Portal content. These tests only cover
// what a single SSR render can prove: the dialog renders nothing when
// closed, and the first step's content/stepper/actions are present when
// open on step 1 (the only step reachable without simulating a click).
test("renders nothing when closed", () => {
  const html = renderToStaticMarkup(
    <ProductsWizardDialog
      open={false}
      onOpenChange={() => undefined}
      lookups={lookups}
      materials={materials}
      canCreateBom
      onSaved={() => undefined}
    />
  );
  assert.equal(html, "");
});

test("opens on step 1 with the basic-info fields, the stepper, and a 'ถัดไป' action (no submit button yet)", () => {
  // ProductsWizardView still uses DialogTitle/DialogDescription/DialogHeader/
  // DialogFooter, which read Radix's Dialog context — that context comes
  // from Dialog.Root, not specifically from the Portal-rendered
  // DialogContent, so wrapping in a bare <Dialog> (no <DialogContent>)
  // satisfies it while staying outside the part renderToStaticMarkup can't
  // capture.
  const html = renderToStaticMarkup(
    <Dialog open>
      <ProductsWizardView
        open
        onOpenChange={() => undefined}
        lookups={lookups}
        materials={materials}
        canCreateBom
        onSaved={() => undefined}
      />
    </Dialog>
  );

  assert.match(html, /เพิ่มสินค้าแบบขั้นตอน/);
  assert.match(html, /ขั้นตอนที่ 1 จาก 5/);
  assert.match(html, /aria-label="ขั้นตอนการเพิ่มสินค้า"/);
  // Step 1 fields (code/name/image), not a later step's fields.
  assert.match(html, /id="wizard-code"/);
  assert.match(html, /id="wizard-name"/);
  assert.match(html, /รูปภาพสินค้า/);
  assert.doesNotMatch(html, /id="wizard-packing"/);
  // Navigation: "ถัดไป" is present, the final "เพิ่มสินค้า" submit button is not
  // (that only appears on the last step).
  assert.match(html, /ถัดไป/);
  assert.doesNotMatch(html, />\s*เพิ่มสินค้า\s*</);
});

test("opens in edit mode with the title switched to editing wording", () => {
  // react-hook-form's `register()` inputs are uncontrolled (ref-based) —
  // `defaultValues` populate them imperatively after mount, not as a
  // server-rendered `value=` attribute, so this only asserts what SSR
  // markup can actually show: the title/description text swaps to editing
  // wording when a `product` is passed.
  const html = renderToStaticMarkup(
    <Dialog open>
      <ProductsWizardView
        open
        onOpenChange={() => undefined}
        product={product}
        lookups={lookups}
        materials={materials}
        canCreateBom
        onSaved={() => undefined}
      />
    </Dialog>
  );

  assert.match(html, /แก้ไขสินค้าแบบขั้นตอน/);
  assert.doesNotMatch(html, /เพิ่มสินค้าแบบขั้นตอน/);
});
