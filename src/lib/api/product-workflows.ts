import { apiFetch } from "./client";

// Mirrors cps-api's real `/product-workflows` module — see
// cps-api/src/modules/product-workflows/{product-workflows.controller,product-workflows.service,dto/*}.ts
// (documented in API_ENDPOINTS.md § 15, added alongside this module). A
// workflow always belongs to exactly one Product (`productId`), is versioned
// per product ("v1", "v2", ... computed server-side on every create — never
// sent by the client), and every create defaults to `status: "DRAFT"` — there
// is no way to create a workflow pre-activated; `activate()` is a separate call
// that also deactivates any other ACTIVE workflow for the same product.
//
// This is deliberately a *separate* resource from BOMs (see AGENTS.md §
// Products): a BOM records *what materials* a product uses, a workflow records
// *what production steps* it must go through, in order.
//
// A step uses a `processStepId` FK into `/process-steps` master data (see
// process-steps.ts). The API returns `stepName`/`processStepCode` per step for
// display, derived server-side by joining the referenced process step.

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
  imagePath: string | null;
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
  imagePath?: string | null;
  steps: CreateProductWorkflowStepPayload[];
}

export interface StagedProductWorkflowImage {
  imagePath: string;
  previewUrl: string;
}

export function uploadProductWorkflowImage(
  accessToken: string,
  file: Blob,
  filename?: string
) {
  const body = new FormData();
  if (filename) body.append("file", file, filename);
  else body.append("file", file);

  return apiFetch<StagedProductWorkflowImage>("/product-workflows/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
  });
}

export function productWorkflowImageUpdateFields(
  imagePath?: string | null
): { imagePath?: string | null } {
  if (imagePath) return { imagePath };
  return {};
}

export function createProductWorkflow(
  accessToken: string,
  payload: CreateProductWorkflowPayload
) {
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

export function listProductWorkflowsByProduct(
  accessToken: string,
  productId: string
) {
  return apiFetch<ProductWorkflow[]>(`/product-workflows/product/${productId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
