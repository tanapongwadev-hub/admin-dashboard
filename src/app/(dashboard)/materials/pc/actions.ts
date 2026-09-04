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

export async function uploadMaterialPcImageAction(
  formData: FormData
): Promise<MaterialImageUploadActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) {
    return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };
  }

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

  try {
    const material = await createMaterial(accessToken, { ...payload, type: "PC" });
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function updateMaterialPcAction(
  id: string,
  payload: UpdateMaterialPayload
): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const material = await updateMaterial(accessToken, id, payload);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function deactivateMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const material = await deactivateMaterial(accessToken, id);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}

export async function restoreMaterialPcAction(id: string): Promise<MaterialActionResult> {
  const accessToken = await requireAccessToken();
  if (!accessToken) return { status: "error", message: "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง" };

  try {
    const material = await restoreMaterial(accessToken, id);
    revalidatePath("/materials/pc");
    return { status: "success", material };
  } catch (err) {
    return errorResult(err);
  }
}
