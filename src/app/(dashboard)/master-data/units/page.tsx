import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { unitResource } from "@/lib/master-data/resources/unit";
import { listUnits, type ListUnitsParams } from "@/lib/api/units";

export const metadata: Metadata = { title: "หน่วยนับ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataUnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={unitResource}
      list={(accessToken, params) => listUnits(accessToken, params as unknown as ListUnitsParams)}
      searchParams={searchParams}
    />
  );
}
