import { apiFetch } from "./client";

// Master data for Product Workflow steps (see product-workflows.ts) — added
// 2026-09-06 so a workflow step can be picked from a dropdown instead of
// typed as free text. Mirrors cps-api's real `/process-steps` module — see
// cps-api/API_ENDPOINTS.md § 16 and
// cps-api/src/modules/process-steps/{process-steps.controller,process-steps.service,dto/*}.ts.
// Full CRUD exists on the backend (structurally a mirror of
// /delivery-types), but this app only ever needs the read side for the
// wizard's dropdown — no admin UI for managing this master data yet.

export interface ProcessStep {
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

export interface ListProcessStepsParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedProcessSteps {
  items: ProcessStep[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export function listProcessSteps(accessToken: string, params: ListProcessStepsParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);

  const qs = query.toString();
  return apiFetch<PaginatedProcessSteps>(`/process-steps${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
