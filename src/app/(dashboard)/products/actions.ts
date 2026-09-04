"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  deactivateProduct,
  restoreProduct,
  type Product,
  type ProductPayload,
  type UpdateProductPayload,
} from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";

export type ProductActionResult =
  | { status: "success"; product: Product }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): ProductActionResult {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลสินค้านี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

function revalidateProductPaths() {
  revalidatePath("/products");
  revalidatePath("/products/list");
}

export async function createProductAction(payload: ProductPayload): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const product = await createProduct(accessToken, payload);
    revalidateProductPaths();
    return { status: "success", product };
  } catch (err) {
    return errorResult(err);
  }
}

export async function updateProductAction(
  id: string,
  payload: UpdateProductPayload
): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const product = await updateProduct(accessToken, id, payload);
    revalidateProductPaths();
    return { status: "success", product };
  } catch (err) {
    return errorResult(err);
  }
}

export async function deactivateProductAction(id: string): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const product = await deactivateProduct(accessToken, id);
    revalidateProductPaths();
    return { status: "success", product };
  } catch (err) {
    return errorResult(err);
  }
}

export async function restoreProductAction(id: string): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const product = await restoreProduct(accessToken, id);
    revalidateProductPaths();
    return { status: "success", product };
  } catch (err) {
    return errorResult(err);
  }
}
