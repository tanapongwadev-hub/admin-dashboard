"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { ProductsFilters } from "@/components/products/products-filters";
import { ProductsTable } from "@/components/products/products-table";
import { ProductsWizardDialog } from "@/components/products/products-wizard-dialog";
import { ProductsStatusDialog } from "@/components/products/products-status-dialog";
import { ProductsDetailsDialog } from "@/components/products/products-details-dialog";
import { ProductsCatalogSummary } from "@/components/products/products-catalog-summary";
import { ProductStockDialog } from "@/components/products/product-stock-dialog";
import { deactivateProductAction, restoreProductAction } from "@/app/(dashboard)/products/actions";
import type { Product, ProductLookups } from "@/lib/api/products";
import type { Material } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";

export function ProductsClient({
  products,
  totalItems,
  stockByProductId,
  canManageStock,
  lookups,
  materials,
  diagramMaterials,
  processSteps,
  canEdit,
  canDelete,
  canCreateBom,
  canViewBom,
  canCreateWorkflow,
  canViewWorkflow,
  openNew,
}: {
  products: Product[];
  totalItems: number;
  stockByProductId: Record<string, string>;
  canManageStock: boolean;
  lookups: ProductLookups;
  // BOM item component picker in the wizard's post-create BOM step — see
  // AGENTS.md § Products. Not gated behind canEdit since a BOM references
  // Materials, not Products, permissions.
  materials: Material[];
  // Complete catalog, including inactive and paginated rows, so historical
  // BOM versions can always resolve their material photos.
  diagramMaterials: Material[];
  // Workflow step dropdown options in the wizard's post-BOM workflow step —
  // master data, not gated behind canEdit for the same reason as materials.
  processSteps: ProcessStep[];
  canEdit: boolean;
  canDelete: boolean;
  // Separate from canEdit: BOMS_CREATE is its own permission, independent
  // of PRODUCTS_CREATE/UPDATE — a user could have one without the other.
  canCreateBom: boolean;
  // Separate again from canCreateBom — a read-only viewer could see BOMs
  // without being able to author them.
  canViewBom: boolean;
  // Product Workflow is a distinct resource/permission from BOMs — see
  // AGENTS.md § Products.
  canCreateWorkflow: boolean;
  canViewWorkflow: boolean;
  openNew?: boolean;
}) {
  const router = useRouter();
  const [stockTarget, setStockTarget] = React.useState<Product | null>(null);
  // Match Materials PC: the image-led editorial card is the first view for
  // new users; the persisted preference still wins for returning users.
  const [view, setView] = useViewMode("products", "card");
  // Single entry point for both add and edit now (see AGENTS.md § Products)
  // — undefined = closed, null = create mode, a Product = edit mode. Mirrors
  // the same "undefined vs null vs value" shape the old formTarget used.
  const [wizardTarget, setWizardTarget] = React.useState<Product | null | undefined>(openNew ? null : undefined);
  const [statusTarget, setStatusTarget] = React.useState<Product | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Product | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(product: Product) {
    const result = product.isActive
      ? await deactivateProductAction(product.id)
      : await restoreProductAction(product.id);

    if (result.status === "success") {
      toast.success(product.isActive ? "ปิดใช้งานสินค้าแล้ว" : "เปิดใช้งานสินค้าแล้ว", {
        description: `อัปเดต ${result.product.name} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <ProductsCatalogSummary totalItems={totalItems} products={products} />
      {/* Keep view controls and creation together; filters get a full-width row. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">รายการสินค้า</h2>
          <p className="mt-0.5 text-xs text-fg-muted">ข้อมูลสินค้า การบรรจุ และล็อตผลิต</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
          {canEdit && (
            <Button onClick={() => setWizardTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มสินค้า
            </Button>
          )}
        </div>
      </div>
      <ProductsFilters lookups={lookups} totalItems={totalItems} />

      <ProductsTable
        products={products}
        totalItems={totalItems}
        stockByProductId={stockByProductId}
        onViewStock={setStockTarget}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(product) => setWizardTarget(product)}
        onToggleStatus={(product) => setStatusTarget(product)}
        onViewDetails={(product) => setDetailsTarget(product)}
      />

      {stockTarget && <ProductStockDialog key={stockTarget.id} product={stockTarget} canManageStock={canManageStock} onClose={() => setStockTarget(null)} onSaved={handleSaved} />}

      <ProductsDetailsDialog
        product={detailsTarget}
        stockQuantity={detailsTarget ? stockByProductId[detailsTarget.id] ?? "0" : undefined}
        canEdit={canEdit}
        canViewBom={canViewBom}
        canViewWorkflow={canViewWorkflow}
        materials={diagramMaterials}
        onEdit={(product) => setWizardTarget(product)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <ProductsWizardDialog
          open={wizardTarget !== undefined}
          onOpenChange={(open) => !open && setWizardTarget(undefined)}
          product={wizardTarget}
          lookups={lookups}
          materials={materials}
          processSteps={processSteps}
          canCreateBom={canCreateBom}
          canCreateWorkflow={canCreateWorkflow}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <ProductsStatusDialog
          product={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
