"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Eye,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelSalesOrderAction,
  confirmSalesOrderAction,
  deleteSalesOrderAction,
  getSalesOrderAction,
} from "@/app/(dashboard)/sales/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type {
  PageMeta,
  SalesLookups,
  SalesOrderDetail,
  SalesOrderListRow,
  SalesShortfall,
} from "@/lib/api/sales";
import { formatThaiDate, SALES_ORDER_STATUS_LABELS } from "@/lib/filters/sales-filters";
import { SalesJobOrderStatusBadge, SalesOrderStatusBadge } from "./sales-badges";
import { SalesFilterBar, SalesPagination } from "./sales-filter-bar";
import {
  SalesOrderCancelDialog,
  SalesOrderDetailsDialog,
  SalesShortfallDialog,
} from "./sales-order-dialogs";
import { SalesOrderFormDialog } from "./sales-order-form-dialog";

export interface SalesOrderPermissions {
  create: boolean;
  update: boolean;
  delete: boolean;
  confirm: boolean;
  cancel: boolean;
}

/**
 * Pure row-action builder (exported for tests). Mirrors the backend state
 * machine: edit/confirm/delete only on DRAFT; cancel until SHIPPED/CANCELLED.
 */
export function getSalesOrderRowActions(
  order: Pick<SalesOrderListRow, "status" | "jobOrder">,
  permissions: SalesOrderPermissions,
  handlers: {
    onView: () => void;
    onEdit: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onOpenJobOrder: () => void;
  },
): RowAction[] {
  const actions: RowAction[] = [
    { label: "ดูรายละเอียด", icon: Eye, onSelect: handlers.onView },
  ];
  if (order.jobOrder) {
    actions.push({ label: "เปิดใบจัดงานขาย", icon: PackageCheck, onSelect: handlers.onOpenJobOrder });
  }
  if (order.status === "DRAFT") {
    if (permissions.update) actions.push({ label: "แก้ไข", icon: Pencil, onSelect: handlers.onEdit });
    if (permissions.confirm) {
      actions.push({ label: "ยืนยันออเดอร์ / จองสินค้า", icon: CheckCircle2, onSelect: handlers.onConfirm });
    }
  }
  if (permissions.cancel && order.status !== "SHIPPED" && order.status !== "CANCELLED") {
    actions.push({ label: "ยกเลิกออเดอร์", icon: Ban, onSelect: handlers.onCancel, variant: "danger" });
  }
  if (permissions.delete && order.status === "DRAFT") {
    actions.push({ label: "ลบร่าง", icon: Trash2, onSelect: handlers.onDelete, variant: "danger" });
  }
  return actions;
}

