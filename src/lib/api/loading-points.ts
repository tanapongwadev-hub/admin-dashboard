import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "จุดขนถ่าย" (loading point) lookup. Mirrors
// cps-api's real `/loading-points` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/loading-points/{loading-points.controller,
// loading-points.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code` (per
// API_ENDPOINTS.md § 5.1, the typical default for simple masters — the
// only exception in that table is `/categories` whose default is
// `sortOrder`). Update requires the row's current `updatedAt` (optimistic
// concurrency, same shape as Materials PC, Products, and Categories).
//
// Compared to the parallel `categories.ts` resource: this module has
// **no** `parentId`, `sortOrder`, or `iconColor` fields, so the API
// surface and the form dialog both stay simpler (4 fields vs 7).
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

export interface LoadingPoint {
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

export interface ListLoadingPointsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedLoadingPoints = PaginatedResult<LoadingPoint>;

export interface LoadingPointPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateLoadingPointPayload extends Partial<LoadingPointPayload> {
  // Required by cps-api's `UpdateLoadingPointDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<LoadingPoint, LoadingPointPayload, UpdateLoadingPointPayload, ListLoadingPointsParams>(
  "/loading-points"
);

export const listLoadingPoints = api.list;
export const getLoadingPoint = api.get;
export const createLoadingPoint = api.create;
export const updateLoadingPoint = api.update;
export const deactivateLoadingPoint = api.deactivate;
export const restoreLoadingPoint = api.restore;
