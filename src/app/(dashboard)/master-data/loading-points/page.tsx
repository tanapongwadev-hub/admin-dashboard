import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { loadingPointResource } from "@/lib/master-data/resources/loading-point";

export const metadata: Metadata = { title: "จุดขนถ่าย · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11).
export default function MasterDataLoadingPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return <MasterDataResourcePage resource={loadingPointResource} searchParams={searchParams} />;
}
