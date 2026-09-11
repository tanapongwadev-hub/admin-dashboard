import { Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listCategories, type Category, type CategoryPayload, type UpdateCategoryPayload, type ListCategoriesParams } from "@/lib/api/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  deactivateCategoryAction,
  restoreCategoryAction,
} from "@/app/(dashboard)/master-data/categories/actions";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Descriptor for `/master-data/categories` — Shape C (code, nameTh, nameEn,
// description plus `sortOrder` and a free-form `iconColor` CSS color
// string), see AGENTS.md § Master-data generic CRUD page and § Categories.
// The only resource whose default sort is `sortOrder`, not `code`.
// `parentId` exists on the backend but isn't surfaced in this admin UI
// (same scope decision as the hand-written version — see AGENTS.md).

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function IconColorSwatch({ value }: { value: string | null }) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return (
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted"
        aria-label="ไม่ได้ตั้งค่าสี"
        title="ไม่ได้ตั้งค่าสี"
      >
        <Palette className="size-3" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span
      className="block size-6 shrink-0 rounded-md border border-border"
      style={{ backgroundColor: trimmed }}
      aria-label={`สีไอคอน: ${trimmed}`}
      title={trimmed}
    />
  );
}

export const categoryResource: MasterDataResourceConfig<Category> = {
  key: "category",
  resultKey: "category",
  entityLabel: "หมวดหมู่",
  dialogSize: "lg",
  codePlaceholder: "ELECTRONIC",
  nameThPlaceholder: "อิเล็กทรอนิกส์",
  nameEnPlaceholder: "Electronics",
  descriptionPlaceholder: "รายละเอียดเพิ่มเติมเกี่ยวกับหมวดหมู่นี้",
  fields: [
    {
      name: "sortOrder",
      label: "ลำดับ",
      type: "number",
      min: 0,
      max: 9999,
      defaultNumber: 0,
      showInTable: true,
      tableWidth: "10%",
      heroBadge: (category) => <Badge variant="neutral">ลำดับ {category.sortOrder}</Badge>,
    },
    {
      name: "iconColor",
      label: "สีไอคอน",
      type: "color",
      maxLength: 20,
      placeholder: "#4640DE",
      hint: "รูปแบบ hex เช่น #4640DE · ไม่บังคับ",
      fullWidth: true,
      showInTable: true,
      tableWidth: "8%",
      tableRender: (category) => <IconColorSwatch value={category.iconColor} />,
      heroBadge: (category) => {
        const value = category.iconColor?.trim();
        if (!value) return null;
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-fg-secondary">
            <span
              className="inline-block size-3 rounded-sm border border-border"
              style={HEX_COLOR_PATTERN.test(value) ? { backgroundColor: value } : undefined}
              aria-hidden="true"
            />
            {value}
          </span>
        );
      },
      detailValue: (category) => {
        const value = category.iconColor?.trim();
        if (!value) return "—";
        return (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block size-4 rounded-sm border border-border"
              style={HEX_COLOR_PATTERN.test(value) ? { backgroundColor: value } : undefined}
              aria-hidden="true"
            />
            {value}
          </span>
        );
      },
    },
  ],
  actions: {
    create: (payload) => createCategoryAction(payload as unknown as CategoryPayload),
    update: (id, payload) => updateCategoryAction(id, payload as unknown as UpdateCategoryPayload),
    deactivate: (id) => deactivateCategoryAction(id),
    restore: (id) => restoreCategoryAction(id),
  },
  pageTitle: "หมวดหมู่",
  pageDescription: "จัดการข้อมูลหลักหมวดหมู่ที่ใช้ในระบบ",
  permissionPrefix: "CATEGORY",
  permissionLabelEnglish: "Category View",
  sortBy: "sortOrder",
  list: (accessToken, params) => listCategories(accessToken, params as unknown as ListCategoriesParams),
};
