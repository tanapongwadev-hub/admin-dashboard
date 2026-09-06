"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  updateProduct,
  deactivateProduct,
  restoreProduct,
  uploadProductImage,
  type Product,
  type ProductPayload,
  type StagedProductImage,
  type UpdateProductPayload,
} from "@/lib/api/products";
import { createBom, activateBom, listBomsByProduct, type Bom, type CreateBomPayload } from "@/lib/api/boms";
import {
  createProductWorkflow,
  activateProductWorkflow,
  listProductWorkflowsByProduct,
  uploadProductWorkflowImage,
  type ProductWorkflow,
  type CreateProductWorkflowPayload,
} from "@/lib/api/product-workflows";
import { ApiError } from "@/lib/api/client";

export type ProductActionResult =
  | { status: "success"; product: Product }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export type ProductImageUploadActionResult =
  | { status: "success"; image: StagedProductImage }
  | { status: "error"; message: string };

export type BomActionResult =
  | { status: "success"; bom: Bom }
  | { status: "error"; message: string };

export type BomListActionResult =
  | { status: "success"; boms: Bom[] }
  | { status: "error"; message: string };

export type ProductWorkflowActionResult =
  | { status: "success"; workflow: ProductWorkflow }
  | { status: "error"; message: string };

export type ProductWorkflowListActionResult =
  | { status: "success"; workflows: ProductWorkflow[] }
  | { status: "error"; message: string };

