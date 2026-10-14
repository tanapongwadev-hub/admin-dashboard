"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { createMaterialProcessing, getProcessingHistory, getProcessingOutput, type ProcessingPayload } from "@/lib/api/material-processing";
import { getCurrentSession } from "@/lib/session";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

async function accessToken(permission: string) {
  const session = await getCurrentSession();
  if (!session) redirectMissingSession();
  if (!session.user.isSuperAdmin && !session.permissions.includes(permission)) return null;
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) redirectMissingSession();
  return token;
}
function failure(error: unknown): { status: "error"; message: string } {
  redirectIfSessionExpired(error);
  return { status: "error", message: error instanceof ApiError ? apiErrorMessage(error) : CONNECTION_ERROR_MESSAGE };
}

export async function processMaterialAction(payload: ProcessingPayload) {
  const token = await accessToken("MATERIAL_PROCESSING_CREATE");
  if (!token) return { status: "error" as const, message: "คุณไม่มีสิทธิ์แปรรูปวัตถุดิบ" };
  try {
    const processing = await createMaterialProcessing(token, payload);
    for (const path of ["/material-processing", "/materials/receiving", "/materials/catalog", "/reports/materials", "/materials"]) revalidatePath(path);
    return { status: "success" as const, processing };
  } catch (error) { return failure(error); }
}
export async function processingHistoryAction(id: string) {
  const token = await accessToken("MATERIAL_PROCESSING_VIEW");
  if (!token) return { status: "error" as const, message: "คุณไม่มีสิทธิ์ดูประวัติแปรรูป" };
  try { return { status: "success" as const, history: await getProcessingHistory(token, id) }; }
  catch (error) { return failure(error); }
}
export async function processingOutputAction(id: string) {
  const token = await accessToken("MATERIAL_PROCESSING_VIEW");
  if (!token) return { status: "error" as const, message: "คุณไม่มีสิทธิ์ดูล็อตหลังแปรรูป" };
  try { return { status: "success" as const, receiving: await getProcessingOutput(token, id) }; }
  catch (error) { return failure(error); }
}
