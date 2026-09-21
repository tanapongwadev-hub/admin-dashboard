import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "สายการผลิต" (process line: Assembly Line 1, Welding
// Line, Paint Line) lookup used by `Products.processLineId`. Mirrors
// cps-api's real `/process-lines` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/process-lines/{process-lines.controller,
// process-lines.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code`.
// Update requires the row's current `updatedAt` (optimistic concurrency).
//
// Shape A (code/nameTh/nameEn/description) — exact same field set as
// `/material-types`, `/units`, `/reject-reasons`, `/delivery-types`. The
// lookup table on `/products` already consumes this data via
// `ProductsService.processLineRepository` (read-only join on
// `/products/lookups`) — that integration is unchanged by this CRUD page;
// the new endpoints are only for admin management of the master data.
// `Material.processLineName` is a free-text column (NOT joined to
// `process_lines`) and remains untouched by this work.

export interface ProcessLine {
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

export interface ListProcessLinesParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedProcessLines = PaginatedResult<ProcessLine>;

export interface ProcessLinePayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateProcessLinePayload extends Partial<ProcessLinePayload> {
  // Required by cps-api's `UpdateProcessLineDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<ProcessLine, ProcessLinePayload, UpdateProcessLinePayload, ListProcessLinesParams>(
  "/process-lines"
);

export const listProcessLines = api.list;
export const getProcessLine = api.get;
export const createProcessLine = api.create;
export const updateProcessLine = api.update;
export const deactivateProcessLine = api.deactivate;
export const restoreProcessLine = api.restore;