export function SalesOrderClient({
  orders,
  meta,
  lookups,
  permissions,
}: {
  orders: SalesOrderListRow[];
  meta: PageMeta;
  lookups: SalesLookups;
  permissions: SalesOrderPermissions;
}) {
  const router = useRouter();
  // undefined = closed, null = create, value = edit (remounted per session).
  const [formTarget, setFormTarget] = React.useState<SalesOrderDetail | null | undefined>();
  const [formSession, setFormSession] = React.useState(0);
  const [details, setDetails] = React.useState<SalesOrderDetail | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<SalesOrderDetail | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<SalesOrderListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SalesOrderListRow | null>(null);
  const [shortfalls, setShortfalls] = React.useState<SalesShortfall[] | null>(null);

  async function load(id: string) {
    const result = await getSalesOrderAction(id);
    if (result.status === "error") {
      toast.error(result.message);
      return null;
    }
    return result.order;
  }

  function openForm(order: SalesOrderDetail | null) {
    setFormSession((n) => n + 1);
    setFormTarget(order);
  }

  async function handleConfirm(order: SalesOrderListRow) {
    const result = await confirmSalesOrderAction(order.id, order.version);
    setConfirmTarget(null);
    if (result.status === "error") {
      if (result.shortfalls?.length) setShortfalls(result.shortfalls);
      else toast.error(result.message);
      return;
    }
    toast.success(`ยืนยันออเดอร์แล้ว — สร้างใบจัดงาน ${result.order.jobOrder?.code ?? ""}`);
    router.refresh();
  }

  async function handleDelete(order: SalesOrderListRow) {
    const result = await deleteSalesOrderAction(order.id, order.version);
    setDeleteTarget(null);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(`ลบร่าง ${order.code} แล้ว`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {permissions.create && (
        <div className="flex justify-end">
          <Button type="button" onClick={() => openForm(null)}>
            <Plus className="size-4" />
            สร้างออเดอร์ขาย
          </Button>
        </div>
      )}
      <SalesFilterBar
        idPrefix="sales-orders"
        statusLabels={SALES_ORDER_STATUS_LABELS}
        searchPlaceholder="ค้นหาเลขออเดอร์ PO ลูกค้า หรือรหัสสินค้า..."
        dateLabel="วันที่สั่ง"
        totalItems={meta.totalItems}
        customers={lookups.customers}
      />

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
          <ShoppingCart className="size-8 text-fg-muted" />
          <p className="font-medium text-fg">ยังไม่มีออเดอร์ขาย</p>
          <p className="text-sm text-fg-muted">สร้างออเดอร์ หรือปรับตัวกรองเพื่อดูรายการอื่น</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-surface-2 text-left text-xs text-fg-muted">
              <tr>
                <th className="px-3 py-2.5">เลขที่ออเดอร์</th>
                <th className="px-3 py-2.5">ลูกค้า</th>
                <th className="px-3 py-2.5">วันที่สั่ง / กำหนดส่ง</th>
                <th className="px-3 py-2.5 text-right">จำนวน (ส่งแล้ว / สั่ง)</th>
                <th className="px-3 py-2.5">สถานะ</th>
                <th className="px-3 py-2.5">ใบจัดงานขาย</th>
                <th className="px-3 py-2.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const pct = order.totalQuantity
                  ? Math.round((order.shippedQuantity / order.totalQuantity) * 100)
                  : 0;
                return (
                  <tr key={order.id} className="border-t border-border align-top">
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="font-mono font-medium text-primary hover:underline"
                        onClick={async () => setDetails(await load(order.id))}
                      >
                        {order.code}
                      </button>
                      {order.customerPo && (
                        <span className="block text-xs text-fg-muted">PO {order.customerPo}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium text-fg">{order.customer.nameTh}</span>
                      <span className="text-xs text-fg-muted">
                        {order.customer.code} · {order.lineCount} รายการ
                      </span>
                    </td>
                    <td className="px-3 py-3 text-fg-secondary">
                      {formatThaiDate(order.orderDate)}
                      <span className="block text-xs text-fg-muted">
                        ส่ง {formatThaiDate(order.dueDate)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="tabular-nums font-semibold text-fg">
                        {order.shippedQuantity.toLocaleString("th-TH")} /{" "}
                        {order.totalQuantity.toLocaleString("th-TH")}
                      </span>
                      <div
                        className="ml-auto mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-surface-2"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`ส่งแล้ว ${pct}%`}
                      >
                        <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <SalesOrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-3">
                      {order.jobOrder ? (
                        <div className="flex flex-col items-start gap-1">
                          <Link
                            href={`/sales/job-orders/${order.jobOrder.id}`}
                            className="font-mono text-xs font-medium text-primary hover:underline"
                          >
                            {order.jobOrder.code}
                          </Link>
                          <SalesJobOrderStatusBadge status={order.jobOrder.status} />
                        </div>
                      ) : (
                        <span className="text-fg-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <RowActionsMenu
                        itemLabel={order.code}
                        actions={getSalesOrderRowActions(order, permissions, {
                          onView: async () => setDetails(await load(order.id)),
                          onEdit: async () => {
                            const detail = await load(order.id);
                            if (detail) openForm(detail);
                          },
                          onConfirm: () => setConfirmTarget(order),
                          onCancel: async () => setCancelTarget(await load(order.id)),
                          onDelete: () => setDeleteTarget(order),
                          onOpenJobOrder: () =>
                            order.jobOrder && router.push(`/sales/job-orders/${order.jobOrder.id}`),
                        })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <SalesPagination meta={meta} />

      {formTarget !== undefined && (
        <SalesOrderFormDialog
          key={formSession}
          open
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          order={formTarget}
          lookups={lookups}
          onSaved={() => router.refresh()}
        />
      )}
      <SalesOrderDetailsDialog order={details} onOpenChange={(open) => !open && setDetails(null)} />
      <SalesOrderCancelDialog
        key={cancelTarget?.id ?? "none"}
        order={cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          const result = await cancelSalesOrderAction(cancelTarget.id, {
            version: cancelTarget.version,
            reason,
          });
          if (result.status === "error") {
            toast.error(result.message);
            return;
          }
          toast.success(`ยกเลิกออเดอร์ ${cancelTarget.code} แล้ว`);
          setCancelTarget(null);
          router.refresh();
        }}
      />
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        variant="default"
        title={`ยืนยันออเดอร์ ${confirmTarget?.code ?? ""}?`}
        description="ระบบจะสร้างใบจัดงานขายและจองกล่อง FG ตามลำดับ FIFO หลังยืนยันจะแก้ไขรายการไม่ได้"
        confirmLabel="ยืนยันออเดอร์"
        onConfirm={() => confirmTarget && handleConfirm(confirmTarget)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`ลบร่าง ${deleteTarget?.code ?? ""}?`}
        description="ร่างออเดอร์จะถูกลบถาวร"
        confirmLabel="ลบร่าง"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
      <SalesShortfallDialog shortfalls={shortfalls} onOpenChange={(open) => !open && setShortfalls(null)} />
    </div>
  );
}
