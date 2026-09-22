import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { ProductionPlanClient } from "@/components/production-plans/production-plan-client";
import {
  getProductionPlanLookups,
  listProductionPlans,
  type ProductionPlanStatus,
} from "@/lib/api/production-plans";
import { getCurrentSession } from "@/lib/session";

const STATUSES: ProductionPlanStatus[] = [
  "DRAFT",
  "APPROVED",
  "ISSUED",
  "CANCELLED",
  "EXPIRED",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ProductionPlansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const can = (permission: string) =>
    !!session &&
    (session.user.isSuperAdmin || session.permissions.includes(permission));
  if (!can("PRODUCTION_PLAN_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">
          คุณไม่มีสิทธิ์เข้าถึงแผนการผลิต
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Production Plan View
        </p>
      </div>
    );
  }
  const params = await searchParams;
  const status = STATUSES.includes(params.status as ProductionPlanStatus)
    ? (params.status as ProductionPlanStatus)
    : undefined;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const [list, lookups] = await Promise.all([
    listProductionPlans(accessToken, {
      page: Math.max(1, Number(params.page) || 1),
      limit: 20,
      search: params.search?.trim() || undefined,
      status,
      needByDateFrom:
        params.needByDateFrom && DATE.test(params.needByDateFrom)
          ? params.needByDateFrom
          : undefined,
      needByDateTo:
        params.needByDateTo && DATE.test(params.needByDateTo)
          ? params.needByDateTo
          : undefined,
    }),
    getProductionPlanLookups(accessToken),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">แผนการผลิต</h1>
        <p className="mt-1 text-sm text-fg-muted">
          วางแผน กันวัตถุดิบตาม FIFO และออกใบเบิกเพื่อผลิตจากแหล่งข้อมูลเดียว
        </p>
      </div>
      <ProductionPlanClient
        plans={list.items}
        meta={list.meta}
        lookups={lookups}
        canCreate={can("PRODUCTION_PLAN_CREATE")}
        canUpdate={can("PRODUCTION_PLAN_UPDATE")}
        canDelete={can("PRODUCTION_PLAN_DELETE")}
        canApprove={can("PRODUCTION_PLAN_APPROVE")}
        canIssue={can("PRODUCTION_PLAN_ISSUE")}
        canCancel={can("PRODUCTION_PLAN_CANCEL")}
      />
    </div>
  );
}
