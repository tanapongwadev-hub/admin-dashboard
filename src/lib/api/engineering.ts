import { apiFetch } from './client';
import type { Bom, CreateBomItemPayload } from './boms';
import type { ProductWorkflow, CreateProductWorkflowStepPayload } from './product-workflows';

export type EngineeringScope = 'materials' | 'products';

export function listMaterialIdsWithBom(token: string) {
  return apiFetch<string[]>('/material-engineering/materials/with-bom', { headers: { Authorization: `Bearer ${token}` } });
}
export type EngineeringKind = 'bom' | 'workflow';
export type EngineeringVersion = {
  id: string; version: string; status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'; createdAt: string;
  specification?: string | null; remark?: string | null; items?: Bom['items']; steps?: ProductWorkflow['steps'];
};
export type EngineeringPayload = {
  specification?: string; remark?: string;
  items?: CreateBomItemPayload[]; steps?: CreateProductWorkflowStepPayload[];
};

export function engineeringPermission(scope: EngineeringScope, kind: EngineeringKind, action: 'VIEW' | 'CREATE' | 'UPDATE') {
  return `${scope === 'materials' ? kind === 'bom' ? 'MATERIAL_BOMS' : 'MATERIAL_WORKFLOWS' : kind === 'bom' ? 'BOMS' : 'PRODUCT_WORKFLOWS'}_${action}`;
}

function endpoint(scope: EngineeringScope, kind: EngineeringKind) {
  return scope === 'materials' ? `/material-engineering/${kind === 'bom' ? 'boms' : 'workflows'}` : kind === 'bom' ? '/boms' : '/product-workflows';
}

export function listEngineeringVersions(token: string, scope: EngineeringScope, kind: EngineeringKind, ownerId: string) {
  const url = scope === 'materials' ? `/material-engineering/materials/${encodeURIComponent(ownerId)}/${kind === 'bom' ? 'boms' : 'workflows'}` : `${endpoint(scope, kind)}/product/${encodeURIComponent(ownerId)}`;
  return apiFetch<EngineeringVersion[]>(url, { headers: { Authorization: `Bearer ${token}` } });
}

export function createEngineeringVersion(token: string, scope: EngineeringScope, kind: EngineeringKind, ownerId: string, payload: EngineeringPayload) {
  return apiFetch<{ id: string }>(endpoint(scope, kind), {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ...payload, [scope === 'materials' ? 'materialId' : 'productId']: ownerId }),
  });
}

// Edit and permanent delete are refused by the API for an ACTIVE version.
export function updateEngineeringVersion(token: string, scope: EngineeringScope, kind: EngineeringKind, id: string, payload: EngineeringPayload) {
  const url = scope === 'materials' ? `${endpoint(scope, kind)}/${encodeURIComponent(id)}` : `${endpoint(scope, kind)}/${encodeURIComponent(id)}/content`;
  return apiFetch<unknown>(url, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(kind === 'bom' ? { specification: payload.specification, remark: payload.remark, items: payload.items } : { remark: payload.remark, steps: payload.steps }),
  });
}

export function deleteEngineeringVersion(token: string, scope: EngineeringScope, kind: EngineeringKind, id: string) {
  return apiFetch<unknown>(`${endpoint(scope, kind)}/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
}

export function activateEngineeringVersion(token: string, scope: EngineeringScope, kind: EngineeringKind, id: string) {
  return apiFetch<unknown>(`${endpoint(scope, kind)}/${encodeURIComponent(id)}/activate`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
}
