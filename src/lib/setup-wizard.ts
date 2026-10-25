import { validateMaterialCore, type MaterialCoreKey } from "./material-validation";

// Pure types + validation for the "สร้างครบชุด" wizard (no server imports, so
// both the client wizard and the Server Action can share them).

const NEW_MATERIAL_PREFIX = "__new__:";
export const newMaterialRef = (key: number) => `${NEW_MATERIAL_PREFIX}${key}`;
export const isNewMaterialRef = (value: string) => value.startsWith(NEW_MATERIAL_PREFIX);
export const newMaterialKey = (value: string) => Number(value.slice(NEW_MATERIAL_PREFIX.length));

export interface SetupMaterialData {
  key: number;
  /** "existing" = an in-house material that is already in the system: it is only picked (no BOM / Workflow is created for it). */
  source?: "new" | "existing";
  /** The chosen material when source is "existing". */
  existingId?: string;
  code: string;
  name: string;
  locationType: "internal" | "external";
  unitId: string;
  materialTypeId: string;
  supplierIds: string[];
  packingQuantity: string;
  minimumStock: string;
  specification: string;
  imagePath: string | null;
  /** Material BOM / Workflow — required when locationType is "internal" (made in-house). */
  bomRows: SetupBomRow[];
  workflowRows: SetupWorkflowRow[];
}

export interface SetupProductData {
  /** "existing" = attach the BOM / Workflow to a product that is already in the system (nothing is created for the product). */
  source?: "new" | "existing";
  /** The chosen product when source is "existing". */
  existingId?: string;
  code: string;
  name: string;
  unitId: string;
  modelId: string;
  customerId: string;
  locationId: string;
  productTypeId: string;
  deliveryTypeId: string;
  loadingPointId: string;
  processLineId: string;
  packing: string;
  lotSize: string;
  scale: string;
  /** Staged upload path (/uploads/...); sent as the image when the record is created. */
  imagePath: string | null;
}

export interface SetupBomRow {
  key: number;
  /** NEW_MATERIAL_REF = the material created in step 1 */
  materialId: string;
  unitId: string;
  quantity: string;
  wastagePercent: string;
}

export interface SetupWorkflowRow {
  key: number;
  processStepId: string;
  description: string;
}

export interface SetupCreated {
  /** new-material key -> created material id */
  materialIds?: Record<string, string>;
  materialBomIds?: Record<string, string>;
  materialWorkflowIds?: Record<string, string>;
  productId?: string;
  bomId?: string;
  workflowId?: string;
}

export type SetupMode = "product" | "material";

/**
 * Step indices shown, in display order. Both modes have the same 5 steps: step 1 is the owner
 * (the product, or — in material mode — an existing internal material), then the new component
 * materials (0), the BOM (2), the Workflow (3) and the review (4). Indices stay fixed (drafts store them).
 */
export function visibleSteps(_mode?: SetupMode): number[] {
  return [1, 0, 2, 3, 4];
}

/** Step names for the rail / header; step 1 and 0 are named differently in material mode. */
export function stepLabels(mode: SetupMode | undefined): string[] {
  const labels: string[] = SETUP_STEPS.map((s) => s.label);
  if (mode === "material") {
    labels[0] = "วัสดุส่วนประกอบ";
    labels[1] = "วัสดุภายใน";
  }
  return labels;
}

export interface SetupData {
  /** What is being created; undefined until the user picks (shows the chooser). */
  mode?: SetupMode;
  /** Material mode: where the material that gets the BOM + Workflow comes from (default "existing"). */
  ownerSource?: "existing" | "new";
  /** Material mode, ownerSource "existing": the existing internal material that gets the BOM + Workflow. */
  ownerMaterial?: { id: string; code: string; name: string };
  /** Material mode, ownerSource "new": the internal material typed in by the user (created before its BOM + Workflow). */
  ownerNew?: SetupMaterialData;
  materialsEnabled: boolean;
  materials: SetupMaterialData[];
  product: SetupProductData;
  bomEnabled: boolean;
  bomRows: SetupBomRow[];
  workflowEnabled: boolean;
  workflowRows: SetupWorkflowRow[];
  activate: boolean;
  /** New-material keys already offered as BOM rows (so a row the user removed is not re-added). */
  bomSeededKeys?: number[];
  created: SetupCreated;
}

