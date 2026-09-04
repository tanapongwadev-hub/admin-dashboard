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
import { ProductsFormDialog } from "@/components/products/products-form-dialog";
import { ProductsStatusDialog } from "@/components/products/products-status-dialog";
import { deactivateProductAction, restoreProductAction } from "@/app/(dashboard)/products/actions";
import type { Product, ProductLookups } from "@/lib/api/products";

export function ProductsClient({
  products,
  totalItems,
  lookups,
  canEdit,
  canDelete,
  openNew,
}: {
  products: Product[];
  totalItems: number;
  lookups: ProductLookups;
  canEdit: boolean;
  canDelete: boolean;
  openNew?: boolean;
}) {
  const router = useRouter();
  const [view, setView] = useViewMode("products", "table");
  const [formTarget, setFormTarget] = React.useState<Product | null | undefined>(openNew ? null : undefined);
  const [statusTarget, setStatusTarget] = React.useState<Product | null>(null);

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
          <ViewToggle value={view} onChange={setView} />
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
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
        onEdit={(product) => setFormTarget(product)}
        onToggleStatus={(product) => setStatusTarget(product)}
      />

      {canEdit && (
        <ProductsFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          product={formTarget}
          lookups={lookups}
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
