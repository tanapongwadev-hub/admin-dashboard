import { listMaterialModels, type MaterialModel, type MaterialModelPayload, type UpdateMaterialModelPayload, type ListMaterialModelsParams } from "@/lib/api/material-models";
import {
  createMaterialModelAction,
  updateMaterialModelAction,
  deactivateMaterialModelAction,
  restoreMaterialModelAction,
} from "@/app/(dashboard)/master-data/material-models/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/material-models` — Shape A (4 fields: code,
// nameTh, nameEn, description; no resource-specific extra fields), see
// AGENTS.md § Master-data generic CRUD page and § Material Models.

export const materialModelResource: MasterDataResourceConfig<MaterialModel> = {
  key: "material-model",
  resultKey: "materialModel",
  entityLabel: "รุ่นวัสดุ",
  dialogSize: "lg",
  codePlaceholder: "MM-A",
  nameThPlaceholder: "รุ่นวัสดุตัวอย่าง",
  nameEnPlaceholder: "Example Material Model",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับรุ่นวัสดุนี้",
  fields: [],
  actions: {
    create: (payload) => createMaterialModelAction(payload as unknown as MaterialModelPayload),
    update: (id, payload) => updateMaterialModelAction(id, payload as unknown as UpdateMaterialModelPayload),
    deactivate: (id) => deactivateMaterialModelAction(id),
    restore: (id) => restoreMaterialModelAction(id),
  },
  pageTitle: "รุ่นวัสดุ",
  pageDescription: "จัดการข้อมูลหลักรุ่นวัสดุที่ใช้ในระบบ",
  permissionPrefix: "MATERIAL_MODEL",
  permissionLabelEnglish: "Material Model View",
  sortBy: "code",
  list: (accessToken, params) => listMaterialModels(accessToken, params as unknown as ListMaterialModelsParams),
};
