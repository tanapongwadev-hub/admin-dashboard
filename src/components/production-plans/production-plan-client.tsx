"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  approveProductionPlanAction,
  cancelProductionPlanAction,
  deleteProductionPlanAction,
  getProductionPlanAction,
} from "@/app/(dashboard)/production/plans/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  PaginatedProductionPlans,
  ProductionPlan,
  ProductionPlanLookups,
  ProductionPlanShortfall,
} from "@/lib/api/production-plans";
import { ProductionPlanApproveDialog } from "./production-plan-approve-dialog";
import { ProductionPlanCancelDialog } from "./production-plan-cancel-dialog";
import { ProductionPlanDetailsDialog } from "./production-plan-details-dialog";
import { ProductionPlanFilters } from "./production-plan-filters";
import { ProductionPlanFormDialog } from "./production-plan-form-dialog";
import { ProductionPlanImportDialog } from "./production-plan-import-dialog";
import { ProductionPlanTable } from "./production-plan-table";

export function ProductionPlanClient({
  plans,
  meta,
  lookups,
  canCreate,
  canUpdate,
  canDelete,
  canApprove,
  canCancel,
  canViewJobOrder,
  canPrintJobOrder,
}: {
  plans: ProductionPlan[];
  meta: PaginatedProductionPlans["meta"];
  lookups: ProductionPlanLookups;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canCancel: boolean;
  canViewJobOrder: boolean;
  canPrintJobOrder: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [formTarget, setFormTarget] = React.useState<
    ProductionPlan | null | undefined
  >();
  const [formKey, setFormKey] = React.useState(0);
  const [importOpen, setImportOpen] = React.useState(false);
  const [approveTarget, setApproveTarget] =
    React.useState<ProductionPlan | null>(null);
  const [shortfalls, setShortfalls] = React.useState<ProductionPlanShortfall[]>(
    [],
  );
  const [cancelTarget, setCancelTarget] = React.useState<ProductionPlan | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<ProductionPlan | null>(
    null,
  );
  const [detail, setDetail] = React.useState<ProductionPlan | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const refresh = () => router.refresh();
  async function view(plan: ProductionPlan) {
    setDetailLoading(true);
    const result = await getProductionPlanAction(plan.id);
    setDetailLoading(false);
    if (result.status === "error") return toast.error(result.message);
    setDetail(result.plan);
  }
  async function approve() {
    if (!approveTarget) return;
    const result = await approveProductionPlanAction(approveTarget.id);
    if (result.status === "error") {
      setShortfalls(result.shortfalls ?? []);
      toast.error(result.message);
      return;
    }
    toast.success("อนุมัติและกันสต็อกแล้ว", { description: result.plan.code });
    setApproveTarget(null);
    setShortfalls([]);
    refresh();
  }
  async function cancel(reason: string) {
    if (!cancelTarget) return;
    const result = await cancelProductionPlanAction(cancelTarget.id, reason);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success("ยกเลิกแผนและปล่อยสต็อกแล้ว", {
      description: result.plan.code,
    });
    setCancelTarget(null);
    refresh();
  }
  async function remove() {
    if (!deleteTarget) return;
    const result = await deleteProductionPlanAction(deleteTarget.id);
    if (result.status === "error") return toast.error(result.message);
    toast.success("ลบร่างแล้ว", { description: deleteTarget.code });
    setDeleteTarget(null);
    refresh();
  }
  function page(value: number) {
    const target = new URLSearchParams(params.toString());
    target.set("page", String(value));
    router.push(`${pathname}?${target}`);
  }
  const permissions = {
    update: canUpdate,
    approve: canApprove,
    cancel: canCancel,
    delete: canDelete,
    viewJobOrder: canViewJobOrder,
    printJobOrder: canPrintJobOrder,
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {canCreate && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="size-4" />
              นำเข้า Excel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setFormKey((key) => key + 1);
                setFormTarget(null);
              }}
            >
              <Plus className="size-4" />
              สร้างแผน
            </Button>
          </>
        )}
      </div>
      <ProductionPlanFilters totalItems={meta.totalItems} />
      <ProductionPlanTable
        plans={plans}
        permissions={permissions}
        onView={view}
        onEdit={(plan) => {
          setFormKey((key) => key + 1);
          setFormTarget(plan);
        }}
        onApprove={(plan) => {
          setShortfalls([]);
          setApproveTarget(plan);
        }}
        onCancel={setCancelTarget}
        onDelete={setDeleteTarget}
        onViewJobOrder={(plan) => {
          if (plan.jobOrder) router.push(`/materials/job-orders/${plan.jobOrder.id}`);
        }}
        onPrintJobOrder={(plan) => {
          if (plan.jobOrder)
            router.push(`/materials/job-orders/${plan.jobOrder.id}?print=1`);
        }}
      />
      {plans.length > 0 && (
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
      {(canCreate || canUpdate) && formTarget !== undefined && (
        <ProductionPlanFormDialog
          key={formKey}
          open
          plan={formTarget}
          lookups={lookups}
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          onSaved={refresh}
        />
      )}
      {canCreate && (
        <ProductionPlanImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={refresh}
        />
      )}
      <ProductionPlanApproveDialog
        plan={approveTarget}
        shortfalls={shortfalls}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setShortfalls([]);
          }
        }}
        onConfirm={approve}
      />
      <ProductionPlanCancelDialog
        key={cancelTarget?.id ?? "cancel"}
        plan={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={cancel}
      />
      <ProductionPlanDetailsDialog
        plan={detail}
        loading={detailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setDetailLoading(false);
          }
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`ลบร่าง ${deleteTarget?.code ?? ""}`}
        description="การลบแผนแบบร่างไม่สามารถย้อนกลับได้"
        confirmLabel="ลบร่าง"
        onConfirm={() => void remove()}
      />
    </div>
  );
}
