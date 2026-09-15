import { listMaterialTypes, type MaterialType, type MaterialTypePayload, type UpdateMaterialTypePayload, type ListMaterialTypesParams } from "@/lib/api/material-types";
import {
  createMaterialTypeAction,
  updateMaterialTypeAction,
  deactivateMaterialTypeAction,
  restoreMaterialTypeAction,
} from "@/app/(dashboard)/master-data/material-types/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/material-types` — Shape A (4 fields: code,
// nameTh, nameEn, description; no resource-specific extra fields), see
// AGENTS.md § Master-data generic CRUD page and § Material Types.

export const materialTypeResource: MasterDataResourceConfig<MaterialType> = {
  key: "material-type",
  resultKey: "materialType",
  entityLabel: "ประเภทวัสดุ",
  dialogSize: "lg",
  codePlaceholder: "PC",
  nameThPlaceholder: "ประเภทวัสดุตัวอย่าง",
  nameEnPlaceholder: "Example Material Type",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับประเภทวัสดุนี้",
  fields: [],
  actions: {
    create: (payload) => createMaterialTypeAction(payload as unknown as MaterialTypePayload),
    update: (id, payload) => updateMaterialTypeAction(id, payload as unknown as UpdateMaterialTypePayload),
    deactivate: (id) => deactivateMaterialTypeAction(id),
    restore: (id) => restoreMaterialTypeAction(id),
  },
  pageTitle: "ประเภทวัสดุ",
  pageDescription: "จัดการข้อมูลหลักประเภทวัสดุ (PC / OF / OF-MAT) ที่ใช้จำแนกวัสดุในระบบ",
  permissionPrefix: "MATERIAL_TYPE",
  permissionLabelEnglish: "Material Type View",
  sortBy: "code",
  list: (accessToken, params) => listMaterialTypes(accessToken, params as unknown as ListMaterialTypesParams),
};
