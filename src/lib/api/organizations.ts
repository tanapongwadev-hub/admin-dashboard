import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data "องค์กร" — mirrors cps-api's `/organizations` module
// (src/modules/organizations, permissions ORGANIZATION_*). Simple master with
// soft delete/restore and `updatedAt` optimistic concurrency. No
// `description` field; `parentId`/`logoUrl` exist on the backend but are not
// edited from this page.

export type OrganizationType = "headquarters" | "branch" | "subsidiary" | "department";

export interface Organization {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
  parentId: string | null;
  type: OrganizationType;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListOrganizationsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedOrganizations = PaginatedResult<Organization>;

export interface OrganizationPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  type?: OrganizationType;
  isActive?: boolean;
}

export interface UpdateOrganizationPayload extends Partial<OrganizationPayload> {
  updatedAt: string;
}

const api = createResourceApi<Organization, OrganizationPayload, UpdateOrganizationPayload, ListOrganizationsParams>(
  "/organizations"
);

export const listOrganizations = api.list;
export const getOrganization = api.get;
export const createOrganization = api.create;
export const updateOrganization = api.update;
export const deactivateOrganization = api.deactivate;
export const restoreOrganization = api.restore;
