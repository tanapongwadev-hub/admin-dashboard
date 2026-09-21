import type { Customer, CustomerPayload, UpdateCustomerPayload } from "@/lib/api/customers";
import {
  createCustomerAction,
  updateCustomerAction,
  deactivateCustomerAction,
  restoreCustomerAction,
} from "@/app/(dashboard)/master-data/customers/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/customers` — Shape D, byte-for-byte the
// Suppliers recipe (9 fields: code, nameTh, nameEn, taxId, contactName,
// telephone, email, address, isActive; no `description`) — see AGENTS.md
// § Master-data generic CRUD page and § Customers. Uses `dialogSize:
// "xl"` and a 255-char name limit (every other simple master caps names
// at 100).

export const customerResource: MasterDataResourceConfig<Customer> = {
  key: "customer",
  resultKey: "customer",
  entityLabel: "ลูกค้า",
  nameMaxLength: 255,
  dialogSize: "xl",
  codePlaceholder: "CUS-A",
  nameThPlaceholder: "บริษัท ลูกค้า ตัวอย่าง จำกัด",
  nameEnPlaceholder: "Example Customer Co., Ltd.",
  // Customers has no `description` field on the backend at all (see
  // `CustomerPayload`) — its free-text field is `address` instead.
  hasDescription: false,
  fields: [
    { name: "taxId", label: "เลขประจำตัวผู้เสียภาษี (Tax ID)", type: "text", maxLength: 20, placeholder: "0105548012345" },
    { name: "contactName", label: "ชื่อผู้ติดต่อ", type: "text", maxLength: 255, placeholder: "สมหญิง จัดการดี", showInTable: true, tableWidth: "16%" },
    { name: "telephone", label: "เบอร์โทรศัพท์", type: "text", maxLength: 50, placeholder: "02-123-4567" },
    { name: "email", label: "อีเมล", type: "email", maxLength: 255, placeholder: "contact@customer.example", showInTable: true, tableWidth: "22%" },
    { name: "address", label: "ที่อยู่", type: "textarea", fullWidth: true, placeholder: "123 ถนนตัวอย่าง แขวงสวนจาง เขตบางกะปิ กรุงเทพฯ 10240" },
  ],
  actions: {
    create: (payload) => createCustomerAction(payload as unknown as CustomerPayload),
    update: (id, payload) => updateCustomerAction(id, payload as unknown as UpdateCustomerPayload),
    deactivate: (id) => deactivateCustomerAction(id),
    restore: (id) => restoreCustomerAction(id),
  },
  pageTitle: "ลูกค้า",
  pageDescription: "จัดการข้อมูลหลักลูกค้าที่ใช้อ้างอิงในสินค้า",
  permissionPrefix: "CUSTOMER",
  permissionLabelEnglish: "Customer View",
  sortBy: "code",
};