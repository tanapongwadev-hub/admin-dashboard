"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";
import { getProductStock, recordProductStock, type ProductStock, type ProductStockPayload } from "@/lib/api/product-stock";

type Result = { status: "success"; stock: ProductStock } | { status: "error"; message: string };

async function accessToken(permission: string) {
  const session = await getCurrentSession();
  if (!session) redirectMissingSession();
  if (!session.user.isSuperAdmin && !session.permissions.includes(permission)) return null;
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) redirectMissingSession();
  return token;
}

function failure(error: unknown): Result {
  redirectIfSessionExpired(error);
  return { status: "error", message: error instanceof ApiError ? apiErrorMessage(error) : CONNECTION_ERROR_MESSAGE };
}

export async function performGetProductStock(token: string, id: string): Promise<Result> {
  try { return { status: "success", stock: await getProductStock(token, id) }; }
  catch (error) { return failure(error); }
}

export async function performRecordProductStock(token: string, id: string, payload: ProductStockPayload): Promise<Result> {
  let stock: ProductStock;
  try { stock = await recordProductStock(token, id, payload); }
  catch (error) { return failure(error); }
  try { revalidatePath("/engineering/products"); revalidatePath("/engineering/products"); } catch { /* Saved already. */ }
  return { status: "success", stock };
}

export async function getProductStockAction(id: string): Promise<Result> {
  const token = await accessToken("PRODUCTS_VIEW");
  if (!token) return { status: "error", message: "คุณไม่มีสิทธิ์ดูสต็อกสินค้า" };
  return performGetProductStock(token, id);
}

export async function recordProductStockAction(id: string, payload: ProductStockPayload): Promise<Result> {
  const token = await accessToken("PRODUCTS_UPDATE");
  if (!token) return { status: "error", message: "คุณไม่มีสิทธิ์รับเข้า–จ่ายออกสินค้า" };
  return performRecordProductStock(token, id, payload);
}
