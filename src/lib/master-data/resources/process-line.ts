import type { ProcessLine, ProcessLinePayload, UpdateProcessLinePayload } from "@/lib/api/process-lines";
import {
  createProcessLineAction,
  updateProcessLineAction,
  deactivateProcessLineAction,
  restoreProcessLineAction,
} from "@/app/(dashboard)/master-data/process-lines/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/process-lines` — Shape A (code/nameTh/
// nameEn/description) standard, no resource-specific extra fields. See
// AGENTS.md § Master-data generic CRUD page and § Process Line (CRUD).

export const processLineResource: MasterDataResourceConfig<ProcessLine> = {
  key: "process-line",
  resultKey: "processLine",
  entityLabel: "สายการผลิต",
  dialogSize: "lg",
  codePlaceholder: "PL-01",
  nameThPlaceholder: "สายประกอบ 1",
  nameEnPlaceholder: "Assembly Line 1",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับสายการผลิตนี้",
  fields: [],
  actions: {
    create: (payload) => createProcessLineAction(payload as unknown as ProcessLinePayload),
    update: (id, payload) => updateProcessLineAction(id, payload as unknown as UpdateProcessLinePayload),
    deactivate: (id) => deactivateProcessLineAction(id),
    restore: (id) => restoreProcessLineAction(id),
  },
  pageTitle: "สายการผลิต",
  pageDescription: "จัดการข้อมูลหลักสายการผลิตที่ใช้อ้างอิงในสินค้า",
  permissionPrefix: "PROCESS_LINE",
  permissionLabelEnglish: "Process Line View",
  sortBy: "code",
};