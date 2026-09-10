import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "เหตุผลการปฏิเสธ" (reject reason) lookup. Mirrors
// cps-api's real `/reject-reasons` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/reject-reasons/{reject-reasons.controller,
// reject-reasons.service,dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `description`,
// `isActive` (all optional). Service normalizes `code` to upper-case on
// write but returns the stored value as-is. Default sort is `code`. Update
// requires the row's current `updatedAt` (optimistic concurrency, same
// shape as every other simple master).
//
// This resource is a byte-for-byte structural twin of `/loading-points`
// and `/delivery-types`: same 4 fields, same DTO validation, same default
// sort, same create/update/deactivate/restore endpoints, same
// `REJECT_REASON_*` permission codes. The only differences are the URL
// path and the menu label/icon (`x-circle`).
//
// The actual list/get/create/update/deactivate/restore functions are the
// shared `createResourceApi` factory (see create-resource-api.ts) — this
// file's only job is declaring the real domain difference: field shapes.

export interface RejectReason {
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

export interface ListRejectReasonsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedRejectReasons = PaginatedResult<RejectReason>;

export interface RejectReasonPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateRejectReasonPayload extends Partial<RejectReasonPayload> {
  // Required by cps-api's `UpdateRejectReasonDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<RejectReason, RejectReasonPayload, UpdateRejectReasonPayload, ListRejectReasonsParams>(
  "/reject-reasons"
);

export const listRejectReasons = api.list;
export const getRejectReason = api.get;
export const createRejectReason = api.create;
export const updateRejectReason = api.update;
export const deactivateRejectReason = api.deactivate;
export const restoreRejectReason = api.restore;
