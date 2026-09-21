import type { Location, LocationPayload, UpdateLocationPayload } from "@/lib/api/locations";
import {
  createLocationAction,
  updateLocationAction,
  deactivateLocationAction,
  restoreLocationAction,
} from "@/app/(dashboard)/master-data/locations/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/locations` — Shape A (code/nameTh/nameEn/
// description) plus two extra optional fields (`zone`, `warehouse`). See
// AGENTS.md § Master-data generic CRUD page and § Location (CRUD).

export const locationResource: MasterDataResourceConfig<Location> = {
  key: "location",
  resultKey: "location",
  entityLabel: "สถานที่",
  dialogSize: "lg",
  codePlaceholder: "LOC-A",
  nameThPlaceholder: "คลังสินค้า A",
  nameEnPlaceholder: "Warehouse A",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับสถานที่นี้",
  fields: [
    { name: "zone", label: "โซน", type: "text", maxLength: 100, placeholder: "Zone-1" },
    { name: "warehouse", label: "คลัง", type: "text", maxLength: 100, placeholder: "WH-A" },
  ],
  actions: {
    create: (payload) => createLocationAction(payload as unknown as LocationPayload),
    update: (id, payload) => updateLocationAction(id, payload as unknown as UpdateLocationPayload),
    deactivate: (id) => deactivateLocationAction(id),
    restore: (id) => restoreLocationAction(id),
  },
  pageTitle: "สถานที่",
  pageDescription: "จัดการข้อมูลหลักสถานที่ (โซน/คลัง) ที่ใช้อ้างอิงในสินค้า",
  permissionPrefix: "LOCATION",
  permissionLabelEnglish: "Location View",
  sortBy: "code",
};