// Deterministic (no Date.now) so server and client render identical ids; hydrate
// resets it above any key already stored in a draft so new rows never collide.
let seed = 0;
export function resetRowKeys(start: number): void {
  seed = start;
}
export function nextRowKey(): number {
  seed += 1;
  return seed;
}

export function emptyMaterial(): SetupMaterialData {
  return {
    key: nextRowKey(),
    code: "",
    name: "",
    locationType: "external",
    unitId: "",
    materialTypeId: "",
    supplierIds: [],
    packingQuantity: "",
    minimumStock: "",
    specification: "",
    imagePath: null,
    bomRows: [],
    workflowRows: [],
  };
}

export const isExistingMaterial = (m: SetupMaterialData) => m.source === "existing";

/** A blank new internal material to be used as the owner in material mode. */
export function emptyOwnerMaterial(): SetupMaterialData {
  return { ...emptyMaterial(), locationType: "internal" };
}

/** The material that receives the BOM + Workflow in material mode (existing pick or typed-in new one). */
export function ownerInfo(data: SetupData): { code: string; name: string; isNew: boolean } | null {
  if (data.ownerSource === "new") {
    return data.ownerNew && data.ownerNew.code.trim()
      ? { code: data.ownerNew.code.trim(), name: data.ownerNew.name.trim(), isNew: true }
      : null;
  }
  return data.ownerMaterial ? { code: data.ownerMaterial.code, name: data.ownerMaterial.name, isNew: false } : null;
}

export function emptySetupData(): SetupData {
  return {
    materialsEnabled: false,
    materials: [emptyMaterial()],
    product: {
      code: "",
      name: "",
      unitId: "",
      modelId: "",
      customerId: "",
      locationId: "",
      productTypeId: "",
      deliveryTypeId: "",
      loadingPointId: "",
      processLineId: "",
      packing: "",
      lotSize: "",
      scale: "",
      imagePath: null,
    },
    bomEnabled: true,
    bomRows: [{ key: nextRowKey(), materialId: "", unitId: "", quantity: "", wastagePercent: "" }],
    workflowEnabled: true,
    workflowRows: [{ key: nextRowKey(), processStepId: "", description: "" }],
    activate: false,
    created: {},
  };
}

export const SETUP_STEPS = [
  { id: "material", label: "วัสดุ" },
  { id: "product", label: "สินค้า" },
  { id: "bom", label: "BOM" },
  { id: "workflow", label: "Workflow" },
  { id: "review", label: "ตรวจสอบและสร้าง" },
] as const;

/** Returns a Thai error message, or null when the step is complete enough to move on. */
export interface SetupMaterialCan {
  materialBom: boolean;
  materialWorkflow: boolean;
}

