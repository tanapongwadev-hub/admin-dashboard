"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getMaterialJobOrder,
  issueMaterialJobOrder,
  pickMaterialJobOrder,
  printMaterialJobOrder,
  type MaterialJobOrderDetail,
} from "@/lib/api/material-job-orders";
import { ApiError } from "@/lib/api/client";
import {
  redirectIfSessionExpired,
  redirectMissingSession,
} from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

// Same perform*/public-wrapper shape as materials-disbursement/actions.ts —
// perform* takes the accessToken as a parameter so it's testable without
// mocking next/headers, the public *Action wrapper is a thin
// cookie-reading shell.

export type MaterialJobOrderActionResult =
  | { status: "success"; jobOrder: MaterialJobOrderDetail }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): { status: "error"; message: string } {
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    return { status: "error", message: apiErrorMessage(err) };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function revalidateJobOrderPaths(id?: string) {
  try {
    revalidatePath("/materials/job-orders");
    if (id) revalidatePath(`/materials/job-orders/${id}`);
    // Approve/cancel on the Plan side embeds jobOrder.status, and issuing
    // here also flips the linked Plan to ISSUED — keep both lists fresh.
    revalidatePath("/production/plans");
  } catch {
    /* best-effort in unit tests */
  }
}

export async function performGetMaterialJobOrder(
  accessToken: string,
  id: string,
): Promise<MaterialJobOrderActionResult> {
  try {
    return { status: "success", jobOrder: await getMaterialJobOrder(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performPrintMaterialJobOrder(
  accessToken: string,
  id: string,
): Promise<MaterialJobOrderActionResult> {
  try {
    const jobOrder = await printMaterialJobOrder(accessToken, id);
    revalidateJobOrderPaths(id);
    return { status: "success", jobOrder };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performPickMaterialJobOrder(
  accessToken: string,
  id: string,
  payload: { version: number; reservationId: string; scannedCode: string },
): Promise<MaterialJobOrderActionResult> {
  try {
    const jobOrder = await pickMaterialJobOrder(accessToken, id, payload);
    revalidateJobOrderPaths(id);
    return { status: "success", jobOrder };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performIssueMaterialJobOrder(
  accessToken: string,
  id: string,
  payload: {
    version: number;
    items: Array<{ reservationId: string; quantity: string }>;
  },
): Promise<MaterialJobOrderActionResult> {
  try {
    const jobOrder = await issueMaterialJobOrder(accessToken, id, payload);
    revalidateJobOrderPaths(id);
    return { status: "success", jobOrder };
  } catch (err) {
    return errorResult(err);
  }
}

export async function getMaterialJobOrderAction(id: string) {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performGetMaterialJobOrder(accessToken, id);
}

export async function printMaterialJobOrderAction(id: string) {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performPrintMaterialJobOrder(accessToken, id);
}

export async function pickMaterialJobOrderAction(
  id: string,
  payload: { version: number; reservationId: string; scannedCode: string },
) {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performPickMaterialJobOrder(accessToken, id, payload);
}

export async function issueMaterialJobOrderAction(
  id: string,
  payload: {
    version: number;
    items: Array<{ reservationId: string; quantity: string }>;
  },
) {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performIssueMaterialJobOrder(accessToken, id, payload);
}
