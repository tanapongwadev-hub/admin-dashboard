import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listProductLots } from "@/lib/api/production-lots";
import { ProductLotReportView } from "@/components/product-lot-report/product-lot-report-view";

export const metadata: Metadata = { title: "รายงานสอบกลับสินค้า" };

const VALID_PAGE_SIZES = [20, 50, 100, 200];

export default async function ProductLotReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  if (!session || !(session.user.isSuperAdmin || session.permissions.includes("PRODUCTION_ORDER_VIEW"))) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงรายงานสอบกลับสินค้า</p>
        <p className="max-w-sm text-sm text-fg-muted">ต้องมีสิทธิ์ดูใบสั่งผลิต กรุณาติดต่อผู้ดูแลระบบ</p>
      </div>
    );
  }
  const p = await searchParams;
  const limit = VALID_PAGE_SIZES.includes(Number(p.limit)) ? Number(p.limit) : 50;
  const filters = {
    search: p.search ?? "",
    dateFrom: p.dateFrom ?? "",
    dateTo: p.dateTo ?? "",
    soldStatus: p.soldStatus ?? "",
  };
  const accessToken = (await cookies()).get("accessToken")!.value;
  const report = await listProductLots(accessToken, {
    ...filters,
    page: String(Math.max(1, Number(p.page) || 1)),
    limit: String(limit),
  });
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">รายงานสอบกลับสินค้า</h1>
      <ProductLotReportView report={report} filters={filters} limit={limit} pageSizes={VALID_PAGE_SIZES} />
    </div>
  );
}
