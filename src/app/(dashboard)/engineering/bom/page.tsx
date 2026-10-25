import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LayoutDashboard, ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listMaterials } from "@/lib/api/materials";
import { listProducts } from "@/lib/api/products";
import { getBomOverview } from "@/lib/api/bom-overview";
import { loadProductMaterialCatalog } from "@/lib/product-materials";
import { BomDashboard } from "@/components/bom-dashboard/bom-dashboard";

export const metadata: Metadata = { title: "ภาพรวม BOM และขั้นตอนการผลิต" };

// Dashboard (read-only), opened from the BOM_WORKFLOW main menu. The work page is /engineering/setup.
export default async function BomDashboardPage() {
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
  const token = (await cookies()).get("accessToken")!.value;
  const [overview, products, catalog] = await Promise.all([
    getBomOverview(token).catch(() => ({ products: [], materials: [] })),
    can("PRODUCTS_VIEW")
      ? listProducts(token, { isActive: true, sortBy: "code", sortOrder: "asc" }).then((r) => r.items).catch(() => [])
      : Promise.resolve([]),
    can("MATERIAL_VIEW")
      ? loadProductMaterialCatalog((page) => listMaterials(token, { page, limit: 100, sortBy: "code", sortOrder: "asc" })).catch(
          () => ({ activeMaterials: [], diagramMaterials: [] })
        )
      : Promise.resolve({ activeMaterials: [], diagramMaterials: [] }),
  ]);
  const internalMaterials = catalog.activeMaterials.filter(
    (m) => m.locationType === "internal" && !["PIPE", "SHEET", "COIL"].includes(m.materialType)
  );
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary">
          <LayoutDashboard className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">ภาพรวม BOM และขั้นตอนการผลิต</h1>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">
            ดูว่าสินค้าและวัตถุดิบภายในรายการไหนพร้อมผลิต ขาด BOM หรือ Workflow และมีฉบับร่างค้างอยู่
          </p>
        </div>
      </header>
      <BomDashboard
        overview={overview}
        totals={{
          products: products.map((p) => ({ id: p.id, code: p.code, name: p.name })),
          materials: internalMaterials.map((m) => ({ id: m.id, code: m.code, name: m.name })),
        }}
      />
    </div>
  );
}
