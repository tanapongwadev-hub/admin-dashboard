import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { MaterialJobOrderDetailView } from "@/components/material-job-orders/job-order-detail";
import { ApiError } from "@/lib/api/client";
import { getMaterialJobOrder } from "@/lib/api/material-job-orders";
import { getCurrentSession } from "@/lib/session";

export default async function MaterialJobOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
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
      </div>
    );
  }

  const { id } = await params;
  const { print } = await searchParams;
  const accessToken = (await cookies()).get("accessToken")!.value;
  let jobOrder;
  try {
    jobOrder = await getMaterialJobOrder(accessToken, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const canPick =
    session.user.isSuperAdmin ||
    session.permissions.includes("MATERIAL_JOB_ORDER_PICK");
  const canIssue =
    session.user.isSuperAdmin ||
    session.permissions.includes("MATERIAL_JOB_ORDER_ISSUE");
  const canPrint =
    session.user.isSuperAdmin ||
    session.permissions.includes("MATERIAL_JOB_ORDER_PRINT");

  return (
    <MaterialJobOrderDetailView
      jobOrder={jobOrder}
      canPick={canPick}
      canIssue={canIssue}
      canPrint={canPrint}
      autoPrint={print === "1"}
    />
  );
}
