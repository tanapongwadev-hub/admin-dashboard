import { listUnits, type Unit, type UnitPayload, type UpdateUnitPayload, type ListUnitsParams } from "@/lib/api/units";
import {
  createUnitAction,
  updateUnitAction,
  deactivateUnitAction,
  restoreUnitAction,
} from "@/app/(dashboard)/master-data/units/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/units` — Shape B+ (code, nameTh, nameEn,
// description plus a required `symbol`, e.g. "ชิ้น", "กิโลกรัม"), see
// AGENTS.md § Master-data generic CRUD page and § Units.

export const unitResource: MasterDataResourceConfig<Unit> = {
  key: "unit",
  resultKey: "unit",
  entityLabel: "หน่วยนับ",
  dialogSize: "lg",
  codePlaceholder: "UNIT-A",
  nameThPlaceholder: "หน่วยนับตัวอย่าง",
  nameEnPlaceholder: "Example Unit",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับหน่วยนับนี้",
  fields: [
    {
      name: "symbol",
      label: "สัญลักษณ์",
      type: "text",
      required: true,
      maxLength: 20,
      placeholder: "EG",
      hint: "เช่น ชิ้น, กิโลกรัม, ลิตร",
      showInTable: true,
      tableWidth: "16%",
    },
  ],
  actions: {
    create: (payload) => createUnitAction(payload as unknown as UnitPayload),
    update: (id, payload) => updateUnitAction(id, payload as unknown as UpdateUnitPayload),
    deactivate: (id) => deactivateUnitAction(id),
    restore: (id) => restoreUnitAction(id),
  },
  pageTitle: "หน่วยนับ",
  pageDescription: "จัดการข้อมูลหลักหน่วยนับที่ใช้ในระบบ",
  permissionPrefix: "UNIT",
  permissionLabelEnglish: "Unit View",
  sortBy: "code",
  list: (accessToken, params) => listUnits(accessToken, params as unknown as ListUnitsParams),
};
