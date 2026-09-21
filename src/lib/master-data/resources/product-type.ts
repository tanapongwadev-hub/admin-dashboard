import type { ProductType, ProductTypePayload, UpdateProductTypePayload } from "@/lib/api/product-types";
import {
  createProductTypeAction,
  updateProductTypeAction,
  deactivateProductTypeAction,
  restoreProductTypeAction,
} from "@/app/(dashboard)/master-data/product-types/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/product-types` — Shape A (4 fields: code,
// nameTh, nameEn, description) plus `sortOrder` (the only difference from
// a plain Shape A resource, mirrors Categories' "ลำดับ" column). One of
// the two simple-master resources whose default sort is `sortOrder` rather
// than `code` (the other is Categories), see AGENTS.md § Master-data
// generic CRUD page and § Product Types.

export const productTypeResource: MasterDataResourceConfig<ProductType> = {
  key: "product-type",
  resultKey: "productType",
  entityLabel: "ประเภทสินค้า",
  dialogSize: "lg",
  codePlaceholder: "FG",
  nameThPlaceholder: "สินค้าสำเร็จรูป",
  nameEnPlaceholder: "Finished Goods",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับประเภทสินค้านี้",
  fields: [
    {
      name: "sortOrder",
      label: "ลำดับ",
      type: "number",
      min: 0,
      max: 9999,
      defaultNumber: 0,
      showInTable: true,
      tableWidth: "10%",
    },
  ],
  actions: {
    create: (payload) => createProductTypeAction(payload as unknown as ProductTypePayload),
    update: (id, payload) => updateProductTypeAction(id, payload as unknown as UpdateProductTypePayload),
    deactivate: (id) => deactivateProductTypeAction(id),
    restore: (id) => restoreProductTypeAction(id),
  },
  pageTitle: "ประเภทสินค้า",
  pageDescription: "จัดการข้อมูลหลักประเภทสินค้า (FG / SFG / RM) ที่ใช้จำแนกสินค้าในระบบ",
  permissionPrefix: "PRODUCT_TYPE",
  permissionLabelEnglish: "Product Type View",
  sortBy: "sortOrder",
};