import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SalesAccessDenied } from "@/components/sales/sales-access-denied";
import { SalesOrderClient } from "@/components/sales/sales-order-client";
import { getSalesLookups, listSalesOrders } from "@/lib/api/sales";
import { readSalesFilters, SALES_ORDER_STATUS_LABELS } from "@/lib/filters/sales-filters";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "ออเดอร์ขาย" };

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const can = (code: string) =>
    !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  if (!session || !can("SALES_ORDER_VIEW")) return <SalesAccessDenied title="ออเดอร์ขาย" />;

  const params = await searchParams;
  const filters = readSalesFilters(params, Object.keys(SALES_ORDER_STATUS_LABELS));
  const accessToken = (await cookies()).get("accessToken")!.value;
  const [list, lookups] = await Promise.all([
    listSalesOrders(accessToken, {
      page: Math.max(1, Number(params.page) || 1),
      limit: 20,
      search: filters.search || undefined,
      status: filters.status || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      customerId: filters.customerId || undefined,
    }),
    getSalesLookups(accessToken),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ออเดอร์ขาย</h1>
        <p className="mt-1 text-sm text-fg-muted">
          สร้างออเดอร์ตามคำสั่งซื้อของลูกค้า — ยืนยันแล้วระบบสร้างใบจัดงานขายและจองกล่อง FG ให้อัตโนมัติ
        </p>
      </div>
      <SalesOrderClient
        orders={list.items}
        meta={list.meta}
        lookups={lookups}
        permissions={{
          create: can("SALES_ORDER_CREATE"),
          update: can("SALES_ORDER_UPDATE"),
          delete: can("SALES_ORDER_DELETE"),
          confirm: can("SALES_ORDER_CONFIRM"),
          cancel: can("SALES_ORDER_CANCEL"),
        }}
      />
    </div>
  );
}
