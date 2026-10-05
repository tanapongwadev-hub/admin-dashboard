import type { Organization, OrganizationPayload, UpdateOrganizationPayload } from "@/lib/api/organizations";
import {
  createOrganizationAction,
  updateOrganizationAction,
  deactivateOrganizationAction,
  restoreOrganizationAction,
} from "@/app/(dashboard)/master-data/organizations/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/organizations` — wide shape like Suppliers
// (no description field, xl dialog). See AGENTS.md § Master-data generic CRUD page.

const TYPE_LABELS: Record<string, string> = {
  headquarters: "สำนักงานใหญ่",
  branch: "สาขา",
  subsidiary: "บริษัทในเครือ",
  department: "หน่วยงาน",
};

export const organizationResource: MasterDataResourceConfig<Organization> = {
  key: "organization",
  resultKey: "organization",
  entityLabel: "องค์กร",
  nameMaxLength: 255,
  dialogSize: "xl",
  codePlaceholder: "CCI-HQ",
  nameThPlaceholder: "บริษัท เจียวชาญ อินดัสตรี จำกัด",
  nameEnPlaceholder: "Chiewchan Industry Co., Ltd.",
  hasDescription: false,
  fields: [
    {
      name: "type",
      label: "ประเภทองค์กร",
      type: "select",
      required: true,
      defaultValue: "department",
      options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
      showInTable: true,
      tableWidth: "14%",
      tableRender: (org) => TYPE_LABELS[org.type] ?? org.type,
      detailValue: (org) => TYPE_LABELS[org.type] ?? org.type,
    },
    { name: "taxId", label: "เลขประจำตัวผู้เสียภาษี", type: "text", maxLength: 20, placeholder: "0105548012345" },
    { name: "phone", label: "เบอร์โทรศัพท์", type: "text", maxLength: 50, placeholder: "02-123-4567", showInTable: true, tableWidth: "14%" },
    { name: "email", label: "อีเมล", type: "email", maxLength: 255, placeholder: "contact@company.example" },
    { name: "website", label: "เว็บไซต์", type: "text", maxLength: 255, placeholder: "https://www.company.example" },
    { name: "address", label: "ที่อยู่", type: "textarea", fullWidth: true, placeholder: "ที่อยู่ขององค์กร" },
  ],
  actions: {
    create: (payload) => createOrganizationAction(payload as unknown as OrganizationPayload),
    update: (id, payload) => updateOrganizationAction(id, payload as unknown as UpdateOrganizationPayload),
    deactivate: (id) => deactivateOrganizationAction(id),
    restore: (id) => restoreOrganizationAction(id),
  },
  pageTitle: "องค์กร",
  pageDescription: "จัดการข้อมูลหลักองค์กร สำนักงานใหญ่ สาขา และหน่วยงาน",
  permissionPrefix: "ORGANIZATION",
  permissionLabelEnglish: "Organization View",
  sortBy: "code",
};
