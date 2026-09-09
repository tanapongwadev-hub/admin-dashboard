"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createRejectReason,
  updateRejectReason,
  deactivateRejectReason,
  restoreRejectReason,
  type RejectReason,
  type RejectReasonPayload,
  type UpdateRejectReasonPayload,
} from "@/lib/api/reject-reasons";
import { ApiError } from "@/lib/api/client";

// Server Actions for the `/master-data/reject-reasons` admin page. Same
// `perform*` helper + thin cookie-reading public-wrapper pattern as
// `master-data/loading-points/actions.ts` and
// `master-data/delivery-types/actions.ts` — the helpers take
// `accessToken` as a parameter so tests can call them directly with a
// controlled token without mocking `next/headers`. `revalidatePath` is
// wrapped in its own try-catch (best-effort) so a revalidation failure
// never downgrades a successful save to an error toast (see
// `materials/pc/actions.ts` for the same reasoning).

export type RejectReasonActionResult =
  | { status: "success"; rejectReason: RejectReason }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type RejectReasonActionFailure = Exclude<RejectReasonActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): RejectReasonActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลเหตุผลการปฏิเสธนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateRejectReasonsPath() {
  revalidatePath("/master-data/reject-reasons");
}

export async function performCreateRejectReason(
  accessToken: string,
  payload: RejectReasonPayload
): Promise<RejectReasonActionResult> {
  let rejectReason: RejectReason;
  try {
    rejectReason = await createRejectReason(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateRejectReasonsPath(); } catch { /* best-effort */ }
  return { status: "success", rejectReason };
}

export async function performUpdateRejectReason(
  accessToken: string,
  id: string,
  payload: UpdateRejectReasonPayload
): Promise<RejectReasonActionResult> {
  let rejectReason: RejectReason;
  try {
    rejectReason = await updateRejectReason(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateRejectReasonsPath(); } catch { /* best-effort */ }
  return { status: "success", rejectReason };
}

export async function performDeactivateRejectReason(
  accessToken: string,
  id: string
): Promise<RejectReasonActionResult> {
  let rejectReason: RejectReason;
  try {
    rejectReason = await deactivateRejectReason(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateRejectReasonsPath(); } catch { /* best-effort */ }
  return { status: "success", rejectReason };
}

export async function performRestoreRejectReason(
  accessToken: string,
  id: string
): Promise<RejectReasonActionResult> {
  let rejectReason: RejectReason;
  try {
    rejectReason = await restoreRejectReason(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateRejectReasonsPath(); } catch { /* best-effort */ }
  return { status: "success", rejectReason };
}

export async function createRejectReasonAction(payload: RejectReasonPayload): Promise<RejectReasonActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateRejectReason(accessToken, payload);
}

export async function updateRejectReasonAction(
  id: string,
  payload: UpdateRejectReasonPayload
): Promise<RejectReasonActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateRejectReason(accessToken, id, payload);
}

export async function deactivateRejectReasonAction(id: string): Promise<RejectReasonActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateRejectReason(accessToken, id);
}

export async function restoreRejectReasonAction(id: string): Promise<RejectReasonActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreRejectReason(accessToken, id);
}
