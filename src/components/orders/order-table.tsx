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
          toast.success(`ทำเครื่องหมาย ${o.id} ว่าจัดส่งแล้ว`);
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
    toast.success(`ยกเลิก ${order.id} แล้ว`, { description: "ระบบจะแจ้งเตือนลูกค้าโดยอัตโนมัติ" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input placeholder="ค้นหาด้วยคำสั่งซื้อ ลูกค้า หรืออีเมล" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="สถานะ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกสถานะ</SelectItem>
              <SelectItem value="Pending">รอดำเนินการ</SelectItem>
              <SelectItem value="Processing">กำลังดำเนินการ</SelectItem>
              <SelectItem value="Shipped">จัดส่งแล้ว</SelectItem>
              <SelectItem value="Delivered">ส่งถึงแล้ว</SelectItem>
              <SelectItem value="Cancelled">ยกเลิกแล้ว</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="การชำระเงิน" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">การชำระเงินทั้งหมด</SelectItem>
              <SelectItem value="Paid">ชำระแล้ว</SelectItem>
              <SelectItem value="Refunded">คืนเงินแล้ว</SelectItem>
              <SelectItem value="Failed">ล้มเหลว</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-sm text-fg-muted">เลือกแล้ว {selected.length} รายการ</span>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> ส่งออก
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <DataTable columns={columns} data={filteredData} onRowSelectionChange={setSelected} emptyMessage="ไม่พบคำสั่งซื้อที่ตรงกับตัวกรองของคุณ" />
      </div>

      <OrderDetailsDialog order={viewingOrder} onOpenChange={(v) => !v && setViewingOrder(null)} />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="ยกเลิกคำสั่งซื้อนี้หรือไม่?"
        description={`${cancelTarget?.id ?? "คำสั่งซื้อนี้"} จะถูกทำเครื่องหมายว่ายกเลิก และระบบจะแจ้งเตือนลูกค้าโดยอัตโนมัติ`}
        confirmLabel="ยกเลิกคำสั่งซื้อ"
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
      />
    </div>
  );
}
