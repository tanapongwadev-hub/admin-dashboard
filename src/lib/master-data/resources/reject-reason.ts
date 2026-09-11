import { listRejectReasons, type RejectReason, type RejectReasonPayload, type UpdateRejectReasonPayload, type ListRejectReasonsParams } from "@/lib/api/reject-reasons";
import {
  createRejectReasonAction,
  updateRejectReasonAction,
  deactivateRejectReasonAction,
  restoreRejectReasonAction,
} from "@/app/(dashboard)/master-data/reject-reasons/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/reject-reasons` — Shape A (4 fields: code,
// nameTh, nameEn, description; no resource-specific extra fields), see
// AGENTS.md § Master-data generic CRUD page and § Reject Reasons.

export const rejectReasonResource: MasterDataResourceConfig<RejectReason> = {
  key: "reject-reason",
  resultKey: "rejectReason",
  entityLabel: "เหตุผลการปฏิเสธ",
  dialogSize: "lg",
  codePlaceholder: "RR-A",
  nameThPlaceholder: "เหตุผลการปฏิเสธตัวอย่าง",
  nameEnPlaceholder: "Example Reject Reason",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับเหตุผลการปฏิเสธนี้",
  fields: [],
  actions: {
    create: (payload) => createRejectReasonAction(payload as unknown as RejectReasonPayload),
    update: (id, payload) => updateRejectReasonAction(id, payload as unknown as UpdateRejectReasonPayload),
    deactivate: (id) => deactivateRejectReasonAction(id),
    restore: (id) => restoreRejectReasonAction(id),
  },
  pageTitle: "เหตุผลการปฏิเสธ",
  pageDescription: "จัดการข้อมูลหลักเหตุผลการปฏิเสธที่ใช้ในระบบ",
  permissionPrefix: "REJECT_REASON",
  permissionLabelEnglish: "Reject Reason View",
  sortBy: "code",
  list: (accessToken, params) => listRejectReasons(accessToken, params as unknown as ListRejectReasonsParams),
};
