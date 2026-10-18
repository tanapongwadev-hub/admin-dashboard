"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

// One shared "ลบถาวร" Server Action for every simple master. The resource key
// is checked against this allow-list, so the client can never aim the DELETE at
// another path. cps-api (MasterPermanentDeleteModule) refuses with a Thai 409
// while anything still references the row; that message is shown as-is.
const TARGETS: Record<string, { api: string; page: string }> = {
  category: { api: "/categories", page: "/master-data/categories" },
  customer: { api: "/customers", page: "/master-data/customers" },
  "delivery-type": { api: "/delivery-types", page: "/master-data/delivery-types" },
  "loading-point": { api: "/loading-points", page: "/master-data/loading-points" },
  location: { api: "/locations", page: "/master-data/locations" },
  "material-model": { api: "/material-models", page: "/master-data/material-models" },
  organization: { api: "/organizations", page: "/master-data/organizations" },
  "process-line": { api: "/process-lines", page: "/master-data/process-lines" },
  "process-step": { api: "/process-steps", page: "/master-data/process-steps" },
  "product-model": { api: "/product-models", page: "/master-data/product-models" },
  "product-type": { api: "/product-types", page: "/master-data/product-types" },
  "reject-reason": { api: "/reject-reasons", page: "/master-data/reject-reasons" },
  status: { api: "/status-items", page: "/master-data/statuses" },
  unit: { api: "/units", page: "/master-data/units" },
};

export type MasterDeleteResult =
  | { status: "success" }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export async function deleteMasterDataPermanentlyAction(resourceKey: string, id: string): Promise<MasterDeleteResult> {
  const target = TARGETS[resourceKey];
  if (!target || !/^[1-9]\d*$/.test(id)) return { status: "error", message: "ไม่รองรับการลบถาวรสำหรับรายการนี้" };
  const accessToken = (await cookies()).get("accessToken")?.value;
  if (!accessToken) redirectMissingSession();
  try {
    await apiFetch(`${target.api}/${id}/permanent`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    redirectIfSessionExpired(err);
    if (err instanceof ApiError) {
      return { status: err.status === 409 ? "conflict" : "error", message: apiErrorMessage(err) };
    }
    return { status: "error", message: CONNECTION_ERROR_MESSAGE };
  }
  try {
    revalidatePath(target.page);
  } catch {
    /* best-effort */
  }
  return { status: "success" };
}
