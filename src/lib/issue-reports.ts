// Shared labels/options for the issue-report feature (client-safe, no server imports).

export const ISSUE_DOCUMENT_TYPES = [
  { value: "MATERIAL_RECEIVING", label: "รับเข้าวัสดุ" },
  { value: "MATERIAL_DISBURSEMENT", label: "จ่ายออกวัสดุ" },
  { value: "MATERIAL_JOB_ORDER", label: "ใบจัดงาน" },
  { value: "MATERIAL_PROCESSING", label: "แปรรูปวัตถุดิบ" },
  { value: "PRODUCTION_PLAN", label: "แผนผลิต" },
  { value: "PRODUCTION_ORDER", label: "ใบสั่งผลิต" },
  { value: "SALES_ORDER", label: "ใบสั่งขาย" },
  { value: "SALES_JOB_ORDER", label: "ใบจัดงานขาย" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

export const ISSUE_SEVERITIES = [
  { value: "LOW", label: "ต่ำ" },
  { value: "MEDIUM", label: "ปานกลาง" },
  { value: "HIGH", label: "สูง" },
] as const;

export const ISSUE_STATUSES = [
  { value: "OPEN", label: "รอดำเนินการ" },
  { value: "IN_PROGRESS", label: "กำลังแก้ไข" },
  { value: "RESOLVED", label: "แก้ไขแล้ว" },
  { value: "CLOSED", label: "ปิดเรื่อง" },
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number]["value"];

export const ISSUE_STATUS_VARIANT: Record<
  IssueStatus,
  "warning" | "info" | "success" | "neutral"
> = {
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export const ISSUE_SEVERITY_VARIANT: Record<string, "neutral" | "warning" | "danger"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export function labelOf(
  list: readonly { value: string; label: string }[],
  value: string,
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}
