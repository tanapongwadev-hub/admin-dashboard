"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoriesFilters } from "@/components/categories/categories-filters";
import { CategoriesTable } from "@/components/categories/categories-table";
import { CategoriesFormDialog } from "@/components/categories/categories-form-dialog";
import { CategoriesStatusDialog } from "@/components/categories/categories-status-dialog";
import { CategoriesDetailsDialog } from "@/components/categories/categories-details-dialog";
import {
  deactivateCategoryAction,
  restoreCategoryAction,
} from "@/app/(dashboard)/master-data/categories/actions";
import type { Category, PaginatedCategories } from "@/lib/api/categories";

// Client-side orchestrator for `/master-data/categories`. Mirrors the same
// pattern as `material-pc-client.tsx` / `products-client.tsx` — the page
// (server) fetches the initial list and passes it down; the client only
// owns UI state (which dialog is open, for which row). Every mutation goes
// through a Server Action that calls `revalidatePath`, after which the
// client just calls `router.refresh()` to re-pull the server list.

export function CategoriesClient({
  categories,
  meta,
  canEdit,
  canDelete,
}: {
  categories: Category[];
  meta: PaginatedCategories["meta"];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  // `undefined` = dialog closed, `null` = "new" mode, `Category` = "edit" mode.
  // Using a 3-state sentinel lets one piece of state drive both "open" and
  // "which row" without a separate `open` boolean (same pattern as
  // material-pc-client.tsx).
  const [formTarget, setFormTarget] = React.useState<Category | null | undefined>(undefined);
  const [statusTarget, setStatusTarget] = React.useState<Category | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<Category | null>(null);

  function handleSaved() {
    router.refresh();
  }

  async function handleToggleStatus(category: Category) {
    const result = category.isActive
      ? await deactivateCategoryAction(category.id)
      : await restoreCategoryAction(category.id);

    if (result.status === "success") {
      toast.success(category.isActive ? "ปิดใช้งานหมวดหมู่แล้ว" : "เปิดใช้งานหมวดหมู่แล้ว", {
        description: `อัปเดต ${result.category.nameTh} เรียบร้อยแล้ว`,
      });
      router.refresh();
      return;
    }
    toast.error(result.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CategoriesFilters />
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <Button onClick={() => setFormTarget(null)} className="shrink-0">
              <Plus className="h-4 w-4" /> เพิ่มหมวดหมู่
            </Button>
          )}
        </div>
      </div>

      <CategoriesTable
        categories={categories}
        meta={meta}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={(category) => setFormTarget(category)}
        onToggleStatus={(category) => setStatusTarget(category)}
        onViewDetails={(category) => setDetailsTarget(category)}
      />

      <CategoriesDetailsDialog
        category={detailsTarget}
        canEdit={canEdit}
        onEdit={(category) => setFormTarget(category)}
        onOpenChange={(open) => !open && setDetailsTarget(null)}
      />

      {canEdit && (
        <CategoriesFormDialog
          open={formTarget !== undefined}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          category={formTarget}
          onSaved={handleSaved}
        />
      )}

      {canDelete && (
        <CategoriesStatusDialog
          category={statusTarget}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          onConfirm={handleToggleStatus}
        />
      )}
    </div>
  );
}
