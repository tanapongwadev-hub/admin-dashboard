import { ApiError } from "@/lib/api/api-error";

const THAI_TEXT = /[\u0E00-\u0E7F]/;

const EXACT_MESSAGES: Record<string, string> = {
  "Invalid username or password": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  "Invalid credentials": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  "User account is inactive": "บัญชีผู้ใช้ถูกระงับการใช้งาน",
  "User account is locked": "บัญชีผู้ใช้ถูกล็อก",
  "You do not have permission to perform this action": "คุณไม่มีสิทธิ์ดำเนินการนี้",
  "Session has expired": "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง",
  "Session has been revoked": "เซสชันถูกยกเลิก กรุณาเข้าสู่ระบบอีกครั้ง",
  "Access token rejected": "ข้อมูลยืนยันตัวตนไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง",
  "Material receiving not found": "ไม่พบรายการรับเข้า",
  "Materials disbursement not found": "ไม่พบรายการจ่ายออก",
  "Production Plan not found": "ไม่พบแผนการผลิต",
  "Insufficient stock to approve the Production Plan":
    "สต็อกไม่เพียงพอสำหรับอนุมัติแผนการผลิต",
  "Cannot delete menu with child menus":
    "ยังลบเมนูที่มีเมนูย่อยไม่ได้ กรุณาย้ายหรือลบเมนูย่อยก่อน",
  "Cannot delete menu that still has permissions":
    "ยังลบเมนูที่มีสิทธิ์ผูกอยู่ไม่ได้ กรุณาถอดสิทธิ์ก่อน",
  "Menu not found": "ไม่พบเมนูนี้ อาจถูกลบไปแล้ว กรุณารีเฟรชหน้า",
  "Parent menu not found": "ไม่พบเมนูแม่ที่เลือก กรุณารีเฟรชแล้วลองอีกครั้ง",
  "Unsupported image format": "รูปแบบไฟล์รูปภาพไม่รองรับ",
  "Invalid menu item id": "รหัสรายการเมนูไม่ถูกต้อง",
  "Code already exists": "รหัสนี้มีอยู่ในระบบแล้ว",
};

const RESOURCE_NAMES: Record<string, string> = {
  user: "ผู้ใช้",
  department: "แผนก",
  role: "บทบาท",
  menu: "เมนู",
  permission: "สิทธิ์",
  category: "หมวดหมู่",
  customer: "ลูกค้า",
  supplier: "ผู้จำหน่าย",
  unit: "หน่วยนับ",
  location: "สถานที่จัดเก็บ",
  material: "วัตถุดิบ",
  "material type": "ประเภทวัตถุดิบ",
  "material model": "รุ่นวัตถุดิบ",
  product: "สินค้า",
  "product type": "ประเภทสินค้า",
  "product model": "รุ่นสินค้า",
  "loading point": "จุดขนถ่าย",
  "delivery type": "ประเภทการจัดส่ง",
  "reject reason": "เหตุผลการปฏิเสธ",
  "process line": "สายการผลิต",
  "status item": "สถานะ",
};

export const GENERIC_ERROR_MESSAGE = "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง";
export const CONNECTION_ERROR_MESSAGE = "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";

export function apiErrorMessage(error: ApiError, fallback?: string): string {
  const body = error.body as { message?: unknown } | undefined;
  if (body?.message === undefined) return fallback ?? GENERIC_ERROR_MESSAGE;
  return translateUserErrorMessage(
    body?.message,
    fallback ?? statusFallback(error.status),
  );
}

export function translateUserErrorMessage(
  value: unknown,
  fallback = GENERIC_ERROR_MESSAGE,
): string {
  if (Array.isArray(value)) {
    const translated = [...new Set(value
      .map((item) => translateSingleMessage(item, fallback))
      .filter(Boolean))];
    return translated.length > 0 ? translated.join(" · ") : fallback;
  }
  return translateSingleMessage(value, fallback);
}

function translateSingleMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const message = value.trim();
  if (THAI_TEXT.test(message)) return message;
  if (EXACT_MESSAGES[message]) return EXACT_MESSAGES[message];

  const notFound = message.match(/^(.+?) not found$/i);
  if (notFound) return `ไม่พบ${resourceName(notFound[1])}`;

  const duplicateCode = message.match(/^(.+?) code already exists$/i);
  if (duplicateCode) return `รหัส${resourceName(duplicateCode[1])}นี้มีอยู่ในระบบแล้ว`;

  const duplicate = message.match(/^(.+?) already exists$/i);
  if (duplicate) return `${resourceName(duplicate[1])}นี้มีอยู่ในระบบแล้ว`;

  const updated = message.match(/^(.+?) has been updated$/i);
  if (updated) {
    return `${resourceName(updated[1])}ถูกแก้ไขโดยผู้ใช้อื่น กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง`;
  }

  const required = message.match(/^(.+?) is required$/i);
  if (required) return `กรุณาระบุ ${required[1]}`;

  const insufficient = message.match(
    /^Insufficient stock for material (.+?)\. Requested: (.+?), Available: (.+)$/i,
  );
  if (insufficient) {
    return `สต็อกวัตถุดิบ ${insufficient[1]} ไม่เพียงพอ (ต้องการ ${insufficient[2]}, คงเหลือที่ใช้ได้ ${insufficient[3]})`;
  }

  return fallback;
}

function statusFallback(status: number): string {
  if (status === 400) return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง";
  if (status === 401) return "กรุณาเข้าสู่ระบบอีกครั้ง";
  if (status === 403) return "คุณไม่มีสิทธิ์ดำเนินการนี้";
  if (status === 404) return "ไม่พบข้อมูลที่ต้องการ";
  if (status === 409) return "ข้อมูลมีการเปลี่ยนแปลง กรุณาโหลดใหม่แล้วลองอีกครั้ง";
  if (status === 413) return "ข้อมูลหรือไฟล์มีขนาดใหญ่เกินกำหนด";
  if (status === 429) return "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง";
  if (status >= 500) return "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง";
  return GENERIC_ERROR_MESSAGE;
}

function resourceName(value: string): string {
  return RESOURCE_NAMES[value.trim().toLowerCase()] ?? "ข้อมูลที่ต้องการ";
}
