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
import { deactivateProductAction, restoreProductAction } from "@/app/(dashboard)/products/actions";
import type { Product, ProductLookups } from "@/lib/api/products";
import type { Material } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";

export function ProductsClient({
  products,
  totalItems,
  lookups,
  materials,
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
  lookups: ProductLookups;
  // BOM item component picker in the wizard's post-create BOM step — see
  // AGENTS.md § Products. Not gated behind canEdit since a BOM references
  // Materials, not Products, permissions.
  materials: Material[];
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
  const [view, setView] = useViewMode("products", "table");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProductsFilters />
        <div className="flex shrink-0 items-center gap-2">
          <ViewToggle value={view} onChange={setView} modes={["table", "card", "list"]} />
          {canEdit && (
            <Button onClick={() => setWizardTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มสินค้า
            </Button>
          )}
        </div>
      </div>

      <ProductsTable
        products={products}
        totalItems={totalItems}
        view={view}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(product) => setWizardTarget(product)}
        onToggleStatus={(product) => setStatusTarget(product)}
        onViewDetails={(product) => setDetailsTarget(product)}
      />

      <ProductsDetailsDialog
        product={detailsTarget}
        canEdit={canEdit}
        canViewBom={canViewBom}
        canViewWorkflow={canViewWorkflow}
        materials={materials}
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
