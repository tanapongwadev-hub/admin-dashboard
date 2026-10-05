import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Eye, ShieldAlert, Workflow } from "lucide-react";
import { CreateOrderButton } from "@/components/production-orders/create-order-button";
import { ProcessOrderRowActions } from "@/components/production-plans/process-order-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProductionOrders } from "@/lib/api/production-orders";
import { listProductionPlans } from "@/lib/api/production-plans";
import { getCurrentSession } from "@/lib/session";
import { formatDate, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const LIMIT = 20;
type Tab = "ready" | "orders";

/**
 * การสั่งผลิตตามกระบวนการ
 *  - tab "ready"  : plans whose Job Order is fully issued (จ่ายออกครบแล้ว) and
 *                   that have no production order yet — has the "สั่งผลิต" button.
 *  - tab "orders" : production orders already placed; boxes + QR are created
 *                   only when real output is recorded (line hold).
 */
export default async function ProductProcessOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const can = (permission: string) =>
    !!session &&
    (session.user.isSuperAdmin || session.permissions.includes(permission));

  if (!can("PRODUCTION_ORDER_VIEW") || !can("PRODUCTION_PLAN_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">
          คุณไม่มีสิทธิ์เข้าถึงการสั่งผลิตตามกระบวนการ
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Production Order View และ
          Production Plan View
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const tab: Tab = params.tab === "orders" ? "orders" : "ready";
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const accessToken = (await cookies()).get("accessToken")!.value;

  const href = (overrides: { tab?: Tab; page?: number }) => {
    const q = new URLSearchParams();
    q.set("tab", overrides.tab ?? tab);
    if (search && !overrides.tab) q.set("search", search);
    if (overrides.page && overrides.page > 1) q.set("page", String(overrides.page));
    return `/products/process-orders?${q}`;
  };

  let body: React.ReactNode;
  let meta = { totalPages: 1, totalItems: 0 };
  // Ready tab: plans are paged by the plan API, then already-ordered plans
  // are removed, so the page summary states both numbers explicitly.
  let summary = "";

  if (tab === "ready") {
    const list = await listProductionPlans(accessToken, {
      page,
      limit: LIMIT,
      search,
      status: "ISSUED",
    });
    // Plan ISSUED already implies the Job Order is fully issued; keep the
    // explicit check so a half-issued plan never leaks into the list.
    const issued = list.items.filter((p) => p.jobOrder?.status === "ISSUED");
    const ordered = issued.length
      ? await listProductionOrders(accessToken, {
          limit: 100,
          planIds: issued.map((p) => p.id),
        })
      : { items: [] };
    const orderedPlanIds = new Set(ordered.items.map((o) => o.productionPlanId));
    const plans = issued.filter((p) => !orderedPlanIds.has(p.id));
    meta = list.meta;
    summary = `รอสั่งผลิต ${plans.length} รายการในหน้านี้ (จากแผนที่จ่ายวัตถุดิบครบ ${list.meta.totalItems} แผน)`;

    body =
      plans.length === 0 ? (
        <EmptyState
          title="ไม่มีแผนที่รอสั่งผลิต"
          hint="แผนที่ใบจัดงานจ่ายวัตถุดิบออกครบและยังไม่ได้สั่งผลิตจะแสดงที่นี่"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>แผนการผลิต</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">จำนวนที่ต้องผลิต</TableHead>
                <TableHead>ใบจัดงาน</TableHead>
                <TableHead>จ่ายออกครบเมื่อ</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">การจัดการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <p className="whitespace-nowrap font-mono text-sm font-medium text-fg">
                      {plan.code}
                    </p>
                    {plan.title && (
                      <p className="text-xs text-fg-muted">{plan.title}</p>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[14rem]">
                    <ul className="flex flex-col gap-0.5 text-sm">
                      {plan.lines.map((line) => (
                        <li key={line.id}>
                          <span className="font-mono text-fg-secondary">
                            {line.product.code}
                          </span>{" "}
                          {line.product.name}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right">
                    <ul className="flex flex-col gap-0.5 text-sm tabular-nums">
                      {plan.lines.map((line) => (
                        <li key={line.id} className="font-semibold text-fg">
                          {formatNumber(line.quantity)}
                        </li>
                      ))}
                    </ul>
                    {plan.lines.length > 1 && (
                      <p className="mt-1 border-t border-border pt-1 text-xs tabular-nums text-fg-muted">
                        รวม{" "}
                        {formatNumber(
                          plan.lines.reduce((s, l) => s + Number(l.quantity), 0),
                        )}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.jobOrder && (
                      <Link
                        href={`/materials/job-orders/${plan.jobOrder.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {plan.jobOrder.code}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-fg-secondary">
                    {plan.issuedAt ? formatDate(plan.issuedAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {can("PRODUCTION_ORDER_CREATE") && (
                        <CreateOrderButton planId={plan.id} planCode={plan.code} />
                      )}
                      <ProcessOrderRowActions
                        plan={{
                          code: plan.code,
                          jobOrderId: plan.jobOrder?.id ?? null,
                        }}
                        permissions={{
                          canViewJobOrder: can("MATERIAL_JOB_ORDER_VIEW"),
                          canPrintJobOrder: can("MATERIAL_JOB_ORDER_PRINT"),
                          canViewPlan: true,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
  } else {
    const list = await listProductionOrders(accessToken, {
      page,
      limit: LIMIT,
      search,
    });
    meta = list.meta;

    body =
      list.items.length === 0 ? (
        <EmptyState
          title="ยังไม่มีใบสั่งผลิต"
          hint="กด “สั่งผลิต” ในแท็บ รอสั่งผลิต เพื่อสร้างใบสั่งผลิต แล้วบันทึกผลผลิตจริงเพื่อสร้างกล่องและ QR"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ใบสั่งผลิต</TableHead>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">ผลิตแล้ว / แผน (ชิ้น)</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>สั่งผลิตเมื่อ</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">การจัดการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <p className="whitespace-nowrap font-mono text-sm font-medium text-fg">
                      {order.code}
                    </p>
                    <p className="text-xs text-fg-muted">
                      แผน {order.planCode ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-[14rem]">
                    <ul className="flex flex-col gap-0.5 text-sm">
                      {order.lines.map((line) => (
                        <li key={line.id}>
                          <span className="font-mono text-fg-secondary">
                            {line.product?.code}
                          </span>{" "}
                          {line.product?.name}{" "}
                          <span className="text-fg-muted">
                            × {formatNumber(line.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatNumber(order.lines.reduce((s, l) => s + l.producedQuantity, 0))}/
                    {formatNumber(order.lines.reduce((s, l) => s + l.quantity, 0))}
                    <p className="text-xs text-fg-muted">
                      กล่องเสร็จ {order.completedPacketCount}/{order.packetCount}
                    </p>
                  </TableCell>
                  <TableCell>
                    {order.status === "COMPLETED" ? (
                      <Badge variant="success">ผลิตเสร็จแล้ว</Badge>
                    ) : (
                      <Badge variant="info">กำลังผลิต</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-fg-secondary">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/products/process-orders/${order.id}`}
                        aria-label={`ดูรายละเอียด ${order.code}`}
                      >
                        <Eye className="size-4" aria-hidden />
                        รายละเอียด
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
  }

  const tabClass = (active: boolean) =>
    cn(
      "-mb-px border-b-2 px-4 py-2 text-sm font-semibold",
      active
        ? "border-primary text-primary"
        : "border-transparent text-fg-secondary hover:text-fg",
    );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">การสั่งผลิตตามกระบวนการ</h1>
        <p className="mt-1 text-sm text-fg-muted">
          สั่งผลิตจากแผนที่จ่ายวัตถุดิบครบแล้ว บันทึกผลผลิตจริงเพื่อสร้างกล่องและ QR
          แล้วติดตามว่าแต่ละกล่องอยู่ขั้นตอนไหน
        </p>
      </div>

      <nav className="flex border-b border-border" aria-label="แท็บการสั่งผลิต">
        <Link
          href={href({ tab: "ready" })}
          className={tabClass(tab === "ready")}
          aria-current={tab === "ready" ? "page" : undefined}
        >
          รอสั่งผลิต
        </Link>
        <Link
          href={href({ tab: "orders" })}
          className={tabClass(tab === "orders")}
          aria-current={tab === "orders" ? "page" : undefined}
        >
          สั่งผลิตแล้ว
        </Link>
      </nav>

      <form className="flex gap-2" action="/products/process-orders">
        <input type="hidden" name="tab" value={tab} />
        <Input
          name="search"
          defaultValue={search}
          placeholder="ค้นหารหัสแผน / ใบสั่งผลิต / สินค้า"
          aria-label="ค้นหา"
          className="w-full max-w-sm"
        />
        <Button type="submit">ค้นหา</Button>
      </form>

      {body}

      <div className="flex items-center justify-between text-sm text-fg-muted">
        <span>
          หน้า {page} จาก {Math.max(meta.totalPages, 1)} ·{" "}
          {summary || `ทั้งหมด ${meta.totalItems} รายการ`}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="rounded-md border border-border px-3 py-1.5"
              href={href({ page: page - 1 })}
            >
              ก่อนหน้า
            </Link>
          )}
          {page < meta.totalPages && (
            <Link
              className="rounded-md border border-border px-3 py-1.5"
              href={href({ page: page + 1 })}
            >
              ถัดไป
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <Workflow className="size-8 text-fg-muted" />
      <p className="text-lg font-semibold text-fg">{title}</p>
      <p className="max-w-sm text-sm text-fg-muted">{hint}</p>
    </div>
  );
}

export const metadata: Metadata = { title: "การสั่งผลิตตามกระบวนการ" };
