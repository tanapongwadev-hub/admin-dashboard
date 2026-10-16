import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { SalesAccessDenied } from "@/components/sales/sales-access-denied";
import { SalesJobOrderDetailView } from "@/components/sales/sales-job-order-detail";
import { ApiError } from "@/lib/api/client";
import { getSalesJobOrder } from "@/lib/api/sales";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = { title: "รายละเอียดใบจัดงานขาย" };

export default async function SalesJobOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  const can = (code: string) =>
    !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  if (!session || !can("SALES_JOB_ORDER_VIEW")) return <SalesAccessDenied title="ใบจัดงานขาย" />;

  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  const accessToken = (await cookies()).get("accessToken")!.value;
  let jobOrder;
  try {
    jobOrder = await getSalesJobOrder(accessToken, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <SalesJobOrderDetailView
      key={`${jobOrder.id}:${jobOrder.version}`}
      jobOrder={jobOrder}
      canPick={can("SALES_JOB_ORDER_PICK")}
      canIssue={can("SALES_JOB_ORDER_ISSUE")}
      canPrint={can("SALES_JOB_ORDER_PRINT")}
    />
  );
}
