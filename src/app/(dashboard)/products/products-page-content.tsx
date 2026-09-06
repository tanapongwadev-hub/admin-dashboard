import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listProducts, getProductLookups } from "@/lib/api/products";
import { listMaterials } from "@/lib/api/materials";
import { listProcessSteps } from "@/lib/api/process-steps";
import { ProductsClient } from "@/components/products/products-client";

export async function ProductsPageContent({
  searchParams,
  title,
  description,
}: {
  searchParams: Promise<{ search?: string; status?: string; new?: string }>;
  title: string;
  description: string;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าสินค้า</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูสินค้าต้องมีสิทธิ์ Products View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const isActive = params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_CREATE") || session.permissions.includes("PRODUCTS_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_DELETE") || session.permissions.includes("PRODUCTS_RESTORE");
  const canCreateBom = session.user.isSuperAdmin || session.permissions.includes("BOMS_CREATE");
  // Separate permission from BOMS_CREATE — a viewer could have one without
  // the other (e.g. read-only staff who can see BOMs but not author them).
  const canViewBom = session.user.isSuperAdmin || session.permissions.includes("BOMS_VIEW");
  // Product Workflow is a distinct resource/permission from BOMs (see
  // AGENTS.md § Products) — a viewer could author BOMs without being able to
  // define the production workflow, or vice versa.
  const canCreateWorkflow = session.user.isSuperAdmin || session.permissions.includes("PRODUCT_WORKFLOWS_CREATE");
  const canViewWorkflow = session.user.isSuperAdmin || session.permissions.includes("PRODUCT_WORKFLOWS_VIEW");

  // Materials list is fetched here too (not just Products' own lookups) so
  // the wizard's post-create "insert BOM" step (see AGENTS.md § Products)
  // has a component picker — a BOM item references any Material regardless
  // of type (PC/OF/OF_MAT), so this intentionally has no `type` filter,
  // unlike /materials/pc's own list. `isActive: true` since a BOM shouldn't
  // be built from a disabled material; `limit: 100` is the backend's max.
  //
  // Process steps (master data for the workflow step dropdown, see AGENTS.md
  // § Product Workflow) are only fetched when the viewer could actually reach
  // the workflow phase — `PROCESS_STEP_VIEW` isn't seeded for any
  // non-SUPER_ADMIN role yet (same standing gap as PRODUCT_WORKFLOWS_* — see
  // API_ENDPOINTS.md § 16), so a viewer with PRODUCT_WORKFLOWS_CREATE but not
  // PROCESS_STEP_VIEW would otherwise 403 this whole page's data fetch.
  const [list, lookups, materialsList, processStepsList] = await Promise.all([
    listProducts(accessToken, { search, isActive, sortBy: "code", sortOrder: "asc" }),
    getProductLookups(accessToken),
    listMaterials(accessToken, { limit: 100, isActive: true, sortBy: "name", sortOrder: "asc" }),
    canCreateWorkflow
      ? listProcessSteps(accessToken, { limit: 100, isActive: true, sortBy: "code", sortOrder: "asc" }).catch(
          () => ({ items: [], meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 } })
        )
      : Promise.resolve({ items: [], meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>

      <ProductsClient
        products={list.items}
        totalItems={list.meta.totalItems}
        lookups={lookups}
        materials={materialsList.items}
        processSteps={processStepsList.items}
        canEdit={canEdit}
        canDelete={canDelete}
        canCreateBom={canCreateBom}
        canViewBom={canViewBom}
        canCreateWorkflow={canCreateWorkflow}
        canViewWorkflow={canViewWorkflow}
        openNew={params.new === "1"}
      />
    </div>
  );
}
