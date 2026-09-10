import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "ประเภทการจัดส่ง" (delivery type) lookup. Mirrors
// cps-api's real `/delivery-types` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/delivery-types/{delivery-types.controller,
// delivery-types.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code`. Update
// requires the row's current `updatedAt` (optimistic concurrency, same
// shape as every other simple master).
//
// This resource is a byte-for-byte structural twin of `/loading-points`:
// same 4 fields, same DTO validation, same default sort, same
// create/update/deactivate/restore endpoints, same `DELIVERY_TYPE_*`
// permission codes. The only difference is the URL path and the menu
// label/icon (`truck` instead of `map-pin`).
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

export interface DeliveryType {
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

export interface ListDeliveryTypesParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedDeliveryTypes = PaginatedResult<DeliveryType>;

export interface DeliveryTypePayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateDeliveryTypePayload extends Partial<DeliveryTypePayload> {
  // Required by cps-api's `UpdateDeliveryTypeDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<DeliveryType, DeliveryTypePayload, UpdateDeliveryTypePayload, ListDeliveryTypesParams>(
  "/delivery-types"
);

export const listDeliveryTypes = api.list;
export const getDeliveryType = api.get;
export const createDeliveryType = api.create;
export const updateDeliveryType = api.update;
export const deactivateDeliveryType = api.deactivate;
export const restoreDeliveryType = api.restore;
