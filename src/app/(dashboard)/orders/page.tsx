import type { Metadata } from "next";
import { OrdersTable } from "@/components/orders/order-table";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Orders</h1>
        <p className="mt-1 text-sm text-fg-muted">Track, fulfil and manage customer orders.</p>
      </div>
      <OrdersTable />
    </div>
  );
}
