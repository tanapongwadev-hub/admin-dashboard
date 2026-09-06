import { apiFetch } from "./client";

// Mirrors cps-api's real `/product-workflows` module — see
// cps-api/src/modules/product-workflows/{product-workflows.controller,product-workflows.service,dto/*}.ts
// (not documented anywhere except API_ENDPOINTS.md § 15, added alongside this
// module — same standing rule as Menu management/BOMs: read the source, not
// just the doc, if this drifts). A workflow always belongs to exactly one
// Product (`productId`), is versioned per product ("v1", "v2", ... computed
// server-side on every create — never sent by the client), and every create
// defaults to `status: "DRAFT"` — there is no way to create a workflow
// pre-activated; `activate()` is a separate call that also deactivates any
// other ACTIVE workflow for the same product server-side.
//
// This is deliberately a *separate* resource from BOMs (see AGENTS.md §
// Products): a BOM records *what materials* a product uses, a workflow
// records *what production steps* it must go through, in order (e.g. order
// production → weld → CNC → stamp → polish → inspect → QC → close). Each
// step is a plain free-text name (mirrors Material's `processLineName`
// being a plain string, not a FK to a "process type" master table) — there
// is intentionally no separate process-type catalog.

export type ProductWorkflowStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface ProductWorkflowStep {
  id: string;
  sortOrder: number;
  stepName: string;
  description: string | null;
}

export interface ProductWorkflow {
  id: string;
  productId: string;
  version: string;
  status: ProductWorkflowStatus;
  remark: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ProductWorkflowStep[];
}

export interface CreateProductWorkflowStepPayload {
  stepName: string;
  description?: string | null;
}

export interface CreateProductWorkflowPayload {
  productId: string;
  remark?: string | null;
  steps: CreateProductWorkflowStepPayload[];
}

export function createProductWorkflow(accessToken: string, payload: CreateProductWorkflowPayload) {
  return apiFetch<ProductWorkflow>("/product-workflows", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function activateProductWorkflow(accessToken: string, id: string) {
  return apiFetch<ProductWorkflow>(`/product-workflows/${id}/activate`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function listProductWorkflowsByProduct(accessToken: string, productId: string) {
  return apiFetch<ProductWorkflow[]>(`/product-workflows/product/${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
