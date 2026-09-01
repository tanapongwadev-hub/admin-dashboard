"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, XCircle, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />
      ),
      enableSorting: false,
      size: 36,
    },
    {
      accessorKey: "id",
      header: "Order",
      cell: ({ row }) => (
        <button className="font-medium text-fg hover:text-primary hover:underline" onClick={() => opts.onView(row.original)}>
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-fg">{row.original.customer}</p>
          <p className="truncate text-xs text-fg-muted">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.date)}</span> },
    { accessorKey: "items", header: "Items", cell: ({ row }) => <span className="tabular-nums text-fg-secondary">{row.original.items}</span> },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "payment",
      header: "Payment",
      cell: ({ row }) => <Badge variant={paymentVariant[row.original.payment]}>{row.original.payment}</Badge>,
    },
    {
      accessorKey: "status",
      header: "Status",
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => opts.onView(row.original)}>
              <Eye className="h-4 w-4" /> View details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => opts.onMarkShipped(row.original)}>
              <Truck className="h-4 w-4" /> Mark as shipped
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => opts.onCancel(row.original)}>
              <XCircle className="h-4 w-4" /> Cancel order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
