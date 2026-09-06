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
// production → weld → CNC → stamp → polish → inspect → QC → close).
//
// Changed 2026-09-06: a step used to be a plain free-text name; it's now a
// `processStepId` FK into `/process-steps` master data (see process-steps.ts)
// so the wizard can offer a dropdown instead of a text field. The API still
// returns `stepName`/`processStepCode` per step for display — derived
// server-side by joining the referenced process step, not stored on the row.

export type ProductWorkflowStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface ProductWorkflowStep {
  id: string;
  sortOrder: number;
  processStepId: string;
  processStepCode: string;
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
  processStepId: string;
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
