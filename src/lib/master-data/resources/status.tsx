import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  listStatusItems,
  type ListStatusItemsParams,
  type StatusItem,
  type StatusItemColor,
  type StatusItemPayload,
  type UpdateStatusItemPayload,
} from "@/lib/api/status-items";
import {
  createStatusItemAction,
  updateStatusItemAction,
  deactivateStatusItemAction,
  restoreStatusItemAction,
} from "@/app/(dashboard)/master-data/statuses/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

const COLOR_LABELS: Record<StatusItemColor, string> = {
  info: "ข้อมูล",
  success: "สำเร็จ",
  warning: "คำเตือน",
  danger: "อันตราย",
  muted: "ทั่วไป",
};

function StatusColorBadge({ color }: { color: StatusItemColor }) {
  const variant: BadgeProps["variant"] = color === "muted" ? "neutral" : color;
  return <Badge variant={variant}>{COLOR_LABELS[color]}</Badge>;
}

export const statusResource: MasterDataResourceConfig<StatusItem> = {
  key: "status",
  resultKey: "statusItem",
  entityLabel: "สถานะ",
  dialogSize: "xl",
  codePlaceholder: "PENDING",
  nameThPlaceholder: "รอดำเนินการ",
  nameEnPlaceholder: "Pending",
  descriptionPlaceholder: "คำอธิบายการใช้งานสถานะนี้",
  fields: [
    {
      name: "module",
      label: "โมดูล",
      type: "text",
      required: true,
      maxLength: 50,
      placeholder: "materials-receiving",
      hint: "ชื่อโมดูลที่นำสถานะนี้ไปใช้",
      showInTable: true,
      tableWidth: "14%",
    },
    {
      name: "color",
      label: "สีสถานะ",
      type: "select",
      required: true,
      defaultValue: "info",
      options: Object.entries(COLOR_LABELS).map(([value, label]) => ({ value, label })),
      showInTable: true,
      tableWidth: "10%",
      tableRender: (status) => <StatusColorBadge color={status.color} />,
      heroBadge: (status) => <StatusColorBadge color={status.color} />,
      detailValue: (status) => <StatusColorBadge color={status.color} />,
    },
    {
      name: "sortOrder",
      label: "ลำดับ",
      type: "number",
      min: 0,
      max: 9999,
      defaultNumber: 0,
      showInTable: true,
      tableWidth: "8%",
    },
    {
      name: "isDefault",
      label: "สถานะเริ่มต้น",
      type: "boolean",
      defaultValue: false,
      hint: "ใช้เป็นสถานะเริ่มต้นของโมดูลนี้",
      showInTable: true,
      tableWidth: "10%",
      tableRender: (status) => (
        <Badge variant={status.isDefault ? "primary" : "neutral"}>{status.isDefault ? "ค่าเริ่มต้น" : "ทั่วไป"}</Badge>
      ),
      heroBadge: (status) => status.isDefault ? <Badge variant="primary">ค่าเริ่มต้น</Badge> : null,
      detailValue: (status) => status.isDefault ? "ใช่" : "ไม่ใช่",
    },
  ],
  actions: {
    create: (payload) => createStatusItemAction(payload as unknown as StatusItemPayload),
    update: (id, payload) => updateStatusItemAction(id, payload as unknown as UpdateStatusItemPayload),
    deactivate: (id) => deactivateStatusItemAction(id),
    restore: (id) => restoreStatusItemAction(id),
  },
  pageTitle: "สถานะ",
  pageDescription: "จัดการสถานะมาตรฐานที่แต่ละโมดูลใช้ในระบบ",
  permissionPrefix: "STATUS_ITEM",
  permissionLabelEnglish: "Status Item View",
  sortBy: "sortOrder",
  list: (accessToken, params) => listStatusItems(accessToken, params as unknown as ListStatusItemsParams),
};
