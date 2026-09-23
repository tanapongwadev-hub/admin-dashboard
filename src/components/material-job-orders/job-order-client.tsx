"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginatedMaterialJobOrders } from "@/lib/api/material-job-orders";
import { MaterialJobOrderFilters } from "./job-order-filters";
import { MaterialJobOrderTable } from "./job-order-table";

export function MaterialJobOrderClient({
  jobOrders,
  meta,
  canPrint,
}: {
  jobOrders: PaginatedMaterialJobOrders["items"];
  meta: PaginatedMaterialJobOrders["meta"];
  canPrint: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  function page(value: number) {
    const target = new URLSearchParams(params.toString());
    target.set("page", String(value));
    router.push(`${pathname}?${target}`);
  }
  return (
    <div className="flex flex-col gap-4">
      <MaterialJobOrderFilters totalItems={meta.totalItems} />
      <MaterialJobOrderTable jobOrders={jobOrders} canPrint={canPrint} />
      {jobOrders.length > 0 && (
        <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด{" "}
            {meta.totalItems} รายการ
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => page(meta.page - 1)}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => page(meta.page + 1)}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
