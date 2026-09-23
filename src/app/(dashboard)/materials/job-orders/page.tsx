import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { MaterialJobOrderClient } from "@/components/material-job-orders/job-order-client";
import { listMaterialJobOrders } from "@/lib/api/material-job-orders";
import { MATERIAL_JOB_ORDER_STATUSES } from "@/lib/filters/material-job-orders-filters";
import { getCurrentSession } from "@/lib/session";

const PAGE_SIZE = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// URL matches cps-api's own seeded menu path (/materials/job-orders, code
// MATERIAL_JOB_ORDERS) — a new SUB menu under MATERIALS_MANAGEMENTS
// (see AGENTS.md § Job Orders / migration
// 1790400000001-AddMaterialJobOrderMenuAndPermissions.ts). List shows every
// Job Order that resulted from an approved Production Plan; the default
// filter narrows to the still-open statuses so a warehouse worker's list
// isn't cluttered with already-ISSUED/CANCELLED history.
export default async function MaterialJobOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const canView =
    !!session &&
    (session.user.isSuperAdmin ||
      session.permissions.includes("MATERIAL_JOB_ORDER_VIEW"));
  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">
          คุณไม่มีสิทธิ์เข้าถึงใบจัดงาน
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Material Job Order View
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const status = params.status && MATERIAL_JOB_ORDER_STATUSES.includes(params.status as never)
    ? params.status
    : undefined;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const list = await listMaterialJobOrders(accessToken, {
    page: Math.max(1, Number(params.page) || 1),
    limit: PAGE_SIZE,
    search: params.search?.trim() || undefined,
    status,
    approvedDateFrom:
      params.approvedDateFrom && DATE.test(params.approvedDateFrom)
        ? params.approvedDateFrom
        : undefined,
    approvedDateTo:
      params.approvedDateTo && DATE.test(params.approvedDateTo)
        ? params.approvedDateTo
        : undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ใบจัดงาน</h1>
        <p className="mt-1 text-sm text-fg-muted">
          รายการเตรียมวัตถุดิบจากแผนการผลิตที่อนุมัติแล้ว — พิมพ์ใบจัดงาน
          หยิบสินค้าตาม QR ที่กันไว้ แล้วจ่ายออก
        </p>
      </div>
      <MaterialJobOrderClient
        jobOrders={list.items}
        meta={list.meta}
        canPrint={
          session.user.isSuperAdmin ||
          session.permissions.includes("MATERIAL_JOB_ORDER_PRINT")
        }
      />
    </div>
  );
}
