import type { ProcessStep, ProcessStepPayload, UpdateProcessStepPayload } from "@/lib/api/process-steps";
import {
  createProcessStepAction,
  updateProcessStepAction,
  deactivateProcessStepAction,
  restoreProcessStepAction,
} from "@/app/(dashboard)/master-data/process-steps/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/process-steps` — Shape A (code/nameTh/nameEn/
// description). See AGENTS.md § Master-data generic CRUD page.

export const processStepResource: MasterDataResourceConfig<ProcessStep> = {
  key: "process-step",
  resultKey: "processStep",
  entityLabel: "กระบวนการผลิต",
  dialogSize: "lg",
  codePlaceholder: "PS-01",
  nameThPlaceholder: "เชื่อมชิ้นงาน",
  nameEnPlaceholder: "Welding",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับขั้นตอนการผลิตนี้",
  fields: [],
  actions: {
    create: (payload) => createProcessStepAction(payload as unknown as ProcessStepPayload),
    update: (id, payload) => updateProcessStepAction(id, payload as unknown as UpdateProcessStepPayload),
    deactivate: (id) => deactivateProcessStepAction(id),
    restore: (id) => restoreProcessStepAction(id),
  },
  pageTitle: "กระบวนการผลิต",
  pageDescription: "จัดการข้อมูลหลักขั้นตอนกระบวนการผลิต ที่ใช้กำหนดลำดับ workflow ของสินค้า",
  permissionPrefix: "PROCESS_STEP",
  permissionLabelEnglish: "Process Step View",
  sortBy: "code",
};
