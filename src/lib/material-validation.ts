// Central validation rules for a Material's core fields. The "เพิ่มวัสดุ" form
// (/materials/catalog) and the "สร้างครบชุด" wizard (/engineering/setup) both use
// these functions so the rules and Thai messages cannot drift apart. Pure: no server
// or React imports. Each rule returns a Thai message, or null when the value is fine.

export const MATERIAL_LIMITS = {
  codeMax: 50,
  nameMax: 255,
  packingMin: 1,
  packingMax: 1_000_000,
} as const;

export const MATERIAL_MESSAGES = {
  codeRequired: "กรุณากรอกรหัส",
  codeTooLong: "รหัสไม่เกิน 50 ตัวอักษร",
  nameRequired: "กรุณากรอกชื่อ",
  nameTooLong: "ชื่อไม่เกิน 255 ตัวอักษร",
  materialTypeRequired: "กรุณาเลือกประเภทวัสดุ",
  unitRequired: "กรุณาเลือกหน่วย",
  packingRequired: "กรุณากรอกจำนวนต่อแพ็ก",
  packingRange: "จำนวนต่อแพ็กต้องเป็นจำนวนเต็ม 1–1,000,000",
  minimumStockNegative: "สต็อกขั้นต่ำต้องไม่น้อยกว่า 0",
  supplierRequired: "กรุณาเลือกซัพพลายเออร์อย่างน้อย 1 ราย",
  imageRequired: "กรุณาเลือกรูปภาพวัสดุ",
} as const;

export function validateMaterialCode(code: string): string | null {
  const value = code.trim();
  if (!value) return MATERIAL_MESSAGES.codeRequired;
  return value.length > MATERIAL_LIMITS.codeMax ? MATERIAL_MESSAGES.codeTooLong : null;
}

export function validateMaterialName(name: string): string | null {
  const value = name.trim();
  if (!value) return MATERIAL_MESSAGES.nameRequired;
  return value.length > MATERIAL_LIMITS.nameMax ? MATERIAL_MESSAGES.nameTooLong : null;
}

/** `none` values (empty string or the form's "ไม่ระบุ" sentinel) count as not selected. */
export function validateMaterialTypeId(materialTypeId: string | null | undefined, noneValue = "__none__"): string | null {
  return !materialTypeId || materialTypeId === noneValue ? MATERIAL_MESSAGES.materialTypeRequired : null;
}

export function validateUnitId(unitId: string | null | undefined): string | null {
  return unitId ? null : MATERIAL_MESSAGES.unitRequired;
}

/** Pieces per pack: a whole number 1–1,000,000 (required wherever a pack size applies). */
export function validatePackingQuantity(raw: string | number | null | undefined): string | null {
  if (raw === "" || raw === null || raw === undefined) return MATERIAL_MESSAGES.packingRequired;
  const value = Number(raw);
  const ok = Number.isInteger(value) && value >= MATERIAL_LIMITS.packingMin && value <= MATERIAL_LIMITS.packingMax;
  return ok ? null : MATERIAL_MESSAGES.packingRange;
}

/** Optional: an empty value is fine, otherwise it must be a number >= 0. */
export function validateMinimumStock(raw: string | number | null | undefined): string | null {
  if (raw === "" || raw === null || raw === undefined) return null;
  return Number(raw) >= 0 ? null : MATERIAL_MESSAGES.minimumStockNegative;
}

export function validateSupplierCount(count: number): string | null {
  return count > 0 ? null : MATERIAL_MESSAGES.supplierRequired;
}

export function validateMaterialImage(hasImage: boolean): string | null {
  return hasImage ? null : MATERIAL_MESSAGES.imageRequired;
}

export type MaterialCoreKey = "code" | "name" | "materialTypeId" | "unitId" | "packingQuantity" | "minimumStock" | "suppliers" | "image";

export interface MaterialCoreInput {
  code: string;
  name: string;
  materialTypeId: string;
  unitId: string;
  packingQuantity: string | number;
  minimumStock: string | number;
  supplierCount: number;
  hasImage: boolean;
}

/** All core-field errors of a new PCS material, keyed by field (only failing fields are present). */
export function validateMaterialCore(input: MaterialCoreInput): Partial<Record<MaterialCoreKey, string>> {
  const checks: Array<[MaterialCoreKey, string | null]> = [
    ["code", validateMaterialCode(input.code)],
    ["name", validateMaterialName(input.name)],
    ["materialTypeId", validateMaterialTypeId(input.materialTypeId, "")],
    ["unitId", validateUnitId(input.unitId)],
    ["packingQuantity", validatePackingQuantity(input.packingQuantity)],
    ["minimumStock", validateMinimumStock(input.minimumStock)],
    ["suppliers", validateSupplierCount(input.supplierCount)],
    ["image", validateMaterialImage(input.hasImage)],
  ];
  const errors: Partial<Record<MaterialCoreKey, string>> = {};
  for (const [key, message] of checks) if (message) errors[key] = message;
  return errors;
}
