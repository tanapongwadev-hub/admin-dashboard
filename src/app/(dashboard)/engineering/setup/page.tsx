import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getMaterialLookups, listMaterials } from "@/lib/api/materials";
import { getProductLookups } from "@/lib/api/products";
import { listProcessSteps } from "@/lib/api/process-steps";
import { getSetupDraft, listSetupDrafts } from "@/lib/api/setup-wizard";
import { loadProductMaterialCatalog } from "@/lib/product-materials";
import { SetupWizardClient } from "@/components/setup-wizard/setup-wizard-client";

export const metadata: Metadata = { title: "สร้างครบชุด" };

export default async function SetupWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const session = await getCurrentSession();
  const can = (code: string) => !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  if (!session || !can("SETUP_WIZARD_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="max-w-sm text-sm text-fg-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ SETUP_WIZARD_VIEW</p>
      </div>
    );
  }

  const params = await searchParams;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const canProcessSteps = can("PROCESS_STEP_VIEW") || can("PRODUCT_WORKFLOWS_CREATE");

  const [materialLookups, productLookups, catalog, steps, drafts, draft] = await Promise.all([
    getMaterialLookups(accessToken),
    getProductLookups(accessToken),
    loadProductMaterialCatalog((page) =>
      listMaterials(accessToken, { page, limit: 100, sortBy: "name", sortOrder: "asc" })
    ),
    canProcessSteps
      ? listProcessSteps(accessToken, { limit: 100, isActive: true, sortBy: "code", sortOrder: "asc" }).catch(() => ({
          items: [],
        }))
      : Promise.resolve({ items: [] }),
    listSetupDrafts(accessToken),
    params.draft ? getSetupDraft(accessToken, params.draft).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">สร้างครบชุด</h1>
        <p className="mt-1 text-sm text-fg-muted">
          สร้างวัสดุ สินค้า BOM และ Workflow ในที่เดียว บันทึกร่างไว้แล้วกลับมาทำต่อได้
        </p>
      </div>
      <SetupWizardClient
        // Fresh state per opened draft (parent-owned remount, not a reset effect).
        key={draft?.id ?? "new"}
        materialLookups={materialLookups}
        productLookups={productLookups}
        materials={catalog.activeMaterials.map((m) => ({ id: m.id, code: m.code, name: m.name, unitId: m.unitId }))}
        processSteps={steps.items.map((s) => ({ id: s.id, code: s.code, nameTh: s.nameTh }))}
        drafts={drafts}
        initialDraft={draft}
        can={{
          material: can("MATERIAL_CREATE"),
          product: can("PRODUCTS_CREATE"),
          bom: can("BOMS_CREATE"),
          workflow: can("PRODUCT_WORKFLOWS_CREATE"),
          activateBom: can("BOMS_ACTIVATE"),
          activateWorkflow: can("PRODUCT_WORKFLOWS_UPDATE"),
        }}
      />
    </div>
  );
}
