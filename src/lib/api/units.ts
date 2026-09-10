import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "หน่วยนับ" (unit of measure) lookup. Mirrors
// cps-api's real `/units` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/units/{units.controller,
// units.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `symbol`,
// `description`, `isActive` (all optional). Service normalizes `code`
// to upper-case on write but returns the stored value as-is. Default sort
// is `code`. Update requires the row's current `updatedAt` (optimistic
// concurrency). Compared to the parallel `material-models` resource:
// this module has an extra `symbol` field (e.g. "ชิ้น", "กิโลกรัม",
// "ลิตร") which appears in the form and details dialog but is
// intentionally omitted from the table columns to keep the table readable.
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

export interface Unit {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  symbol: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUnitsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedUnits = PaginatedResult<Unit>;

export interface UnitPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  symbol?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateUnitPayload extends Partial<UnitPayload> {
  // Required by cps-api's `UpdateUnitDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<Unit, UnitPayload, UpdateUnitPayload, ListUnitsParams>("/units");

export const listUnits = api.list;
export const getUnit = api.get;
export const createUnit = api.create;
export const updateUnit = api.update;
export const deactivateUnit = api.deactivate;
export const restoreUnit = api.restore;
