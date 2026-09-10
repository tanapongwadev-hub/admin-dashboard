import { apiFetch } from "./client";

// The one real seam behind all 7 "simple master" resources (categories,
// loading-points, delivery-types, reject-reasons, material-models,
// suppliers, units) — see AGENTS.md § the master-data CRUD recipe. Every
// one of those resources' `lib/api/*.ts` files had the exact same 6
// functions (list/get/create/update/deactivate/restore) differing only in
// field shapes and the URL base path; diffing two of them after renaming
// the resource away showed the code was byte-identical. This factory is
// that shared implementation; each resource's own file now only declares
// its real domain difference (field types) and binds them to one call here.
//
// Deliberately scoped to the "simple master" shape only — Materials PC,
// Products, and Material Receiving each have real per-resource behavior
// (image upload, BOM/workflow sub-resources, box/QR generation) that would
// make forcing them through this same factory a net loss, not a win. Don't
// widen this to cover those.

export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

// The list params every simple-master resource shares. Each resource's own
// file narrows `sortBy` to its own real field-name union on top of this —
// see e.g. loading-points.ts's `ListLoadingPointsParams`.
export interface BaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Keeps `undefined`/`null`/`""` out of the query string but keeps an
// explicit `false` in it — `isActive: false` is a real filter (inactive
// rows only), not "unset". Same contract every resource's own
// `buildQueryString` had before this factory existed; order of params in
// the resulting query string is not guaranteed to match the old per-file
// versions, but no test (or backend) depends on param order.
function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  return query.toString();
}

/**
 * Builds the 6 standard REST functions for one simple-master resource at
 * `basePath` (e.g. `/loading-points`). `TEntity`/`TPayload`/`TUpdatePayload`
 * carry each resource's real field shape; `TListParams` narrows `sortBy` to
 * that resource's real sortable field names.
 *
 * Soft-delete contract (matches every simple master in
 * cps-api/API_ENDPOINTS.md § 5.1): `deactivate` is `DELETE {basePath}/{id}`
 * (sets `isActive: false`, never a hard delete — the UI must label this
 * "ปิดใช้งาน", never "ลบ"); `restore` is `PATCH {basePath}/{id}/restore`.
 * `update`'s payload must carry the row's current `updatedAt` for optimistic
 * concurrency (a stale value 409s) — enforced by each resource's own
 * `UpdateXPayload` type extending `{ updatedAt: string }`, not by this factory.
 */
export function createResourceApi<
  TEntity,
  TPayload,
  TUpdatePayload,
  TListParams extends BaseListParams = BaseListParams,
>(basePath: string) {
  function list(accessToken: string, params: TListParams = {} as TListParams) {
    const qs = buildQueryString(params as Record<string, unknown>);
    return apiFetch<PaginatedResult<TEntity>>(`${basePath}${qs ? `?${qs}` : ""}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  function get(accessToken: string, id: string) {
    return apiFetch<TEntity>(`${basePath}/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  function create(accessToken: string, payload: TPayload) {
    return apiFetch<TEntity>(basePath, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  }

  function update(accessToken: string, id: string, payload: TUpdatePayload) {
    return apiFetch<TEntity>(`${basePath}/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
  }

  function deactivate(accessToken: string, id: string) {
    return apiFetch<TEntity>(`${basePath}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  function restore(accessToken: string, id: string) {
    return apiFetch<TEntity>(`${basePath}/${id}/restore`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  return { list, get, create, update, deactivate, restore };
}
