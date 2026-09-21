import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "สถานที่" (location: warehouse/zone) lookup used
// by `Products.locationId`. Mirrors cps-api's real `/locations` module —
// see cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/locations/{locations.controller,locations.service,
// dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `zone`,
// `warehouse`, `description`, `isActive` (all optional). Service normalizes
// `code` to upper-case on write but returns the stored value as-is. Default
// sort is `code`. Update requires the row's current `updatedAt` (optimistic
// concurrency).
//
// Shape A+ (code/nameTh/nameEn/description) plus two extra optional fields
// (`zone`, `warehouse`) — no other simple-master resource has these
// together. The lookup table on `/products` already consumes this data via
// `ProductsService.locationRepository` (read-only join on `/products/lookups`)
// — that integration is unchanged by this CRUD page; the new endpoints are
// only for admin management of the master data.

export interface Location {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  zone: string | null;
  warehouse: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListLocationsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedLocations = PaginatedResult<Location>;

export interface LocationPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  zone?: string | null;
  warehouse?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateLocationPayload extends Partial<LocationPayload> {
  // Required by cps-api's `UpdateLocationDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<Location, LocationPayload, UpdateLocationPayload, ListLocationsParams>(
  "/locations"
);

export const listLocations = api.list;
export const getLocation = api.get;
export const createLocation = api.create;
export const updateLocation = api.update;
export const deactivateLocation = api.deactivate;
export const restoreLocation = api.restore;