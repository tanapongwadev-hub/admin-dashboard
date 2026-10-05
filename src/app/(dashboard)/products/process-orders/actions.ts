"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  advanceProductionOrderPacket,
  createProductionOrder,
  getProductionOrder,
  type ProductionOrderDetail,
} from "@/lib/api/production-orders";
import {
  redirectIfSessionExpired,
  redirectMissingSession,
} from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type ProductionOrderActionResult =
  | { status: "success"; order: ProductionOrderDetail }
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

function revalidateOrderPaths() {
  try {
    revalidatePath("/products/process-orders");
  } catch {
    /* best-effort in unit tests */
  }
}

export async function performCreateProductionOrder(
  accessToken: string,
  productionPlanId: string,
): Promise<ProductionOrderActionResult> {
  try {
    const order = await createProductionOrder(accessToken, productionPlanId);
    revalidateOrderPaths();
    return { status: "success", order };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performAdvanceProductionOrderPacket(
  accessToken: string,
  packetId: string,
): Promise<ProductionOrderActionResult> {
  try {
    const order = await advanceProductionOrderPacket(accessToken, packetId);
    revalidateOrderPaths();
    return { status: "success", order };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performGetProductionOrder(
  accessToken: string,
  id: string,
): Promise<ProductionOrderActionResult> {
  try {
    return { status: "success", order: await getProductionOrder(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function createProductionOrderAction(productionPlanId: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performCreateProductionOrder(token, productionPlanId);
}

export async function advanceProductionOrderPacketAction(packetId: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performAdvanceProductionOrderPacket(token, packetId);
}

export async function getProductionOrderAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performGetProductionOrder(token, id);
}
