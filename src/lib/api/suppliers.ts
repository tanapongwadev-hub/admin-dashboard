import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "ผู้จัดจำหน่าย" (supplier) lookup. Mirrors
// cps-api's real `/suppliers` module — see cps-api/API_ENDPOINTS.md
// § 5.1 and cps-api/src/modules/suppliers/{suppliers.controller,
// suppliers.service, dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `taxId`,
// `contactName`, `telephone`, `email`, `address`, `isActive` (all optional).
// Service normalizes `code` to upper-case on write but returns the stored
// value as-is. Default sort is `code`. Update requires the row's current
// `updatedAt` (optimistic concurrency).
//
// Wider field set than the other simple masters (9 fields vs 4), but the
// same list/get/create/update/deactivate/restore shape — still the shared
// `createResourceApi` factory (see create-resource-api.ts); this file's
// only job is declaring the real domain difference: field shapes.

export interface Supplier {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  taxId: string | null;
  contactName: string | null;
  telephone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSuppliersParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedSuppliers = PaginatedResult<Supplier>;

export interface SupplierPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  taxId?: string | null;
  contactName?: string | null;
  telephone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierPayload extends Partial<SupplierPayload> {
  // Required by cps-api's `UpdateSupplierDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<Supplier, SupplierPayload, UpdateSupplierPayload, ListSuppliersParams>("/suppliers");

export const listSuppliers = api.list;
export const getSupplier = api.get;
export const createSupplier = api.create;
export const updateSupplier = api.update;
export const deactivateSupplier = api.deactivate;
export const restoreSupplier = api.restore;
