"use client";

import * as React from "react";
import { Search, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getOrderColumns } from "@/components/orders/columns";
import { OrderDetailsDialog } from "@/components/orders/order-details-dialog";
import { orders as initialOrders } from "@/lib/data";
import type { Order } from "@/lib/types";

export function OrdersTable() {
  const [orders, setOrders] = React.useState<Order[]>(initialOrders);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<Order[]>([]);

  const [viewingOrder, setViewingOrder] = React.useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<Order | null>(null);

  const columns = React.useMemo(
    () =>
      getOrderColumns({
        onView: (o) => setViewingOrder(o),
        onMarkShipped: (o) => {
          setOrders((prev) => prev.map((ord) => (ord.id === o.id ? { ...ord, status: "Shipped" } : ord)));
          toast.success(`${o.id} marked as shipped`);
        },
        onCancel: (o) => setCancelTarget(o),
      }),
    []
  );

  const filteredData = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (paymentFilter !== "all" && o.payment !== paymentFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  function handleCancel(order: Order) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "Cancelled" } : o)));
    toast.success(`${order.id} cancelled`, { description: "The customer will be notified automatically." });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input placeholder="Search by order, customer, email" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Shipped">Shipped</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Payment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-sm text-fg-muted">{selected.length} selected</span>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <DataTable columns={columns} data={filteredData} onRowSelectionChange={setSelected} emptyMessage="No orders match your filters." />
      </div>

      <OrderDetailsDialog order={viewingOrder} onOpenChange={(v) => !v && setViewingOrder(null)} />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="Cancel this order?"
        description={`${cancelTarget?.id ?? "This order"} will be marked as cancelled and the customer notified.`}
        confirmLabel="Cancel order"
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
      />
    </div>
  );
}
