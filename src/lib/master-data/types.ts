import type * as React from "react";
import type { PaginatedResult } from "@/lib/api/create-resource-api";

// Shared descriptor types for the "generic CRUD page" — item #3 of the
// 2026-09-10 architecture review (see AGENTS.md § Master-data CRUD
// factories). The data layer (createResourceApi/createCrudActions) already
// collapsed 7 resources' lib/api + actions files into 2 shared
// implementations; this collapses the remaining 6 UI component files per
// resource (client/filters/table/form-dialog/status-dialog/details-dialog)
// into one shared generic UI, driven by a small per-resource descriptor.
//
// Every simple-master resource shares 4 "core" fields (code, nameTh,
// nameEn, description) handled directly by the generic components — a
// resource's descriptor only declares its *extra* fields (Categories'
// sortOrder/iconColor, Units' symbol, Suppliers' taxId/contactName/
// telephone/email/address) via `fields`.

export interface BaseMasterEntity {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  // Optional — Suppliers has no `description` field at all (see
  // `resource.hasDescription`), every other simple master does.
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MasterDataFieldType = "text" | "textarea" | "number" | "color" | "email" | "select" | "boolean";

export interface MasterDataFieldOption {
  value: string;
  label: string;
}

export interface MasterDataFieldDef<TEntity extends BaseMasterEntity = BaseMasterEntity> {
  /** Property name on the entity/payload, e.g. "sortOrder" */
  name: string;
  /** Thai label, e.g. "ลำดับ" */
  label: string;
  type: MasterDataFieldType;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Default numeric value on create (only meaningful for type: "number") */
  defaultNumber?: number;
  /** Default value on create (for select and boolean fields) */
  defaultValue?: string | boolean;
  /** Allowed choices for a select field */
  options?: MasterDataFieldOption[];
  placeholder?: string;
  /** Always-shown hint text under the field (replaced by the error message when invalid) */
  hint?: string;
  /** Spans both grid columns in the form dialog */
  fullWidth?: boolean;
  /** Show as its own column in the table view */
  showInTable?: boolean;
  tableWidth?: string;
  /** Custom table-cell renderer (e.g. Categories' color swatch) */
  tableRender?: (entity: TEntity) => React.ReactNode;
  /** Optional badge rendered in the details dialog's hero (e.g. Categories' "ลำดับ N" / color chip) */
  heroBadge?: (entity: TEntity) => React.ReactNode | null;
  /** Custom details-dialog Data Sheet value renderer */
  detailValue?: (entity: TEntity) => React.ReactNode;
}

// A real action result is always `{ status: "success", <resultKey>: TEntity }
// | { status: "error", message: string }` (see lib/create-crud-actions.ts).
// The generic layer doesn't know the literal `resultKey` at the type level,
// so it's typed loosely here and read out via `getEntityFromResult()`.
// `TEntity` isn't read structurally (the entity comes back under a
// resource-specific key resolved at runtime by `getEntityFromResult`) — it's
// kept as a phantom type param purely so call sites read as
// `GenericActionResult<Category>` etc. instead of an untyped blob.
export type GenericActionResult<TEntity> =
  | ({ status: "success" } & Record<string, unknown> & { __entityType?: TEntity })
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export interface MasterDataListParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface MasterDataResourceConfig<TEntity extends BaseMasterEntity = BaseMasterEntity> {
  /** Short slug, e.g. "category" — used for DOM ids */
  key: string;
  /** The key the create/update/deactivate/restore result carries the entity under */
  resultKey: string;
  /** Thai noun for this resource, e.g. "หมวดหมู่" — every generated copy string derives from this */
  entityLabel: string;
  /** Defaults to 100 (matches every resource except Suppliers at 255) */
  nameMaxLength?: number;
  dialogSize: "lg" | "xl";
  codePlaceholder: string;
  nameThPlaceholder: string;
  nameEnPlaceholder: string;
  /** Every resource has a description field except Suppliers — default true */
  hasDescription?: boolean;
  descriptionPlaceholder?: string;
  /** Resource-specific fields beyond code/nameTh/nameEn/description */
  fields: MasterDataFieldDef<TEntity>[];
  actions: {
    create: (payload: Record<string, unknown>) => Promise<GenericActionResult<TEntity>>;
    update: (id: string, payload: Record<string, unknown> & { updatedAt: string }) => Promise<GenericActionResult<TEntity>>;
    deactivate: (id: string) => Promise<GenericActionResult<TEntity>>;
    restore: (id: string) => Promise<GenericActionResult<TEntity>>;
  };
  pageTitle: string;
  pageDescription: string;
  /** cps-api permission code prefix, e.g. "CATEGORY" → CATEGORY_VIEW/CREATE/UPDATE/DELETE */
  permissionPrefix: string;
  /** English permission name shown in the access-denied message, e.g. "Category View" */
  permissionLabelEnglish: string;
  sortBy: string;
  list: (accessToken: string, params: MasterDataListParams) => Promise<PaginatedResult<TEntity>>;
}
