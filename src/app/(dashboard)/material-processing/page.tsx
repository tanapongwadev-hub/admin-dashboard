import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert, Scissors } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getProcessingLookups, listMaterialProcessing } from "@/lib/api/material-processing";
import { readProcessingFilters } from "@/lib/filters/material-processing-filters";
import { MaterialProcessingClient } from "@/components/material-processing/material-processing-client";

export const metadata: Metadata = { title: "แปรรูปวัตถุดิบ" };

export default async function MaterialProcessingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getCurrentSession();
  if (!session || (!session.user.isSuperAdmin && !session.permissions.includes("MATERIAL_PROCESSING_VIEW"))) {
    return <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-24"><ShieldAlert className="size-8 text-fg-muted" /><p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าแปรรูปวัตถุดิบ</p></div>;
  }
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) if (typeof value === "string") params.set(key, value);
  const filters = readProcessingFilters(params);
  const pageNumber = Number(params.get("page"));
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const token = (await cookies()).get("accessToken")!.value;
  const [list, lookups] = await Promise.all([
    listMaterialProcessing(token, { page, search: filters.search || undefined, status: filters.status || undefined }),
    getProcessingLookups(token),
  ]);
  return <div className="flex flex-col gap-6">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-primary-soft p-3 text-primary"><Scissors className="size-6" /></div><div><h1 className="text-xl font-semibold text-fg">แปรรูปวัตถุดิบ</h1><p className="mt-1 text-sm text-fg-secondary">รับเข้าต้นทาง → ตัดชิ้นงาน → บรรจุและรับเข้า Material ปลายทางแยก</p></div></div>
    <MaterialProcessingClient list={list} lookups={lookups} canProcess={session.user.isSuperAdmin || session.permissions.includes("MATERIAL_PROCESSING_CREATE")} />
  </div>;
}
