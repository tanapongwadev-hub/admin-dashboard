import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SalesAccessDenied } from "@/components/sales/sales-access-denied";
import { SalesJobOrderList } from "@/components/sales/sales-job-order-list";
import { listSalesJobOrders } from "@/lib/api/sales";
import { readSalesFilters, SALES_JOB_ORDER_STATUS_LABELS } from "@/lib/filters/sales-filters";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "ใบจัดงานขาย" };

export default async function SalesJobOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  if (
    !session ||
    !(session.user.isSuperAdmin || session.permissions.includes("SALES_JOB_ORDER_VIEW"))
  ) {
    return <SalesAccessDenied title="ใบจัดงานขาย" />;
  }
  const params = await searchParams;
  const filters = readSalesFilters(params, Object.keys(SALES_JOB_ORDER_STATUS_LABELS));
  const accessToken = (await cookies()).get("accessToken")!.value;
  const list = await listSalesJobOrders(accessToken, {
    page: Math.max(1, Number(params.page) || 1),
    limit: 20,
    search: filters.search || undefined,
    status: filters.status || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ใบจัดงานขาย / ตัดสต็อก</h1>
        <p className="mt-1 text-sm text-fg-muted">
          พิมพ์ใบจัดงาน สแกน QR กล่อง FG ที่ระบบจองไว้ แล้วตัดสต็อกขายเพื่อออกเลขที่ใบส่งของ (DO)
        </p>
      </div>
      <SalesJobOrderList jobOrders={list.items} meta={list.meta} />
    </div>
  );
}
