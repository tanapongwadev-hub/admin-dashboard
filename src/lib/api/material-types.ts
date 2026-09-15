import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "ประเภทวัสดุ" (material type: PC / OF / OF-MAT) lookup.
// Mirrors cps-api's real `/material-types` module — see
// cps-api/API_ENDPOINTS.md § 5.1 and cps-api/src/modules/material-types/
// {material-types.controller,material-types.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code`. Update
// requires the row's current `updatedAt` (optimistic concurrency, same
// shape as every other simple master).
//
// Structural twin of `/reject-reasons` / `/delivery-types` (Shape A):
// same 4 fields, same DTO validation, same default sort, same
// create/update/deactivate/restore endpoints, `MATERIAL_TYPE_*` permission
// codes. The backend migration seeds `PC`, `OF`, `OF_MAT` — the values
// already used by `materials.type`.

export interface MaterialType {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMaterialTypesParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedMaterialTypes = PaginatedResult<MaterialType>;

export interface MaterialTypePayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateMaterialTypePayload extends Partial<MaterialTypePayload> {
  // Required by cps-api's `UpdateMaterialTypeDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<MaterialType, MaterialTypePayload, UpdateMaterialTypePayload, ListMaterialTypesParams>(
  "/material-types"
);

export const listMaterialTypes = api.list;
export const getMaterialType = api.get;
export const createMaterialType = api.create;
export const updateMaterialType = api.update;
export const deactivateMaterialType = api.deactivate;
export const restoreMaterialType = api.restore;
