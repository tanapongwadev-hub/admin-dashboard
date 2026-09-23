"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterialsDisbursement,
  updateMaterialsDisbursement,
  deleteMaterialsDisbursement,
  confirmMaterialsDisbursement,
  cancelMaterialsDisbursement,
  type MaterialsDisbursement,
  type CreateMaterialsDisbursementPayload,
  type UpdateMaterialsDisbursementPayload,
} from "@/lib/api/materials-disbursement";
import { ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

// Same perform*/public-wrapper shape as materials-receiving/actions.ts (see
// AGENTS.md § Material Receiving) — perform* takes the accessToken as a
// parameter so it's testable without mocking next/headers, the public
// *Action wrapper is a thin cookie-reading shell.

export type MaterialsDisbursementActionResult =
  | { status: "success"; disbursement: MaterialsDisbursement }
  | { status: "error"; message: string };

export type MaterialsDisbursementVoidActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): { status: "error"; message: string } {
  // Session expired mid-action (401) --> sign the user out immediately
  // instead of showing a dead-end error toast. See lib/session-expiry.ts.
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    return { status: "error", message: apiErrorMessage(err) };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function revalidateDisbursementPath() {
  try {
    revalidatePath("/materials/materials-disbursement");
  } catch {
    /* best-effort */
  }
}

export async function performCreateMaterialsDisbursement(
  accessToken: string,
  payload: CreateMaterialsDisbursementPayload
): Promise<MaterialsDisbursementActionResult> {
  try {
    const disbursement = await createMaterialsDisbursement(accessToken, payload);
    revalidateDisbursementPath();
    return { status: "success", disbursement };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performUpdateMaterialsDisbursement(
  accessToken: string,
  id: string,
  payload: UpdateMaterialsDisbursementPayload
): Promise<MaterialsDisbursementActionResult> {
  try {
    const disbursement = await updateMaterialsDisbursement(accessToken, id, payload);
    revalidateDisbursementPath();
    return { status: "success", disbursement };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performDeleteMaterialsDisbursement(
  accessToken: string,
  id: string
): Promise<MaterialsDisbursementVoidActionResult> {
  try {
    await deleteMaterialsDisbursement(accessToken, id);
    revalidateDisbursementPath();
    return { status: "success" };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performConfirmMaterialsDisbursement(
  accessToken: string,
  id: string
): Promise<MaterialsDisbursementActionResult> {
  try {
    const disbursement = await confirmMaterialsDisbursement(accessToken, id);
    revalidateDisbursementPath();
    return { status: "success", disbursement };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performCancelMaterialsDisbursement(
  accessToken: string,
  id: string,
  cancelReason: string
): Promise<MaterialsDisbursementActionResult> {
  try {
    const disbursement = await cancelMaterialsDisbursement(accessToken, id, cancelReason);
    revalidateDisbursementPath();
    return { status: "success", disbursement };
  } catch (err) {
    return errorResult(err);
  }
}

export async function createMaterialsDisbursementAction(
  payload: CreateMaterialsDisbursementPayload
): Promise<MaterialsDisbursementActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCreateMaterialsDisbursement(accessToken, payload);
}

export async function updateMaterialsDisbursementAction(
  id: string,
  payload: UpdateMaterialsDisbursementPayload
): Promise<MaterialsDisbursementActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performUpdateMaterialsDisbursement(accessToken, id, payload);
}

export async function deleteMaterialsDisbursementAction(
  id: string
): Promise<MaterialsDisbursementVoidActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performDeleteMaterialsDisbursement(accessToken, id);
}

export async function confirmMaterialsDisbursementAction(
  id: string
): Promise<MaterialsDisbursementActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performConfirmMaterialsDisbursement(accessToken, id);
}

export async function cancelMaterialsDisbursementAction(
  id: string,
  cancelReason: string
): Promise<MaterialsDisbursementActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCancelMaterialsDisbursement(accessToken, id, cancelReason);
}
