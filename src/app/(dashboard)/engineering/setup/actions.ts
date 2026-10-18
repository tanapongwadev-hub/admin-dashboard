"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { createMaterial } from "@/lib/api/materials";
import { createProduct } from "@/lib/api/products";
import { createBom, activateBom } from "@/lib/api/boms";
import { createProductWorkflow, activateProductWorkflow } from "@/lib/api/product-workflows";
import {
  deleteSetupDraft,
  getSetupDraft,
  listSetupDrafts,
  saveSetupDraft,
  type SaveSetupDraftPayload,
  type SetupDraftRecord,
  type SetupDraftSummary,
} from "@/lib/api/setup-wizard";
import { isNewMaterialRef, newMaterialKey, type SetupCreated, type SetupData } from "@/lib/setup-wizard";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

type Failure = { status: "error"; message: string };

async function token(): Promise<string> {
  const store = await cookies();
  const value = store.get("accessToken")?.value;
  if (!value) redirectMissingSession();
  return value as string;
}

function failure(err: unknown): Failure {
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) return { status: "error", message: apiErrorMessage(err) };
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

export async function listSetupDraftsAction(): Promise<
  { status: "success"; drafts: SetupDraftSummary[] } | Failure
> {
  try {
    return { status: "success", drafts: await listSetupDrafts(await token()) };
  } catch (err) {
    return failure(err);
  }
}

export async function loadSetupDraftAction(
  id: string
): Promise<{ status: "success"; draft: SetupDraftRecord } | Failure> {
  try {
    return { status: "success", draft: await getSetupDraft(await token(), id) };
  } catch (err) {
    return failure(err);
  }
}

export async function saveSetupDraftAction(
  payload: SaveSetupDraftPayload
): Promise<{ status: "success"; draft: SetupDraftRecord } | Failure> {
  try {
    return { status: "success", draft: await saveSetupDraft(await token(), payload) };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteSetupDraftAction(id: string): Promise<{ status: "success" } | Failure> {
  try {
    await deleteSetupDraft(await token(), id);
    return { status: "success" };
  } catch (err) {
    return failure(err);
  }
}

export type RunSetupResult =
  | { status: "success"; created: SetupCreated }
  // Some pieces may already exist when a later one fails — the caller must
  // keep `created` (and save it into the draft) so a retry resumes after them.
  | { status: "partial"; created: SetupCreated; message: string; failedAt: string };

const optionalInt = (value: string) => (value.trim() === "" ? undefined : Number(value));

/**
 * Creates Material -> Product -> BOM -> Workflow through the normal cps-api
 * endpoints, one after another. Anything already in `data.created` is skipped,
 * so running it again after a failure only does the remaining work.
 */
export async function runSetupAction(data: SetupData): Promise<RunSetupResult> {
  const accessToken = await token();
  const created: SetupCreated = { ...data.created, materialIds: { ...(data.created.materialIds ?? {}) } };
  let stage = "";
  try {
    if (data.materialsEnabled) {
      for (const m of data.materials) {
        if (created.materialIds![m.key]) continue;
        stage = `สร้างวัสดุ ${m.code.trim()}`;
        const material = await createMaterial(accessToken, {
          type: "PC",
          code: m.code.trim(),
          name: m.name.trim(),
          materialType: "PCS",
          locationType: m.locationType,
          unitId: m.unitId,
          materialTypeId: m.materialTypeId || null,
          supplierIds: m.supplierIds,
          packingQuantity: optionalInt(m.packingQuantity) ?? null,
          minimumStock: optionalInt(m.minimumStock) ?? 0,
          specification: m.specification.trim() || null,
        });
        created.materialIds![m.key] = material.id;
      }
    }

    if (!created.productId) {
      stage = "สร้างสินค้า";
      const p = data.product;
      const product = await createProduct(accessToken, {
        code: p.code.trim(),
        name: p.name.trim(),
        unitId: p.unitId,
        modelId: p.modelId,
        customerId: p.customerId,
        locationId: p.locationId,
        productTypeId: p.productTypeId,
        deliveryTypeId: p.deliveryTypeId,
        loadingPointId: p.loadingPointId,
        processLineId: p.processLineId,
        packing: optionalInt(p.packing),
        lotSize: optionalInt(p.lotSize),
        scale: p.scale.trim() || null,
      });
      created.productId = product.id;
    }

    if (data.bomEnabled && !created.bomId) {
      stage = "สร้าง BOM";
      const items = data.bomRows.map((row) => {
        const materialId = isNewMaterialRef(row.materialId) ? created.materialIds![String(newMaterialKey(row.materialId))] : row.materialId;
        if (!materialId) throw new Error("ไม่พบวัสดุใหม่สำหรับ BOM");
        return {
          materialId,
          unitId: row.unitId,
          quantity: Number(row.quantity),
          isScrap: false,
          wastagePercent: row.wastagePercent === "" ? null : Number(row.wastagePercent),
          remark: null,
        };
      });
      const bom = await createBom(accessToken, { productId: created.productId, items });
      created.bomId = bom.id;
      if (data.activate) await activateBom(accessToken, bom.id);
    }

    if (data.workflowEnabled && !created.workflowId) {
      stage = "สร้าง Workflow";
      const workflow = await createProductWorkflow(accessToken, {
        productId: created.productId,
        steps: data.workflowRows.map((row) => ({
          processStepId: row.processStepId,
          description: row.description.trim() || null,
        })),
      });
      created.workflowId = workflow.id;
      if (data.activate) await activateProductWorkflow(accessToken, workflow.id);
    }
  } catch (err) {
    const message = err instanceof Error && !(err instanceof ApiError) ? err.message : failure(err).message;
    return { status: "partial", created, message, failedAt: stage };
  }

  for (const path of ["/materials/catalog", "/engineering/products", "/engineering/products/list", "/engineering/bom/products"]) {
    try { revalidatePath(path); } catch { /* best-effort */ }
  }
  return { status: "success", created };
}
