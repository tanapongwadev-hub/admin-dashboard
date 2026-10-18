import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getMaterialLookups, listMaterials } from "@/lib/api/materials";
import { getProductLookups } from "@/lib/api/products";
import { listProcessSteps } from "@/lib/api/process-steps";
import { getSetupDraft, getSetupOverview, listSetupDrafts } from "@/lib/api/setup-wizard";
import { getBomOverview } from "@/lib/api/bom-overview";
import { BomOverviewClient } from "@/components/bom-overview/bom-overview-client";
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

  const accessToken = (await cookies()).get("accessToken")!.value;

  // Everyone with SETUP_WIZARD_VIEW can browse every BOM / Workflow, read-only.
  // Creating, editing and deleting (the wizard) is SUPER_ADMIN only.
  if (!session.user.isSuperAdmin) {
    const list = await getBomOverview(accessToken).catch(() => ({ products: [], materials: [] }));
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">สร้างครบชุด</h1>
          <p className="mt-1 text-sm text-fg-muted">
            ดู BOM และ Workflow ของสินค้าและวัสดุทั้งหมด (ดูอย่างเดียว — การสร้าง แก้ไข และลบทำได้เฉพาะผู้ดูแลระบบสูงสุด)
          </p>
        </div>
        <BomOverviewClient overview={list} />
      </div>
    );
  }

  const params = await searchParams;
  const canProcessSteps = can("PROCESS_STEP_VIEW") || can("PRODUCT_WORKFLOWS_CREATE") || can("MATERIAL_WORKFLOWS_CREATE");

  const [materialLookups, productLookups, catalog, steps, drafts, draft, overview, details] = await Promise.all([
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
    getSetupOverview(accessToken).catch(() => ({ products: [], materials: [] })),
    getBomOverview(accessToken).catch(() => ({ products: [], materials: [] })),
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
        materials={catalog.activeMaterials}
        processSteps={steps.items}
        drafts={drafts}
        overview={overview}
        details={details}
        initialDraft={draft}
        manage={{
          products: { bom: can("BOMS_UPDATE"), workflow: can("PRODUCT_WORKFLOWS_UPDATE") },
          materials: { bom: can("MATERIAL_BOMS_UPDATE"), workflow: can("MATERIAL_WORKFLOWS_UPDATE") },
        }}
        can={{
          material: can("MATERIAL_CREATE"),
          product: can("PRODUCTS_CREATE"),
          bom: can("BOMS_CREATE"),
          workflow: can("PRODUCT_WORKFLOWS_CREATE"),
          materialBom: can("MATERIAL_BOMS_CREATE"),
          materialWorkflow: can("MATERIAL_WORKFLOWS_CREATE"),
          activateBom: can("BOMS_ACTIVATE"),
          activateWorkflow: can("PRODUCT_WORKFLOWS_UPDATE"),
        }}
      />
    </div>
  );
}
