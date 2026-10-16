import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SalesAccessDenied } from "@/components/sales/sales-access-denied";
import { SalesReportView } from "@/components/sales/sales-report-view";
import { getSalesLookups, getSalesReport } from "@/lib/api/sales";
import { readSalesFilters } from "@/lib/filters/sales-filters";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "รายงานการขาย" };

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  if (
    !session ||
    !(session.user.isSuperAdmin || session.permissions.includes("SALES_REPORT_VIEW"))
  ) {
    return <SalesAccessDenied title="รายงานการขาย" />;
  }
  const params = await searchParams;
  const filters = readSalesFilters(params, []);
  const accessToken = (await cookies()).get("accessToken")!.value;
  const [report, lookups] = await Promise.all([
    getSalesReport(accessToken, {
      page: Math.max(1, Number(params.page) || 1),
      limit: 50,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      customerId: filters.customerId || undefined,
      productId: filters.productId || undefined,
    }),
    // Filter options only; a viewer without order access still sees the report.
    getSalesLookups(accessToken).catch(() => ({ customers: [], products: [] })),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">รายงานการขาย</h1>
        <p className="mt-1 text-sm text-fg-muted">
          ยอดออเดอร์ ยอดส่งสินค้า และรายการตัดสต็อกขายรายกล่อง — ยอดส่งนับตามวันที่ตัดสต็อก ยอดออเดอร์นับตามวันที่สั่ง
        </p>
      </div>
      <SalesReportView report={report} lookups={lookups} />
    </div>
  );
}
