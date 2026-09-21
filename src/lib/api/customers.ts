import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data for the "ลูกค้า" (customer) lookup. Mirrors cps-api's real
// `/customers` module — see cps-api/API_ENDPOINTS.md § 5.1 and
// cps-api/src/modules/customers/{customers.controller,customers.service,
// dto/*}.ts.
//
// Backend fields: `code` and `nameTh` (required), `nameEn`, `taxId`,
// `contactName`, `telephone`, `email`, `address`, `isActive` (all optional).
// Service normalizes `code` to upper-case on write but returns the stored
// value as-is. Default sort is `code`. Update requires the row's current
// `updatedAt` (optimistic concurrency).
//
// Byte-for-byte identical to the Suppliers recipe (Shape D, 9 fields, no
// `description`, wide form) — same shared `createResourceApi` factory.

export interface Customer {
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

export interface ListCustomersParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedCustomers = PaginatedResult<Customer>;

export interface CustomerPayload {
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

export interface UpdateCustomerPayload extends Partial<CustomerPayload> {
  // Required by cps-api's `UpdateCustomerDto.updatedAt` for optimistic
  // concurrency — a stale value 409s.
  updatedAt: string;
}

const api = createResourceApi<Customer, CustomerPayload, UpdateCustomerPayload, ListCustomersParams>("/customers");

export const listCustomers = api.list;
export const getCustomer = api.get;
export const createCustomer = api.create;
export const updateCustomer = api.update;
export const deactivateCustomer = api.deactivate;
export const restoreCustomer = api.restore;