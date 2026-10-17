// Categories shown on the /master-data hub. The sidebar uses the same
// grouping (cps-api container menus under MASTER DATA), so keep them in sync.
export interface MasterDataGroup {
  id: string;
  label: string;
  description: string;
  keys: string[];
}

export const MASTER_DATA_GROUPS: MasterDataGroup[] = [
  { id: "materials", label: "วัสดุและคลัง", description: "หน่วยนับ ผู้จัดจำหน่าย ประเภท รุ่น และสถานที่ของวัสดุ", keys: ["units", "suppliers", "material-models", "material-types", "categories", "locations"] },
  { id: "products", label: "สินค้าและลูกค้า", description: "ประเภท รุ่น ลูกค้า และการจัดส่งของสินค้า", keys: ["product-types", "product-models", "customers", "delivery-types", "loading-points"] },
  { id: "production", label: "การผลิต", description: "สายการผลิต ขั้นตอน และเหตุผลการปฏิเสธ", keys: ["process-lines", "process-steps", "reject-reasons"] },
  { id: "general", label: "ทั่วไป", description: "สถานะและองค์กร", keys: ["statuses", "organizations"] },
  { id: "access", label: "ผู้ใช้งานและสิทธิ์", description: "แผนก และบทบาท (เฉพาะ Super Admin)", keys: ["departments", "roles"] },
];

export function masterDataGroupOf(key: string) {
  return MASTER_DATA_GROUPS.find((group) => group.keys.includes(key))?.id ?? "general";
}