type ProductActionFailure = Exclude<ProductActionResult, { status: "success" }>;

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): ProductActionFailure {
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

// `perform*` helpers — the testable inner functions. The public `*Action`
// exports below are thin cookie-reading wrappers around them (same
// pattern as `materials/pc/actions.ts`). The helpers take the accessToken
// as a parameter so tests can call them directly with a controlled token
// without needing to mock `next/headers` (Node 24's `t.mock.module` is
// behind the `--experimental-test-module-mocks` flag and not reliably
// available across test runners). `revalidatePath` is wrapped in its own
// try-catch (NOT in the API call's catch) because it's a best-effort
// cache invalidation — the API call's data is already saved by the time
// revalidation runs, so a revalidation failure must not downgrade a
// successful save to an error.

export async function performUploadProductImage(
  accessToken: string,
  formData: FormData
): Promise<ProductImageUploadActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "กรุณาเลือกรูปภาพสินค้า" };
  }
  try {
    const image = await uploadProductImage(accessToken, file, file.name);
    return { status: "success", image };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

export async function performCreateProduct(
  accessToken: string,
  payload: ProductPayload
): Promise<ProductActionResult> {
  let product: Product;
  try {
    product = await createProduct(accessToken, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateProductPaths(); } catch { /* best-effort */ }
  return { status: "success", product };
}

export async function performUpdateProduct(
  accessToken: string,
  id: string,
  payload: UpdateProductPayload
): Promise<ProductActionResult> {
  let product: Product;
  try {
    product = await updateProduct(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateProductPaths(); } catch { /* best-effort */ }
  return { status: "success", product };
}

export async function performDeactivateProduct(
  accessToken: string,
  id: string
): Promise<ProductActionResult> {
  let product: Product;
  try {
    product = await deactivateProduct(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateProductPaths(); } catch { /* best-effort */ }
  return { status: "success", product };
}

export async function performRestoreProduct(
  accessToken: string,
  id: string
): Promise<ProductActionResult> {
  let product: Product;
  try {
    product = await restoreProduct(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidateProductPaths(); } catch { /* best-effort */ }
  return { status: "success", product };
}

// BOM actions — used by the products wizard's post-create "insert BOM" step
// (see products-wizard-dialog.tsx and AGENTS.md § Products). Every create
// defaults to status: "DRAFT" server-side; "บันทึกร่าง" in the wizard calls
// only this, "บันทึกและเปิดใช้งาน" calls this then performActivateBom.
export async function performCreateBom(
  accessToken: string,
  payload: CreateBomPayload
): Promise<BomActionResult> {
  try {
    const bom = await createBom(accessToken, payload);
    return { status: "success", bom };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

export async function performActivateBom(
  accessToken: string,
  id: string
): Promise<BomActionResult> {
  try {
    const bom = await activateBom(accessToken, id);
    return { status: "success", bom };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

// Used by ProductsDetailsDialog to show a product's BOM history (see
// AGENTS.md § Products) — called client-side on demand when the dialog
// opens, not fetched upfront for the whole product list, since most viewers
// opening the list will never open this dialog for most rows.
export async function performListBomsByProduct(
  accessToken: string,
  productId: string
): Promise<BomListActionResult> {
  try {
    const boms = await listBomsByProduct(accessToken, productId);
    return { status: "success", boms };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

// Product Workflow actions — used by the products wizard's post-BOM "define
// production workflow" step (see products-wizard-dialog.tsx and AGENTS.md §
// Products). A workflow is a distinct resource from a BOM: it records the
// ordered production steps a product must go through (weld → CNC → stamp →
// polish → inspect → QC → close), not what materials it uses. Every create
// defaults to status: "DRAFT" server-side, same shape as BOM actions above.
export async function performCreateProductWorkflow(
  accessToken: string,
  payload: CreateProductWorkflowPayload
): Promise<ProductWorkflowActionResult> {
  try {
    const workflow = await createProductWorkflow(accessToken, payload);
    return { status: "success", workflow };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

export async function performActivateProductWorkflow(
  accessToken: string,
  id: string
): Promise<ProductWorkflowActionResult> {
  try {
    const workflow = await activateProductWorkflow(accessToken, id);
    return { status: "success", workflow };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

// Used by ProductsDetailsDialog to show a product's workflow history,
// mirroring listBomsByProductAction — called client-side on demand.
export async function performListProductWorkflowsByProduct(
  accessToken: string,
  productId: string
): Promise<ProductWorkflowListActionResult> {
  try {
    const workflows = await listProductWorkflowsByProduct(accessToken, productId);
    return { status: "success", workflows };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

export async function uploadProductImageAction(formData: FormData): Promise<ProductImageUploadActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performUploadProductImage(accessToken, formData);
}

export async function createProductAction(payload: ProductPayload): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateProduct(accessToken, payload);
}

export async function updateProductAction(
  id: string,
  payload: UpdateProductPayload
): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateProduct(accessToken, id, payload);
}

export async function deactivateProductAction(id: string): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateProduct(accessToken, id);
}

export async function restoreProductAction(id: string): Promise<ProductActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreProduct(accessToken, id);
}

export async function createBomAction(payload: CreateBomPayload): Promise<BomActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateBom(accessToken, payload);
}

export async function activateBomAction(id: string): Promise<BomActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performActivateBom(accessToken, id);
}

export async function listBomsByProductAction(productId: string): Promise<BomListActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performListBomsByProduct(accessToken, productId);
}

export async function createProductWorkflowAction(
  payload: CreateProductWorkflowPayload
): Promise<ProductWorkflowActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateProductWorkflow(accessToken, payload);
}

export async function activateProductWorkflowAction(id: string): Promise<ProductWorkflowActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performActivateProductWorkflow(accessToken, id);
}

export async function listProductWorkflowsByProductAction(
  productId: string
): Promise<ProductWorkflowListActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performListProductWorkflowsByProduct(accessToken, productId);
}

export type ProductWorkflowImageUploadActionResult =
  | { status: "success"; image: { imagePath: string; previewUrl: string } }
  | { status: "error"; message: string };

export async function performUploadProductWorkflowImage(
  accessToken: string,
  formData: FormData
): Promise<ProductWorkflowImageUploadActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "กรุณาเลือกรูปภาพกระบวนการผลิต" };
  }
  try {
    const image = await uploadProductWorkflowImage(accessToken, file, file.name);
    return { status: "success", image };
  } catch (err) {
    const result = errorResult(err);
    return { status: "error", message: result.message };
  }
}

export async function uploadProductWorkflowImageAction(
  formData: FormData
): Promise<ProductWorkflowImageUploadActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performUploadProductWorkflowImage(accessToken, formData);
}
