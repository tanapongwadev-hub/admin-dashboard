import { PageTitle } from "@/components/ui/page-title";
import type { Metadata } from "next";
import { OrdersTable } from "@/components/orders/order-table";

export const metadata: Metadata = { title: "คำสั่งซื้อ" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <PageTitle>คำสั่งซื้อ</PageTitle>
        <p className="mt-1 text-sm text-fg-muted">ติดตาม จัดส่ง และจัดการคำสั่งซื้อของลูกค้า</p>
      </div>
      <OrdersTable />
    </div>
  );
}
