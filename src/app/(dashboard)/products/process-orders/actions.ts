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
  closeRemainingAtStep,
  generatePackages,
  getAllocationPreview,
  getLineBoard,
  getLineHistory,
  listLotPackages,
  produceAtStep,
  reverseLotRequest,
  transferFromStep,
  type AllocationPreview,
  type HistoryEntry,
  type LineBoard,
  type PackageView,
  type ProducePayload,
  type TransferPayload,
} from "@/lib/api/production-lots";
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
  trackingModel: "PACKET" | "LOT" = "PACKET",
): Promise<ProductionOrderActionResult> {
  try {
    const order = await createProductionOrder(accessToken, productionPlanId, trackingModel);
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

export async function createProductionOrderAction(
  productionPlanId: string,
  trackingModel: "PACKET" | "LOT" = "PACKET",
) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performCreateProductionOrder(token, productionPlanId, trackingModel);
}

// ---------------------------------------------------------------- lot model
// Each mutation returns the fresh Process Board of the line so the page can
// swap one line's board in place (no full-page revalidate, same reasoning as
// packet advance above).

export type LotActionResult<T> =
  | { status: "success"; result: T; board: LineBoard }
  | { status: "error"; message: string };

async function withBoard<T>(
  lineId: string,
  run: (token: string) => Promise<T>,
): Promise<LotActionResult<T>> {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  try {
    const result = await run(token);
    return { status: "success", result, board: await getLineBoard(token, lineId) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function produceLotAction(lineId: string, stepIndex: number, payload: ProducePayload) {
  return withBoard(lineId, (token) => produceAtStep(token, lineId, stepIndex, payload));
}

export async function transferLotAction(lineId: string, stepIndex: number, payload: TransferPayload) {
  return withBoard(lineId, (token) => transferFromStep(token, lineId, stepIndex, payload));
}

export async function generatePackagesAction(
  lineId: string,
  payload: { requestId: string; fgLotId: string; qty?: number; packSize?: number },
) {
  return withBoard(lineId, (token) => generatePackages(token, payload));
}

export async function getLineHistoryAction(
  lineId: string,
): Promise<{ status: "success"; history: HistoryEntry[] } | { status: "error"; message: string }> {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  try {
    return { status: "success", history: await getLineHistory(token, lineId) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function closeRemainingLotAction(
  lineId: string,
  stepIndex: number,
  payload: { requestId: string; qty?: number; reason: string },
) {
  return withBoard(lineId, (token) => closeRemainingAtStep(token, lineId, stepIndex, payload));
}

export async function reverseLotRequestAction(
  lineId: string,
  targetRequestId: string,
  payload: { requestId: string; reason: string },
) {
  return withBoard(lineId, (token) => reverseLotRequest(token, lineId, targetRequestId, payload));
}

export async function getAllocationPreviewAction(
  lineId: string,
  stepIndex: number,
): Promise<{ status: "success"; preview: AllocationPreview } | { status: "error"; message: string }> {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  try {
    return { status: "success", preview: await getAllocationPreview(token, lineId, stepIndex) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function listLotPackagesAction(
  lotId: string,
): Promise<{ status: "success"; packages: PackageView[] } | { status: "error"; message: string }> {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  try {
    return { status: "success", packages: await listLotPackages(token, lotId) };
  } catch (err) {
    return errorResult(err);
  }
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
