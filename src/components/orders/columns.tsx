"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Eye, XCircle, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

const statusVariant: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  Pending: "warning",
  Processing: "primary",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "danger",
};

const paymentVariant: Record<Order["payment"], NonNullable<BadgeProps["variant"]>> = {
  Paid: "success",
  Refunded: "neutral",
  Failed: "danger",
};

export function getOrderColumns(opts: {
  onView: (order: Order) => void;
  onMarkShipped: (order: Order) => void;
  onCancel: (order: Order) => void;
}): ColumnDef<Order>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="เลือกทั้งหมด"
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="เลือกแถว" />
      ),
      enableSorting: false,
      size: 36,
    },
    {
      accessorKey: "id",
      header: "คำสั่งซื้อ",
      cell: ({ row }) => (
        <button className="font-medium text-fg hover:text-primary hover:underline" onClick={() => opts.onView(row.original)}>
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "customer",
      header: "ลูกค้า",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-fg">{row.original.customer}</p>
          <p className="truncate text-xs text-fg-muted">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "date", header: "วันที่", cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.date)}</span> },
    { accessorKey: "items", header: "รายการ", cell: ({ row }) => <span className="tabular-nums text-fg-secondary">{row.original.items}</span> },
    {
      accessorKey: "amount",
      header: "ยอดเงิน",
      cell: ({ row }) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "payment",
      header: "การชำระเงิน",
      cell: ({ row }) => <Badge variant={paymentVariant[row.original.payment]}>{row.original.payment}</Badge>,
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} dot>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActionsMenu itemLabel={`คำสั่งซื้อ ${row.original.id}`} actions={getOrderRowActions(row.original, opts)} />
        </div>
      ),
    },
  ];
}

// Pure — exported for tests. This page still has no real permission wiring
// (mock data, not yet connected to cps-api), so all three actions are always
// offered; there is no existing permission logic to preserve here yet.
export function getOrderRowActions(
  order: Order,
  handlers: {
    onView: (order: Order) => void;
    onMarkShipped: (order: Order) => void;
    onCancel: (order: Order) => void;
  }
): RowAction[] {
  return [
    { label: "ดูรายละเอียด", icon: Eye, onSelect: () => handlers.onView(order), variant: "default" },
    { label: "ทำเครื่องหมายว่าจัดส่งแล้ว", icon: Truck, onSelect: () => handlers.onMarkShipped(order), variant: "default" },
    { label: "ยกเลิกคำสั่งซื้อ", icon: XCircle, onSelect: () => handlers.onCancel(order), variant: "danger" },
  ];
}
