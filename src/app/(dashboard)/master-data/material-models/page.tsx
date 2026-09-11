import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { materialModelResource } from "@/lib/master-data/resources/material-model";

export const metadata: Metadata = { title: "รุ่นวัสดุ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11).
export default function MasterDataMaterialModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return <MasterDataResourcePage resource={materialModelResource} searchParams={searchParams} />;
}
