"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  issueSalesJobOrder,
  pickSalesJobOrder,
  printSalesJobOrder,
  updateSalesOrder,
  type SalesJobOrderDetail,
  type SalesOrderDetail,
  type SalesOrderPayload,
  type SalesShortfall,
} from "@/lib/api/sales";
import {
  redirectIfSessionExpired,
  redirectMissingSession,
} from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

// Same perform*/public-wrapper split as the other action files: perform*
// takes the access token so it is testable without mocking next/headers.

export type SalesActionError = {
  status: "error";
  message: string;
  shortfalls?: SalesShortfall[];
};
export type SalesOrderActionResult =
  | { status: "success"; order: SalesOrderDetail }
  | SalesActionError;
export type SalesDeleteActionResult = { status: "success" } | SalesActionError;
export type SalesJobOrderActionResult =
  | { status: "success"; jobOrder: SalesJobOrderDetail }
  | SalesActionError;

async function token() {
  return (await cookies()).get("accessToken")?.value ?? null;
}

function failure(error: unknown): SalesActionError {
  redirectIfSessionExpired(error);
  if (error instanceof ApiError) {
    const body = error.body as { shortfalls?: SalesShortfall[] } | undefined;
    return {
      status: "error",
      message: apiErrorMessage(error),
      shortfalls: body?.shortfalls,
    };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function refresh(jobOrderId?: string) {
  try {
    revalidatePath("/sales/orders");
    revalidatePath("/sales/job-orders");
    if (jobOrderId) revalidatePath(`/sales/job-orders/${jobOrderId}`);
    revalidatePath("/reports/sales");
    revalidatePath("/engineering/products");
  } catch {
    /* best-effort outside a request scope */
  }
}

// ------------------------------------------------------------- sales orders

export async function performGetSalesOrder(accessToken: string, id: string): Promise<SalesOrderActionResult> {
  try {
    return { status: "success", order: await getSalesOrder(accessToken, id) };
  } catch (error) {
    return failure(error);
  }
}

export async function performSaveSalesOrder(
  accessToken: string,
  id: string | null,
  payload: SalesOrderPayload,
  version?: number,
): Promise<SalesOrderActionResult> {
  try {
    const order = id
      ? await updateSalesOrder(accessToken, id, { ...payload, version: version ?? 0 })
      : await createSalesOrder(accessToken, payload);
    refresh();
    return { status: "success", order };
  } catch (error) {
    return failure(error);
  }
}

export async function performDeleteSalesOrder(
  accessToken: string,
  id: string,
  version: number,
): Promise<SalesDeleteActionResult> {
  try {
    await deleteSalesOrder(accessToken, id, version);
    refresh();
    return { status: "success" };
  } catch (error) {
    return failure(error);
  }
}

export async function performConfirmSalesOrder(
  accessToken: string,
  id: string,
  version: number,
): Promise<SalesOrderActionResult> {
  try {
    const order = await confirmSalesOrder(accessToken, id, version);
    refresh();
    return { status: "success", order };
  } catch (error) {
    return failure(error);
  }
}

export async function performCancelSalesOrder(
  accessToken: string,
  id: string,
  payload: { version: number; reason: string },
): Promise<SalesOrderActionResult> {
  try {
    const order = await cancelSalesOrder(accessToken, id, payload);
    refresh(order.jobOrder?.id);
    return { status: "success", order };
  } catch (error) {
    return failure(error);
  }
}

export async function getSalesOrderAction(id: string) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performGetSalesOrder(accessToken, id);
}

export async function saveSalesOrderAction(
  id: string | null,
  payload: SalesOrderPayload,
  version?: number,
) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performSaveSalesOrder(accessToken, id, payload, version);
}

export async function deleteSalesOrderAction(id: string, version: number) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performDeleteSalesOrder(accessToken, id, version);
}

export async function confirmSalesOrderAction(id: string, version: number) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performConfirmSalesOrder(accessToken, id, version);
}

export async function cancelSalesOrderAction(
  id: string,
  payload: { version: number; reason: string },
) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performCancelSalesOrder(accessToken, id, payload);
}

// --------------------------------------------------------- sales job orders

export async function performPrintSalesJobOrder(
  accessToken: string,
  id: string,
): Promise<SalesJobOrderActionResult> {
  try {
    const jobOrder = await printSalesJobOrder(accessToken, id);
    refresh(id);
    return { status: "success", jobOrder };
  } catch (error) {
    return failure(error);
  }
}

export async function performPickSalesJobOrder(
  accessToken: string,
  id: string,
  payload: { version: number; qrCode: string },
): Promise<SalesJobOrderActionResult> {
  try {
    const jobOrder = await pickSalesJobOrder(accessToken, id, payload);
    refresh(id);
    return { status: "success", jobOrder };
  } catch (error) {
    return failure(error);
  }
}

export async function performIssueSalesJobOrder(
  accessToken: string,
  id: string,
  payload: {
    version: number;
    requestId: string;
    items: Array<{ reservationId: string; quantity: number }>;
  },
): Promise<SalesJobOrderActionResult> {
  try {
    const jobOrder = await issueSalesJobOrder(accessToken, id, payload);
    refresh(id);
    return { status: "success", jobOrder };
  } catch (error) {
    return failure(error);
  }
}

export async function printSalesJobOrderAction(id: string) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performPrintSalesJobOrder(accessToken, id);
}

export async function pickSalesJobOrderAction(
  id: string,
  payload: { version: number; qrCode: string },
) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performPickSalesJobOrder(accessToken, id, payload);
}

export async function issueSalesJobOrderAction(
  id: string,
  payload: {
    version: number;
    requestId: string;
    items: Array<{ reservationId: string; quantity: number }>;
  },
) {
  const accessToken = await token();
  if (!accessToken) redirectMissingSession();
  return performIssueSalesJobOrder(accessToken, id, payload);
}