/** BOM + Workflow rows an internal (in-house) material must have; null when OK. */
export function validateInternalMaterial(m: SetupMaterialData, data: SetupData, can?: SetupMaterialCan): string | null {
  if (m.locationType !== "internal" || isExistingMaterial(m)) return null;
  const bomDone = !!data.created.materialBomIds?.[m.key];
  const wfDone = !!data.created.materialWorkflowIds?.[m.key];
  if (can && (!can.materialBom || !can.materialWorkflow) && (!bomDone || !wfDone)) {
    return "วัสดุภายในต้องมี BOM และ Workflow แต่บัญชีของคุณไม่มีสิทธิ์สร้าง (MATERIAL_BOMS_CREATE / MATERIAL_WORKFLOWS_CREATE) — เปลี่ยนเป็นภายนอก หรือขอสิทธิ์เพิ่ม";
  }
  if (!bomDone) {
    if (m.bomRows.length === 0) return "วัสดุภายในต้องมี BOM อย่างน้อย 1 รายการ";
    if (m.bomRows.some((r) => !r.materialId || !r.unitId || !(Number(r.quantity) > 0))) {
      return "ทุกรายการ BOM ของวัสดุภายในต้องเลือกวัตถุดิบ หน่วย และจำนวนที่มากกว่า 0";
    }
    const ids = m.bomRows.map((r) => r.materialId);
    if (new Set(ids).size !== ids.length) return "ห้ามเลือกวัตถุดิบซ้ำใน BOM ของวัสดุภายใน";
    if (ids.includes(newMaterialRef(m.key)) || (m.existingId && ids.includes(m.existingId))) return "BOM ของวัสดุห้ามอ้างถึงวัสดุตัวเอง";
    const known = new Set(data.materials.map((x) => x.key));
    if (ids.some((id) => isNewMaterialRef(id) && !known.has(newMaterialKey(id)))) return "BOM ของวัสดุภายในอ้างถึงวัสดุใหม่ที่ไม่มีแล้ว";
  }
  if (!wfDone) {
    if (m.workflowRows.length === 0) return "วัสดุภายในต้องมี Workflow อย่างน้อย 1 ขั้นตอน";
    if (m.workflowRows.some((r) => !r.processStepId)) return "ทุกขั้นตอน Workflow ของวัสดุภายในต้องเลือกกระบวนการผลิต";
    const steps = m.workflowRows.map((r) => r.processStepId);
    if (new Set(steps).size !== steps.length) return "ห้ามเลือกขั้นตอนซ้ำใน Workflow ของวัสดุภายใน";
  }
  return null;
}

export type MaterialFieldKey = MaterialCoreKey;

/** Per-field errors of a new material — the shared rules in lib/material-validation.ts (same as the "เพิ่มวัสดุ" form). */
export function materialFieldErrors(m: SetupMaterialData): Partial<Record<MaterialFieldKey, string>> {
  return validateMaterialCore({
    code: m.code,
    name: m.name,
    materialTypeId: m.materialTypeId,
    unitId: m.unitId,
    packingQuantity: m.packingQuantity,
    minimumStock: m.minimumStock,
    supplierCount: m.supplierIds.length,
    hasImage: !!m.imagePath,
  });
}

