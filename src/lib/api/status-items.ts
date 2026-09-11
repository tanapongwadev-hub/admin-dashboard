import { createResourceApi, type BaseListParams, type PaginatedResult } from "./create-resource-api";

export type StatusItemColor = "info" | "success" | "warning" | "danger" | "muted";

export interface StatusItem {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  color: StatusItemColor;
  module: string;
  isDefault: boolean;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListStatusItemsParams extends BaseListParams {
  module?: string;
  sortBy?: "code" | "nameTh" | "module" | "sortOrder" | "isActive" | "createdAt" | "updatedAt";
}

export type PaginatedStatusItems = PaginatedResult<StatusItem>;

export interface StatusItemPayload {
  code: string;
  nameTh: string;
  nameEn?: string | null;
  color: StatusItemColor;
  module: string;
  isDefault?: boolean;
  sortOrder?: number;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateStatusItemPayload extends Partial<StatusItemPayload> {
  updatedAt: string;
}

const api = createResourceApi<StatusItem, StatusItemPayload, UpdateStatusItemPayload, ListStatusItemsParams>(
  "/status-items"
);

export const listStatusItems = api.list;
export const getStatusItem = api.get;
export const createStatusItem = api.create;
export const updateStatusItem = api.update;
export const deactivateStatusItem = api.deactivate;
export const restoreStatusItem = api.restore;
