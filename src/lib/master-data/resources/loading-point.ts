import { listLoadingPoints, type LoadingPoint, type LoadingPointPayload, type UpdateLoadingPointPayload, type ListLoadingPointsParams } from "@/lib/api/loading-points";
import {
  createLoadingPointAction,
  updateLoadingPointAction,
  deactivateLoadingPointAction,
  restoreLoadingPointAction,
} from "@/app/(dashboard)/master-data/loading-points/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/loading-points` — Shape A (4 fields: code,
// nameTh, nameEn, description; no resource-specific extra fields), see
// AGENTS.md § Master-data generic CRUD page and § Loading Points.

export const loadingPointResource: MasterDataResourceConfig<LoadingPoint> = {
  key: "loading-point",
  resultKey: "loadingPoint",
  entityLabel: "จุดขนถ่าย",
  dialogSize: "lg",
  codePlaceholder: "LP-A1",
  nameThPlaceholder: "จุดขนถ่าย A1",
  nameEnPlaceholder: "Loading Point A1",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับจุดขนถ่ายนี้",
  fields: [],
  actions: {
    create: (payload) => createLoadingPointAction(payload as unknown as LoadingPointPayload),
    update: (id, payload) => updateLoadingPointAction(id, payload as unknown as UpdateLoadingPointPayload),
    deactivate: (id) => deactivateLoadingPointAction(id),
    restore: (id) => restoreLoadingPointAction(id),
  },
  pageTitle: "จุดขนถ่าย",
  pageDescription: "จัดการข้อมูลหลักจุดขนถ่ายสินค้าที่ใช้ในระบบ",
  permissionPrefix: "LOADING_POINT",
  permissionLabelEnglish: "Loading Point View",
  sortBy: "code",
  list: (accessToken, params) => listLoadingPoints(accessToken, params as unknown as ListLoadingPointsParams),
};
