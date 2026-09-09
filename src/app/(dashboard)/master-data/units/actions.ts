"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createUnit,
  updateUnit,
  deactivateUnit,
  restoreUnit,
  type Unit,
  type UnitPayload,
  type UpdateUnitPayload,
} from "@/lib/api/units";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/units` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `master-data/loading-points/actions.ts`,
// `master-data/delivery-types/actions.ts`,
// `master-data/reject-reasons/actions.ts`,
// `master-data/material-models/actions.ts`, and
// `master-data/suppliers/actions.ts` — the helpers take
// `accessToken` as a parameter so tests can call them directly with a
// controlled token without mocking `next/headers`. `revalidatePath` is
// wrapped in its own try-catch (best-effort) so a revalidation failure
// never downgrades a successful save to an error toast.

export type UnitActionResult =
  | { status: "success"; unit: Unit }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type UnitActionFailure = Exclude<UnitActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): UnitActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลหน่วยนับนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateUnitsPath() {
  revalidatePath("/master-data/units");
}

export async function performCreateUnit(
  accessToken: string,
  payload: UnitPayload
): Promise<UnitActionResult> {
  let unit: Unit;
  try {
    unit = await createUnit(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateUnitsPath(); } catch { /* best-effort */ }
  return { status: "success", unit };
}

export async function performUpdateUnit(
  accessToken: string,
  id: string,
  payload: UpdateUnitPayload
): Promise<UnitActionResult> {
  let unit: Unit;
  try {
    unit = await updateUnit(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateUnitsPath(); } catch { /* best-effort */ }
  return { status: "success", unit };
}

export async function performDeactivateUnit(
  accessToken: string,
  id: string
): Promise<UnitActionResult> {
  let unit: Unit;
  try {
    unit = await deactivateUnit(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateUnitsPath(); } catch { /* best-effort */ }
  return { status: "success", unit };
}

export async function performRestoreUnit(
  accessToken: string,
  id: string
): Promise<UnitActionResult> {
  let unit: Unit;
  try {
    unit = await restoreUnit(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateUnitsPath(); } catch { /* best-effort */ }
  return { status: "success", unit };
}

export async function createUnitAction(payload: UnitPayload): Promise<UnitActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateUnit(accessToken, payload);
}

export async function updateUnitAction(
  id: string,
  payload: UpdateUnitPayload
): Promise<UnitActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateUnit(accessToken, id, payload);
}

export async function deactivateUnitAction(id: string): Promise<UnitActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateUnit(accessToken, id);
}

export async function restoreUnitAction(id: string): Promise<UnitActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreUnit(accessToken, id);
}
