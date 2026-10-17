import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Package, ShieldAlert } from "lucide-react";
import { ProductsMovementOverview } from "@/components/products-dashboard/products-movement-overview";
import { Button } from "@/components/ui/button";
import { getProductsOverview } from "@/lib/api/products-dashboard";
import { addDays } from "@/lib/production-day";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "ภาพรวมสินค้า" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ProductsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_VIEW"));
  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" aria-hidden="true" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงภาพรวมสินค้า</p>
        <p className="max-w-sm text-sm text-fg-muted">หน้านี้ต้องใช้สิทธิ์ Products View กรุณาติดต่อผู้ดูแลระบบ</p>
      </div>
    );
  }

  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const to = params.to && DATE.test(params.to) ? (params.to > today ? today : params.to) : today;
  const from = params.from && DATE.test(params.from) ? params.from : addDays(to, -29);
  const accessToken = (await cookies()).get("accessToken")!.value;
  const overview = await getProductsOverview(accessToken, from <= to ? from : to, to).catch(() => null);

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Products control tower</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">ภาพรวมสินค้า</h1>
          <p className="mt-1.5 text-sm text-fg-muted">การรับเข้าจากการผลิตและการจ่ายออกของสินค้าสำเร็จรูป</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/engineering/products">
            <Package className="size-4" aria-hidden="true" />
            ทะเบียนสินค้า
          </Link>
        </Button>
      </header>
      {overview ? (
        <ProductsMovementOverview overview={overview} today={today} />
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">ไม่สามารถโหลดข้อมูลภาพรวมสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>
      )}
    </div>
  );
}
