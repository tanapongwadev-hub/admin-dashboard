import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { loadingPointResource } from "@/lib/master-data/resources/loading-point";
import { listLoadingPoints, type ListLoadingPointsParams } from "@/lib/api/loading-points";

export const metadata: Metadata = { title: "จุดขนถ่าย · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataLoadingPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={loadingPointResource}
      list={(accessToken, params) => listLoadingPoints(accessToken, params as unknown as ListLoadingPointsParams)}
      searchParams={searchParams}
    />
  );
}