export function validateSetupStep(step: number, data: SetupData, can?: SetupMaterialCan): string | null {
  if (step === 0) {
    if (!data.materialsEnabled) return null;
    for (const [i, m] of data.materials.entries()) {
      if (isExistingMaterial(m) && !m.existingId) return `วัสดุที่ ${i + 1}: กรุณาเลือกวัสดุภายในที่มีอยู่`;
      const internal = validateInternalMaterial(m, data, can);
      if (internal) return `วัสดุ${isExistingMaterial(m) ? "" : "ใหม่"}ที่ ${i + 1}: ${internal}`;
    }
    const existingIds = data.materials.filter((m) => isExistingMaterial(m) && m.existingId).map((m) => m.existingId);
    if (new Set(existingIds).size !== existingIds.length) return "เลือกวัสดุภายในที่มีอยู่ซ้ำกัน";
    const pending = data.materials.filter((m) => !isExistingMaterial(m) && !data.created.materialIds?.[m.key]);
    for (const [i, m] of pending.entries()) {
      const label = `วัสดุใหม่ที่ ${i + 1}`;
      const first = Object.values(materialFieldErrors(m))[0];
      if (first) return `${label}: ${first}`;
    }
    const codes = pending.map((m) => m.code.trim().toLowerCase());
    if (new Set(codes).size !== codes.length) return "รหัสวัสดุใหม่ซ้ำกัน";
    return null;
  }
  if (step === 1) {
    if (data.mode === "material") {
      if (data.ownerSource === "new") {
        const m = data.ownerNew;
        if (!m) return "กรุณากรอกข้อมูลวัสดุภายใน";
        if (data.created.materialIds?.[m.key]) return null;
        const first = Object.values(materialFieldErrors(m))[0];
        if (first) return `วัสดุภายในใหม่: ${first}`;
        const code = m.code.trim().toLowerCase();
        if (data.materialsEnabled && data.materials.some((x) => !isExistingMaterial(x) && x.code.trim().toLowerCase() === code)) {
          return "รหัสวัสดุภายในซ้ำกับวัสดุส่วนประกอบ";
        }
        return null;
      }
      return data.ownerMaterial ? null : "กรุณาเลือกวัสดุภายใน";
    }
    const p = data.product;
    if (data.created.productId) return null;
    if (p.source === "existing") return p.existingId ? null : "กรุณาเลือกสินค้าที่มีอยู่";
    if (!p.code.trim() || !p.name.trim()) return "กรุณากรอกรหัสและชื่อสินค้า";
    const required: Array<[string, string]> = [
      [p.unitId, "หน่วย"],
      [p.productTypeId, "ประเภทสินค้า"],
      [p.modelId, "รุ่น"],
      [p.customerId, "ลูกค้า"],
      [p.locationId, "สถานที่"],
      [p.deliveryTypeId, "ประเภทการจัดส่ง"],
      [p.loadingPointId, "จุดขึ้นสินค้า"],
      [p.processLineId, "สายการผลิต"],
    ];
    const missing = required.find(([value]) => !value);
    return missing ? `กรุณาเลือก${missing[1]}` : null;
  }
  if (step === 2) {
    if (!data.bomEnabled || data.created.bomId) return null;
    const rows = data.bomRows;
    if (rows.length === 0) return "กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ";
    if (rows.some((r) => !r.materialId || !r.unitId || !(Number(r.quantity) > 0))) {
      return "ทุกรายการ BOM ต้องเลือกวัตถุดิบ หน่วย และจำนวนที่มากกว่า 0";
    }
    const ids = rows.map((r) => r.materialId);
    if (new Set(ids).size !== ids.length) return "ห้ามเลือกวัตถุดิบซ้ำใน BOM";
    if (data.mode === "material" && data.ownerMaterial && ids.includes(data.ownerMaterial.id)) return "BOM ของวัสดุห้ามอ้างถึงวัสดุตัวเอง";
    const known = new Set(data.materials.map((m) => m.key));
    if (rows.some((r) => isNewMaterialRef(r.materialId) && (!data.materialsEnabled || !known.has(newMaterialKey(r.materialId))))) {
      return "BOM อ้างถึงวัสดุใหม่ที่ไม่มีแล้วในขั้นตอนที่ 1 กรุณาเลือกวัตถุดิบใหม่";
    }
    return null;
  }
  if (step === 3) {
    if (!data.workflowEnabled || data.created.workflowId) return null;
    const rows = data.workflowRows;
    if (rows.length === 0 || rows.some((r) => !r.processStepId)) return "ทุกขั้นตอนต้องเลือกกระบวนการผลิต";
    const ids = rows.map((r) => r.processStepId);
    if (new Set(ids).size !== ids.length) return "ห้ามเลือกขั้นตอนซ้ำ";
    return null;
  }
  return null;
}

export function setupDraftTitle(data: SetupData): string {
  const firstMaterial = data.materialsEnabled ? data.materials[0]?.code.trim() ?? "" : "";
  const parts = (data.mode === "material" ? [ownerInfo(data)?.code ?? "", firstMaterial] : [data.product.code.trim(), firstMaterial]).filter(Boolean);
  return parts.length ? parts.join(" / ") : "ร่างที่ยังไม่ตั้งชื่อ";
}
