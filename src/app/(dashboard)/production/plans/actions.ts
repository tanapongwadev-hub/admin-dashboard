"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  approveProductionPlan,
  cancelProductionPlan,
  createProductionPlan,
  deleteProductionPlan,
  getProductionPlan,
  importProductionPlan,
  updateProductionPlan,
  type ProductionPlan,
  type ProductionPlanPayload,
  type ProductionPlanShortfall,
} from "@/lib/api/production-plans";
import {
  redirectIfSessionExpired,
  redirectMissingSession,
} from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type ProductionPlanActionResult =
  | { status: "success"; plan: ProductionPlan }
  | {
      status: "error";
      message: string;
      shortfalls?: ProductionPlanShortfall[];
    };
export type ProductionPlanVoidActionResult =
  { status: "success" } | { status: "error"; message: string };

async function token() {
  return (await cookies()).get("accessToken")?.value ?? null;
}

function failure(
  error: unknown,
): Extract<ProductionPlanActionResult, { status: "error" }> {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) {
    const body = error.body as
      | { message?: string | string[]; shortfalls?: ProductionPlanShortfall[] }
      | undefined;
    return {
      status: "error",
      message: apiErrorMessage(error),
      shortfalls: body?.shortfalls,
    };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function refreshed() {
  try {
    revalidatePath("/production/plans");
  } catch {
    /* best effort in unit tests */
  }
}

export async function createProductionPlanAction(
  payload: ProductionPlanPayload,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    const plan = await createProductionPlan(accessToken, payload);
    refreshed();
    return { status: "success", plan };
  } catch (error) {
    return failure(error);
  }
}

export async function updateProductionPlanAction(
  id: string,
  payload: ProductionPlanPayload,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    const plan = await updateProductionPlan(accessToken, id, payload);
    refreshed();
    return { status: "success", plan };
  } catch (error) {
    return failure(error);
  }
}

export async function importProductionPlanAction(
  formData: FormData,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { status: "error", message: "กรุณาเลือกไฟล์ Excel" };
  try {
    const plan = await importProductionPlan(
      accessToken,
      file,
      String(formData.get("title") ?? ""),
      String(formData.get("remark") ?? ""),
    );
    refreshed();
    return { status: "success", plan };
  } catch (error) {
    return failure(error);
  }
}

async function transition(
  id: string,
  operation: (accessToken: string, id: string) => Promise<ProductionPlan>,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    const plan = await operation(accessToken, id);
    refreshed();
    return { status: "success", plan };
  } catch (error) {
    return failure(error);
  }
}

export async function approveProductionPlanAction(id: string) {
  return transition(id, approveProductionPlan);
}
// Issuing now happens from the linked Material Job Order — see
// app/(dashboard)/materials/job-orders/actions.ts#issueMaterialJobOrderAction.

export async function cancelProductionPlanAction(
  id: string,
  reason: string,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    const plan = await cancelProductionPlan(accessToken, id, reason);
    refreshed();
    return { status: "success", plan };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProductionPlanAction(
  id: string,
): Promise<ProductionPlanVoidActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    await deleteProductionPlan(accessToken, id);
    refreshed();
    return { status: "success" };
  } catch (error) {
    return failure(error);
  }
}

export async function getProductionPlanAction(
  id: string,
): Promise<ProductionPlanActionResult> {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  try {
    return {
      status: "success",
      plan: await getProductionPlan(accessToken, id),
    };
  } catch (error) {
    return failure(error);
  }
}
