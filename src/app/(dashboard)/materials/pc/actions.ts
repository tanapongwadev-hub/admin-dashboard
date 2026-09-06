"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterial,
  updateMaterial,
  deactivateMaterial,
  restoreMaterial,
  uploadMaterialImage,
  type Material,
  type MaterialPayload,
  type StagedMaterialImage,
  type UpdateMaterialPayload,
} from "@/lib/api/materials";
import { ApiError } from "@/lib/api/client";

export type MaterialActionResult =
  | { status: "success"; material: Material }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

type MaterialActionFailure = Exclude<MaterialActionResult, { status: "success" }>;

export type MaterialImageUploadActionResult =
  | { status: "success"; image: StagedMaterialImage }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): MaterialActionFailure {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return {
        status: "conflict",
        message: "ข้อมูลวัสดุนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

// Original `uploadMaterialPcImageAction` (lines 49-69 in the prior
// version) was moved to the end of this file as a thin cookie-reading
// wrapper around `performUploadMaterialImage` — see below.

// `perform*` helpers below are the testable inner functions — the public
// `*PcAction` exports are thin cookie-reading wrappers around them. The
// helpers take the accessToken as a parameter (instead of reading cookies
// themselves) so tests can call them directly with a controlled token
// without needing to mock `next/headers` (Node 24's `t.mock.module` is
// behind the `--experimental-test-module-mocks` flag and not reliably
// available across test runners, and the project already mocks
// `globalThis.fetch` for the API layer). The cookie-reading wrapper
// itself is one line and is covered by manual / live verification.
//
// `revalidatePath` is wrapped in its own try-catch (NOT in the API call's
// catch block) because: (1) it's a best-effort cache invalidation, not a
// data-mutating API call — if it throws, the data is already saved and
// the user should still see success; (2) the previous code (where the
// same try-catch caught both the API error AND revalidatePath) would
// report a misleading "connection failed" message when only the
// revalidation failed; (3) the wrapped try-catch also makes the action
// testable without mocking `next/cache` (revalidatePath throws when called
// outside a Next.js request scope, e.g. in a unit test — without this
// wrapper every success-path test would fail with the connection-failed
// message).

export async function performCreateMaterial(
  accessToken: string,
  payload: MaterialPayload
): Promise<MaterialActionResult> {
  let material: Material;
  try {
    material = await createMaterial(accessToken, { ...payload, type: "PC" });
  } catch (err) {
    return errorResult(err);
  }
  try { revalidatePath("/materials/pc"); } catch { /* best-effort */ }
  return { status: "success", material };
}

export async function performUpdateMaterial(
  accessToken: string,
  id: string,
  payload: UpdateMaterialPayload
): Promise<MaterialActionResult> {
  let material: Material;
  try {
    material = await updateMaterial(accessToken, id, payload);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidatePath("/materials/pc"); } catch { /* best-effort */ }
  return { status: "success", material };
}

export async function performDeactivateMaterial(
  accessToken: string,
  id: string
): Promise<MaterialActionResult> {
  let material: Material;
  try {
    material = await deactivateMaterial(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidatePath("/materials/pc"); } catch { /* best-effort */ }
  return { status: "success", material };
}

export async function performRestoreMaterial(
  accessToken: string,
  id: string
): Promise<MaterialActionResult> {
  let material: Material;
  try {
    material = await restoreMaterial(accessToken, id);
  } catch (err) {
    return errorResult(err);
  }
  try { revalidatePath("/materials/pc"); } catch { /* best-effort */ }
  return { status: "success", material };
}

export async function performUploadMaterialImage(
  accessToken: string,
  formData: FormData
): Promise<MaterialImageUploadActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "กรุณาเลือกรูปภาพวัสดุ" };
  }

  try {
    const image = await uploadMaterialImage(accessToken, file, file.name);
    return { status: "success", image };
  } catch (err) {
    const result = errorResult(err);
    return { status: "error", message: result.message };
  }
}

export async function createMaterialPcAction(payload: MaterialPayload): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performCreateMaterial(accessToken, payload);
}

export async function updateMaterialPcAction(
  id: string,
  payload: UpdateMaterialPayload
): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performUpdateMaterial(accessToken, id, payload);
}

export async function deactivateMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performDeactivateMaterial(accessToken, id);
}

export async function restoreMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  return performRestoreMaterial(accessToken, id);
}

export async function uploadMaterialPcImageAction(
  formData: FormData
): Promise<MaterialImageUploadActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }
  return performUploadMaterialImage(accessToken, formData);
}
