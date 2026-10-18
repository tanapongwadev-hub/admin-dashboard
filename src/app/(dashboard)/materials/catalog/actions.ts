"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createMaterial,
  checkMaterialCodeAvailability,
  listMaterialDrafts,
  getMaterialDraft,
  saveMaterialDraft,
  deleteMaterialDraft,
  getMaterial,
  type SaveMaterialDraftPayload,
  updateMaterial,
  deactivateMaterial,
  restoreMaterial,
  uploadMaterialImage,
  type Material,
  type MaterialPayload,
  type StagedMaterialImage,
  type UpdateMaterialPayload,
} from "@/lib/api/materials";
import { listBomUsageByMaterial, type BomUsageRow } from "@/lib/api/boms";
import { ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";
import { getCurrentSession } from "@/lib/session";
import { listEngineeringVersions, type EngineeringVersion } from "@/lib/api/engineering";
import { checkMaterialDeletion, deleteMaterialPermanently, type MaterialDeletionCheck } from "@/lib/api/materials";

export type MaterialDeletionResult = { status: "success"; check: MaterialDeletionCheck } | { status: "error"; message: string };

export async function checkMaterialDeletionAction(id: string): Promise<MaterialDeletionResult> {
  const session = await getCurrentSession();
  if (!session) redirectMissingSession();
  if (!session.user.isSuperAdmin && !session.permissions.includes("MATERIAL_DELETE")) return { status: "error", message: "คุณไม่มีสิทธิ์ลบวัสดุ" };
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  try { return { status: "success", check: await checkMaterialDeletion(token, id) }; }
  catch (err) { redirectIfSessionExpired(err); return { status: "error", message: err instanceof ApiError ? apiErrorMessage(err) : CONNECTION_ERROR_MESSAGE }; }
}

export async function deleteMaterialPermanentlyAction(id: string, confirmationCode: string, includeBom = false): Promise<{ status: "success" } | { status: "error"; message: string }> {
  const session = await getCurrentSession();
  if (!session) redirectMissingSession();
  if (!session.user.isSuperAdmin && !session.permissions.includes("MATERIAL_DELETE")) return { status: "error", message: "คุณไม่มีสิทธิ์ลบวัสดุ" };
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  try { await deleteMaterialPermanently(token, id, confirmationCode, includeBom); }
  catch (err) { redirectIfSessionExpired(err); return { status: "error", message: err instanceof ApiError ? apiErrorMessage(err) : CONNECTION_ERROR_MESSAGE }; }
  try { revalidatePath("/materials"); revalidatePath("/materials/catalog"); revalidatePath("/engineering/bom/materials"); } catch { /* best-effort */ }
  return { status: "success" };
}

export type MaterialActionResult =
  | { status: "success"; material: Material }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

export type MaterialCodeCheckResult =
  | { status: "success"; available: boolean }
  | { status: "error"; message: string };

type MaterialActionFailure = Exclude<MaterialActionResult, { status: "success" }>;

export type MaterialImageUploadActionResult =
  | { status: "success"; image: StagedMaterialImage }
  | { status: "error"; message: string };

export type BomUsageListActionResult =
  | { status: "success"; usage: BomUsageRow[] }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): MaterialActionFailure {
  // Session expired mid-action (401) --> sign the user out immediately
  // instead of showing a dead-end error toast. See lib/session-expiry.ts.
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    if (err.status === 409) {
      if (/code already exists/i.test(apiErrorMessage(err))) {
        return { status: "conflict", message: "รหัสวัสดุซ้ำ กรุณาตรวจรหัสต้นทางและรหัสหลังแปรรูป" };
      }
      return {
        status: "conflict",
        message: "ข้อมูลวัสดุนี้ถูกอัปเดตจากที่อื่นแล้ว กรุณารีเฟรชแล้วลองอีกครั้ง",
      };
    }
    return { status: "error", message: apiErrorMessage(err) };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
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
  try { revalidatePath("/materials/catalog"); } catch { /* best-effort */ }
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
  try { revalidatePath("/materials/catalog"); } catch { /* best-effort */ }
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
  try { revalidatePath("/materials/catalog"); } catch { /* best-effort */ }
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
  try { revalidatePath("/materials/catalog"); } catch { /* best-effort */ }
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

export async function performListBomUsageByMaterial(
  accessToken: string,
  materialId: string
): Promise<BomUsageListActionResult> {
  try {
    const usage = await listBomUsageByMaterial(accessToken, materialId);
    return { status: "success", usage };
  } catch (err) {
    return { status: "error", message: errorResult(err).message };
  }
}

export async function createMaterialPcAction(payload: MaterialPayload): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCreateMaterial(accessToken, payload);
}

