"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
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
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { Product, ProductStatus } from "@/lib/types";

const statusVariant: Record<ProductStatus, NonNullable<BadgeProps["variant"]>> = {
  "In stock": "success",
  "Low stock": "warning",
  "Out of stock": "danger",
  Draft: "neutral",
};

export function getProductColumns(opts: {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}): ColumnDef<Product>[] {
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
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-muted">
            <Package className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{row.original.name}</p>
            <p className="truncate text-xs text-fg-muted">{row.original.sku}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: "category", header: "Category", cell: ({ row }) => <span className="text-fg-secondary">{row.original.category}</span> },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span className="tabular-nums font-medium text-fg">{formatCurrency(row.original.price)}</span>,
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => <span className="tabular-nums text-fg-secondary">{formatNumber(row.original.stock)}</span>,
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
      accessorKey: "sales",
      header: "Sales",
      cell: ({ row }) => <span className="tabular-nums text-fg-secondary">{formatNumber(row.original.sales)}</span>,
    },
    {
      accessorKey: "updated",
      header: "Updated",
      cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.updated)}</span>,
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
            <DropdownMenuItem onSelect={() => opts.onEdit(row.original)}>
              <Pencil className="h-4 w-4" /> Edit product
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => opts.onDelete(row.original)}>
              <Trash2 className="h-4 w-4" /> Delete product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
