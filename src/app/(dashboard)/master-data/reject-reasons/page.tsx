import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { rejectReasonResource } from "@/lib/master-data/resources/reject-reason";
import { listRejectReasons, type ListRejectReasonsParams } from "@/lib/api/reject-reasons";

export const metadata: Metadata = { title: "เหตุผลการปฏิเสธ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataRejectReasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={rejectReasonResource}
      list={(accessToken, params) => listRejectReasons(accessToken, params as unknown as ListRejectReasonsParams)}
      searchParams={searchParams}
    />
  );
}
