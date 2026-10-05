import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

// Master data "กระบวนการผลิต" (production process steps) used by Product
// Workflow steps (see product-workflows.ts). Mirrors cps-api's real
// `/process-steps` module — see cps-api/API_ENDPOINTS.md § 16 and
// cps-api/src/modules/process-steps/. Shape A simple master (code/nameTh/
// nameEn/description/isActive), soft delete + `updatedAt` optimistic
// concurrency. Admin CRUD page: /master-data/process-steps.

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

export interface ListProcessStepsParams extends BaseListParams {
  sortBy?: "code" | "nameTh" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedProcessSteps = PaginatedResult<ProcessStep>;

export interface ProcessStepPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateProcessStepPayload extends Partial<ProcessStepPayload> {
  // Required by cps-api's update DTO for optimistic concurrency.
  updatedAt: string;
}

const api = createResourceApi<ProcessStep, ProcessStepPayload, UpdateProcessStepPayload, ListProcessStepsParams>(
  "/process-steps"
);

export const listProcessSteps = api.list;
export const getProcessStep = api.get;
export const createProcessStep = api.create;
export const updateProcessStep = api.update;
export const deactivateProcessStep = api.deactivate;
export const restoreProcessStep = api.restore;
