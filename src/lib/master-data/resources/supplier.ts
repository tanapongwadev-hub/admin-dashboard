import { listSuppliers, type Supplier, type SupplierPayload, type UpdateSupplierPayload, type ListSuppliersParams } from "@/lib/api/suppliers";
import {
  createSupplierAction,
  updateSupplierAction,
  deactivateSupplierAction,
  restoreSupplierAction,
} from "@/app/(dashboard)/master-data/suppliers/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/suppliers` — Shape D, the widest simple
// master (9 fields: code, nameTh, nameEn, taxId, contactName, telephone,
// email, address, isActive) — see AGENTS.md § Master-data generic CRUD
// page and § Suppliers. Uses `dialogSize: "xl"` and a 255-char name limit
// (every other simple master caps names at 100).

export const supplierResource: MasterDataResourceConfig<Supplier> = {
  key: "supplier",
  resultKey: "supplier",
  entityLabel: "ผู้จัดจำหน่าย",
  nameMaxLength: 255,
  dialogSize: "xl",
  codePlaceholder: "SUP-A",
  nameThPlaceholder: "บริษัท ผู้จัดจำหน่าย ตัวอย่าง จำกัด",
  nameEnPlaceholder: "Example Supplier Co., Ltd.",
  // Suppliers has no `description` field on the backend at all (see
  // `SupplierPayload`) — its free-text field is `address` instead.
  hasDescription: false,
  fields: [
    { name: "taxId", label: "เลขประจำตัวผู้เสียภาษี (Tax ID)", type: "text", maxLength: 20, placeholder: "0105548012345" },
    { name: "contactName", label: "ชื่อผู้ติดต่อ", type: "text", maxLength: 255, placeholder: "สมชาย จัดการดี", showInTable: true, tableWidth: "16%" },
    { name: "telephone", label: "เบอร์โทรศัพท์", type: "text", maxLength: 50, placeholder: "02-123-4567" },
    { name: "email", label: "อีเมล", type: "email", maxLength: 255, placeholder: "contact@supplier.example", showInTable: true, tableWidth: "22%" },
    { name: "address", label: "ที่อยู่", type: "textarea", fullWidth: true, placeholder: "123 ถนนตัวอย่าง แขวงสวนจาง เขตบางกะปิ กรุงเทพฯ 10240" },
  ],
  actions: {
    create: (payload) => createSupplierAction(payload as unknown as SupplierPayload),
    update: (id, payload) => updateSupplierAction(id, payload as unknown as UpdateSupplierPayload),
    deactivate: (id) => deactivateSupplierAction(id),
    restore: (id) => restoreSupplierAction(id),
  },
  pageTitle: "ผู้จัดจำหน่าย",
  pageDescription: "จัดการข้อมูลหลักผู้จัดจำหน่ายที่ใช้ในระบบ",
  permissionPrefix: "SUPPLIER",
  permissionLabelEnglish: "Supplier View",
  sortBy: "code",
  list: (accessToken, params) => listSuppliers(accessToken, params as unknown as ListSuppliersParams),
};
