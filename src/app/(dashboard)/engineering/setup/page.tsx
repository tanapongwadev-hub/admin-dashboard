import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getMaterialLookups, listMaterials } from "@/lib/api/materials";
import { getProductLookups, listProducts } from "@/lib/api/products";
import { listProcessSteps } from "@/lib/api/process-steps";
import { getSetupDraft, getSetupOverview, listSetupDrafts } from "@/lib/api/setup-wizard";
import { getBomOverview } from "@/lib/api/bom-overview";
import { BomOverviewClient } from "@/components/bom-overview/bom-overview-client";
import { loadProductMaterialCatalog } from "@/lib/product-materials";
import { SetupWizardClient } from "@/components/setup-wizard/setup-wizard-client";
import { GitBranch } from "lucide-react";

export const metadata: Metadata = { title: "BOM และขั้นตอนการผลิต" };

// Work page: สร้างครบชุด (วัสดุ → สินค้า → BOM → Workflow) for SUPER_ADMIN, read-only BOM / Workflow list
// for everyone else.
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary">
          <GitBranch className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">BOM และขั้นตอนการผลิต</h1>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            ดูว่ารายการไหนยังไม่ครบ แล้วกด “ทำให้ครบ” หรือสร้างใหม่ได้จากหน้านี้
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

export default async function SetupWizardPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; view?: string; scope?: string }>;
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

  // Everyone with SETUP_WIZARD_VIEW can browse every BOM / Workflow, read-only.
  // Creating, editing and deleting (the wizard) is SUPER_ADMIN only.
  if (!session.user.isSuperAdmin) {
    const list = await getBomOverview(accessToken).catch(() => ({ products: [], materials: [] }));
    return (
      <PageShell>
        <p className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm text-fg-secondary">
          ดูอย่างเดียว — การสร้างครบชุด แก้ไข และลบทำได้เฉพาะผู้ดูแลระบบสูงสุด
        </p>
        <BomOverviewClient overview={list} />
      </PageShell>
    );
  }

  const canProcessSteps = can("PROCESS_STEP_VIEW") || can("PRODUCT_WORKFLOWS_CREATE") || can("MATERIAL_WORKFLOWS_CREATE");

  const [materialLookups, productLookups, products, catalog, steps, drafts, draft, overview, details] = await Promise.all([
    getMaterialLookups(accessToken),
    getProductLookups(accessToken),
    listProducts(accessToken, { isActive: true, sortBy: "code", sortOrder: "asc" })
      .then((r) => r.items.map((p) => ({ id: p.id, code: p.code, name: p.name })))
      .catch(() => []),
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
    <PageShell>
      <SetupWizardClient
        // Fresh state per opened draft (parent-owned remount, not a reset effect).
        key={draft?.id ?? "new"}
        materialLookups={materialLookups}
        productLookups={productLookups}
        products={products}
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
    </PageShell>
  );
}
