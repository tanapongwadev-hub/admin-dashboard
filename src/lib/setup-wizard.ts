// Pure types + validation for the "สร้างครบชุด" wizard (no server imports, so
// both the client wizard and the Server Action can share them).

const NEW_MATERIAL_PREFIX = "__new__:";
export const newMaterialRef = (key: number) => `${NEW_MATERIAL_PREFIX}${key}`;
export const isNewMaterialRef = (value: string) => value.startsWith(NEW_MATERIAL_PREFIX);
export const newMaterialKey = (value: string) => Number(value.slice(NEW_MATERIAL_PREFIX.length));

export interface SetupMaterialData {
  key: number;
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

/** Step indices shown for each mode (material mode skips product / BOM / workflow). */
export function visibleSteps(mode: SetupMode | undefined): number[] {
  return mode === "material" ? [0, 4] : [0, 1, 2, 3, 4];
}

export interface SetupData {
  /** What is being created; undefined until the user picks (shows the chooser). */
  mode?: SetupMode;
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

export function emptySetupData(): SetupData {
  return {
    materialsEnabled: true,
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
  if (m.locationType !== "internal") return null;
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
    if (ids.includes(newMaterialRef(m.key))) return "BOM ของวัสดุห้ามอ้างถึงวัสดุตัวเอง";
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

export function validateSetupStep(step: number, data: SetupData, can?: SetupMaterialCan): string | null {
  if (step === 0) {
    if (!data.materialsEnabled) return null;
    for (const [i, m] of data.materials.entries()) {
      const internal = validateInternalMaterial(m, data, can);
      if (internal) return `วัสดุใหม่ที่ ${i + 1}: ${internal}`;
    }
    const pending = data.materials.filter((m) => !data.created.materialIds?.[m.key]);
    for (const [i, m] of pending.entries()) {
      const label = `วัสดุใหม่ที่ ${i + 1}`;
      if (!m.code.trim() || !m.name.trim()) return `${label}: กรุณากรอกรหัสและชื่อวัสดุ`;
      if (!m.unitId) return `${label}: กรุณาเลือกหน่วย`;
      if (m.supplierIds.length === 0) return `${label}: กรุณาเลือกซัพพลายเออร์อย่างน้อย 1 ราย`;
      if (m.packingQuantity !== "" && !(Number(m.packingQuantity) >= 1)) return `${label}: จำนวนต่อแพ็กต้องมากกว่า 0`;
    }
    const codes = pending.map((m) => m.code.trim().toLowerCase());
    if (new Set(codes).size !== codes.length) return "รหัสวัสดุใหม่ซ้ำกัน";
    return null;
  }
  if (step === 1) {
    const p = data.product;
    if (data.created.productId) return null;
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
  const parts = (data.mode === "material" ? [firstMaterial] : [data.product.code.trim(), firstMaterial]).filter(Boolean);
  return parts.length ? parts.join(" / ") : "ร่างที่ยังไม่ตั้งชื่อ";
}
