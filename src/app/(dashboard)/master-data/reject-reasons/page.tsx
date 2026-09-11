import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { rejectReasonResource } from "@/lib/master-data/resources/reject-reason";

export const metadata: Metadata = { title: "เหตุผลการปฏิเสธ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11).
export default function MasterDataRejectReasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return <MasterDataResourcePage resource={rejectReasonResource} searchParams={searchParams} />;
}
