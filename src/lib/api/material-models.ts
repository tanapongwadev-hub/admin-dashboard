import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "รุ่นวัสดุ" (material model) lookup. Mirrors
// cps-api's real `/material-models` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/material-models/{material-models.controller,
// material-models.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code`. Update
// requires the row's current `updatedAt` (optimistic concurrency, same
// shape as every other simple master).
//
// Compared to the parallel `categories.ts` resource: this module has
// **no** `parentId`, `sortOrder`, or `iconColor` fields, so the API
// surface and the form dialog both stay simpler (4 fields vs 7).
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

export interface MaterialModel {
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

export interface ListMaterialModelsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedMaterialModels = PaginatedResult<MaterialModel>;

export interface MaterialModelPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateMaterialModelPayload extends Partial<MaterialModelPayload> {
  // Required by cps-api's `UpdateMaterialModelDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<MaterialModel, MaterialModelPayload, UpdateMaterialModelPayload, ListMaterialModelsParams>(
  "/material-models"
);

export const listMaterialModels = api.list;
export const getMaterialModel = api.get;
export const createMaterialModel = api.create;
export const updateMaterialModel = api.update;
export const deactivateMaterialModel = api.deactivate;
export const restoreMaterialModel = api.restore;
