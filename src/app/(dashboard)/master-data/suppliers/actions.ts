"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  restoreSupplier,
  type Supplier,
  type SupplierPayload,
  type UpdateSupplierPayload,
} from "@/lib/api/suppliers";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/suppliers` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `master-data/loading-points/actions.ts`,
// `master-data/delivery-types/actions.ts`,
// `master-data/reject-reasons/actions.ts`, and
// `master-data/material-models/actions.ts` — the helpers take
// `accessToken` as a parameter so tests can call them directly with a
// controlled token without mocking `next/headers`. `revalidatePath` is
// wrapped in its own try-catch (best-effort) so a revalidation failure
// never downgrades a successful save to an error toast (see
// `materials/pc/actions.ts` for the same reasoning).

export type SupplierActionResult =
  | { status: "success"; supplier: Supplier }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type SupplierActionFailure = Exclude<SupplierActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): SupplierActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลผู้จัดจำหน่ายนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateSuppliersPath() {
  revalidatePath("/master-data/suppliers");
}

export async function performCreateSupplier(
  accessToken: string,
  payload: SupplierPayload
): Promise<SupplierActionResult> {
  let supplier: Supplier;
  try {
    supplier = await createSupplier(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateSuppliersPath(); } catch { /* best-effort */ }
  return { status: "success", supplier };
}

export async function performUpdateSupplier(
  accessToken: string,
  id: string,
  payload: UpdateSupplierPayload
): Promise<SupplierActionResult> {
  let supplier: Supplier;
  try {
    supplier = await updateSupplier(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateSuppliersPath(); } catch { /* best-effort */ }
  return { status: "success", supplier };
}

export async function performDeactivateSupplier(
  accessToken: string,
  id: string
): Promise<SupplierActionResult> {
  let supplier: Supplier;
  try {
    supplier = await deactivateSupplier(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateSuppliersPath(); } catch { /* best-effort */ }
  return { status: "success", supplier };
}

export async function performRestoreSupplier(
  accessToken: string,
  id: string
): Promise<SupplierActionResult> {
  let supplier: Supplier;
  try {
    supplier = await restoreSupplier(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateSuppliersPath(); } catch { /* best-effort */ }
  return { status: "success", supplier };
}

export async function createSupplierAction(payload: SupplierPayload): Promise<SupplierActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateSupplier(accessToken, payload);
}

export async function updateSupplierAction(
  id: string,
  payload: UpdateSupplierPayload
): Promise<SupplierActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateSupplier(accessToken, id, payload);
}

export async function deactivateSupplierAction(id: string): Promise<SupplierActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateSupplier(accessToken, id);
}

export async function restoreSupplierAction(id: string): Promise<SupplierActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreSupplier(accessToken, id);
}
