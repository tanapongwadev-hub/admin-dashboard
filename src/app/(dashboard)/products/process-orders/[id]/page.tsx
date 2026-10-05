import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { LotOrderBoard } from "@/components/production-lots/lot-order-board";
import { ProductionOrderDetail } from "@/components/production-orders/production-order-detail";
import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/client";
import { getProductionOrder } from "@/lib/api/production-orders";
import { getLineBoard } from "@/lib/api/production-lots";
import { listRejectReasons } from "@/lib/api/reject-reasons";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "รายละเอียดใบสั่งผลิต" };

// Real route (not a dialog): deep-linkable and meant to stay open on a
// shop-floor tablet while packets are scanned through their steps.
export default async function ProductionOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  const can = (permission: string) =>
    !!session && (session.user.isSuperAdmin || session.permissions.includes(permission));

  if (!can("PRODUCTION_ORDER_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์ดูใบสั่งผลิต</p>
        <p className="max-w-sm text-sm text-fg-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Production Order View</p>
      </div>
    );
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const accessToken = (await cookies()).get("accessToken")!.value;
  const order = await getProductionOrder(accessToken, id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  const backLink = (
    <Link
      href="/products/process-orders?tab=orders"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-fg-secondary hover:text-fg"
    >
      <ArrowLeft className="size-4" aria-hidden /> กลับไปรายการสั่งผลิต
    </Link>
  );

  if (order.trackingModel === "LOT") {
    const [boards, rejectReasons] = await Promise.all([
      Promise.all(order.lines.map((line) => getLineBoard(accessToken, line.id))),
      can("REJECT_REASON_VIEW")
        ? listRejectReasons(accessToken, { limit: 100, isActive: true })
            .then((res) => res.items.map((r) => ({ id: r.id, code: r.code, nameTh: r.nameTh })))
            .catch(() => [])
        : Promise.resolve([]),
    ]);
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-xl font-semibold text-fg">{order.code}</h1>
          <Badge variant="info">ระบบ Lot</Badge>
          {order.status === "COMPLETED" && <Badge variant="success">เสร็จสิ้น</Badge>}
        </div>
        <LotOrderBoard
          orderCode={order.code}
          initialBoards={boards}
          rejectReasons={rejectReasons}
          canAct={can("PRODUCTION_ORDER_ADVANCE")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {backLink}
      <ProductionOrderDetail initialOrder={order} canAdvance={can("PRODUCTION_ORDER_ADVANCE")} />
    </div>
  );
}
