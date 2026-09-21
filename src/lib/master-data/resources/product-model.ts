import type { ProductModel, ProductModelPayload, UpdateProductModelPayload } from "@/lib/api/product-models";
import {
  createProductModelAction,
  updateProductModelAction,
  deactivateProductModelAction,
  restoreProductModelAction,
} from "@/app/(dashboard)/master-data/product-models/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/product-models` — Shape A (code/nameTh/
// nameEn/description) plus one extra optional `brand` text field. See
// AGENTS.md § Master-data generic CRUD page and § Product Models.

export const productModelResource: MasterDataResourceConfig<ProductModel> = {
  key: "product-model",
  resultKey: "productModel",
  entityLabel: "รุ่นสินค้า",
  dialogSize: "lg",
  codePlaceholder: "CAMRY",
  nameThPlaceholder: "โตโยต้า แคมรี่",
  nameEnPlaceholder: "Toyota Camry",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับรุ่นสินค้านี้",
  fields: [
    { name: "brand", label: "ยี่ห้อ", type: "text", maxLength: 100, placeholder: "Toyota", showInTable: true, tableWidth: "14%" },
  ],
  actions: {
    create: (payload) => createProductModelAction(payload as unknown as ProductModelPayload),
    update: (id, payload) => updateProductModelAction(id, payload as unknown as UpdateProductModelPayload),
    deactivate: (id) => deactivateProductModelAction(id),
    restore: (id) => restoreProductModelAction(id),
  },
  pageTitle: "รุ่นสินค้า",
  pageDescription: "จัดการข้อมูลหลักรุ่นสินค้าที่ใช้อ้างอิงในสินค้า",
  permissionPrefix: "PRODUCT_MODEL",
  permissionLabelEnglish: "Product Model View",
  sortBy: "code",
};