export async function updateMaterialPcAction(
  id: string,
  payload: UpdateMaterialPayload
): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performUpdateMaterial(accessToken, id, payload);
}

export async function deactivateMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performDeactivateMaterial(accessToken, id);
}

export async function restoreMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performRestoreMaterial(accessToken, id);
}

export async function uploadMaterialPcImageAction(
  formData: FormData
): Promise<MaterialImageUploadActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performUploadMaterialImage(accessToken, formData);
}

// The material's own BOM versions (components). Hidden by the caller when the
// viewer lacks MATERIAL_BOMS_VIEW or the call fails — usage list still works.
export async function listOwnMaterialBomsAction(materialId: string): Promise<{ status: "success"; boms: EngineeringVersion[] } | { status: "error"; message: string }> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  try { return { status: "success", boms: await listEngineeringVersions(accessToken, "materials", "bom", materialId) }; }
  catch (err) { redirectIfSessionExpired(err); return { status: "error", message: errorResult(err).message }; }
}

export async function listBomUsageByMaterialAction(materialId: string): Promise<BomUsageListActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performListBomUsageByMaterial(accessToken, materialId);
}

export async function performCheckMaterialCode(accessToken: string, code: string, excludeId?: string): Promise<MaterialCodeCheckResult> {
  const normalized = code.trim();
  if (!normalized || normalized.length > 50 || (excludeId !== undefined && !/^[1-9]\d*$/.test(excludeId))) {
    return { status: "error", message: "กรอกรหัสวัสดุ 1–50 ตัวอักษร" };
  }
  try {
    const result = await checkMaterialCodeAvailability(accessToken, normalized, excludeId);
    return { status: "success", available: result.available };
  } catch (error) {
    return { status: "error", message: errorResult(error).message };
  }
}

export async function checkMaterialCodeAction(code: string, excludeId?: string): Promise<MaterialCodeCheckResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) redirectMissingSession();
  return performCheckMaterialCode(accessToken, code, excludeId);
}

async function withDraftSession<T>(request: (token: string) => Promise<T>) {
  const token = await requireAccessToken();
  if (!token) redirectMissingSession();
  try { return { status: "success" as const, value: await request(token) }; }
  catch (error) {
    redirectIfSessionExpired(error);
    return { status: "error" as const, message: error instanceof ApiError && error.status === 409 ? "ร่างถูกเปลี่ยนแปลงแล้ว กรุณาเปิดร่างอีกครั้ง" : errorResult(error).message };
  }
}

export async function listMaterialDraftsAction() {
  return withDraftSession(listMaterialDrafts);
}
export async function saveMaterialDraftAction(payload: SaveMaterialDraftPayload) {
  return withDraftSession((token) => saveMaterialDraft(token, payload));
}
export async function deleteMaterialDraftAction(id: string) {
  return withDraftSession((token) => deleteMaterialDraft(token, id));
}
export async function loadMaterialDraftAction(id: string) {
  return withDraftSession(async (token) => {
    const draft = await getMaterialDraft(token, id);
    let material = draft.materialId ? await getMaterial(token, draft.materialId) : null;
    if (material) material = { ...material, updatedAt: draft.materialUpdatedAt ?? material.updatedAt,
      processingMaterial: material.processingMaterial ? { ...material.processingMaterial, updatedAt: draft.outputUpdatedAt ?? material.processingMaterial.updatedAt } : null };
    return { draft, material };
  });
}
