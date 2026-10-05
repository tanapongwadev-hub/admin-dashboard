"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  advanceProductionOrderPacket,
  closeProductionOrderRemaining,
  createProductionOrder,
  getProductionOrder,
  recordProductionOrderOutput,
  type AdvancePacketResult,
  type CloseRemainingResult,
  type ProductionOrderDetail,
  type RecordOutputPayload,
  type RecordOutputResult,
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

export type AdvancePacketActionResult =
  | { status: "success"; result: AdvancePacketResult }
  | { status: "error"; message: string };

// Deliberately no revalidatePath: in a Server Action it makes the router
// re-render the current page, i.e. re-fetch the whole order (hundreds of
// packets + QR images) after every scan. The detail page patches the one
// packet locally instead; the list pages are dynamic and re-fetch on visit.
export async function performAdvanceProductionOrderPacket(
  accessToken: string,
  packetId: string,
  quantity?: number,
): Promise<AdvancePacketActionResult> {
  try {
    return {
      status: "success",
      result: await advanceProductionOrderPacket(accessToken, packetId, quantity),
    };
  } catch (err) {
    return errorResult(err);
  }
}

// Same reasoning as advance: no revalidatePath, the detail page appends the
// new boxes / patches the line counters locally.
export type RecordOutputActionResult =
  | { status: "success"; result: RecordOutputResult }
  | { status: "error"; message: string };

export async function performRecordProductionOrderOutput(
  accessToken: string,
  lineId: string,
  payload: RecordOutputPayload,
): Promise<RecordOutputActionResult> {
  try {
    return {
      status: "success",
      result: await recordProductionOrderOutput(accessToken, lineId, payload),
    };
  } catch (err) {
    return errorResult(err);
  }
}

export type CloseRemainingActionResult =
  | { status: "success"; result: CloseRemainingResult }
  | { status: "error"; message: string };

export async function performCloseProductionOrderRemaining(
  accessToken: string,
  lineId: string,
  reason: string,
): Promise<CloseRemainingActionResult> {
  try {
    return {
      status: "success",
      result: await closeProductionOrderRemaining(accessToken, lineId, reason),
    };
  } catch (err) {
    return errorResult(err);
  }
}

export async function recordProductionOrderOutputAction(
  lineId: string,
  payload: RecordOutputPayload,
) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performRecordProductionOrderOutput(token, lineId, payload);
}

export async function closeProductionOrderRemainingAction(
  lineId: string,
  reason: string,
) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performCloseProductionOrderRemaining(token, lineId, reason);
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

export async function advanceProductionOrderPacketAction(
  packetId: string,
  quantity?: number,
) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performAdvanceProductionOrderPacket(token, packetId, quantity);
}

export async function getProductionOrderAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performGetProductionOrder(token, id);
}
