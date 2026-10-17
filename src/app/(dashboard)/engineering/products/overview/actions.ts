"use server";

import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/client";
import { getProductMovements, type ProductMovementDetail } from "@/lib/api/products-dashboard";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type ProductMovementsResult =
  | { status: "success"; detail: ProductMovementDetail }
  | { status: "error"; message: string };

// Read-only: loads the receive/issue rows of one product for the overview dialog.
export async function getProductMovementsAction(code: string, from: string, to: string): Promise<ProductMovementsResult> {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) redirectMissingSession();
  try {
    return { status: "success", detail: await getProductMovements(token, code, from, to) };
  } catch (err) {
    redirectIfSessionExpired(err);
    return { status: "error", message: err instanceof ApiError ? apiErrorMessage(err) : CONNECTION_ERROR_MESSAGE };
  }
}
