import { listDeliveryTypes, type DeliveryType, type DeliveryTypePayload, type UpdateDeliveryTypePayload, type ListDeliveryTypesParams } from "@/lib/api/delivery-types";
import {
  createDeliveryTypeAction,
  updateDeliveryTypeAction,
  deactivateDeliveryTypeAction,
  restoreDeliveryTypeAction,
} from "@/app/(dashboard)/master-data/delivery-types/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/delivery-types` — Shape A (4 fields: code,
// nameTh, nameEn, description; no resource-specific extra fields), see
// AGENTS.md § Master-data generic CRUD page and § Delivery Types.

export const deliveryTypeResource: MasterDataResourceConfig<DeliveryType> = {
  key: "delivery-type",
  resultKey: "deliveryType",
  entityLabel: "ประเภทการจัดส่ง",
  dialogSize: "lg",
  codePlaceholder: "DT-A",
  nameThPlaceholder: "ประเภทการจัดส่งตัวอย่าง",
  nameEnPlaceholder: "Example Delivery Type",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับประเภทการจัดส่งนี้",
  fields: [],
  actions: {
    create: (payload) => createDeliveryTypeAction(payload as unknown as DeliveryTypePayload),
    update: (id, payload) => updateDeliveryTypeAction(id, payload as unknown as UpdateDeliveryTypePayload),
    deactivate: (id) => deactivateDeliveryTypeAction(id),
    restore: (id) => restoreDeliveryTypeAction(id),
  },
  pageTitle: "ประเภทการจัดส่ง",
  pageDescription: "จัดการข้อมูลหลักประเภทการจัดส่งสินค้าที่ใช้ในระบบ",
  permissionPrefix: "DELIVERY_TYPE",
  permissionLabelEnglish: "Delivery Type View",
  sortBy: "code",
  list: (accessToken, params) => listDeliveryTypes(accessToken, params as unknown as ListDeliveryTypesParams),
};
