import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { locationResource } from "@/lib/master-data/resources/location";
import { listLocations, type ListLocationsParams } from "@/lib/api/locations";

export const metadata: Metadata = { title: "สถานที่ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={locationResource}
      list={(accessToken, params) => listLocations(accessToken, params as unknown as ListLocationsParams)}
      searchParams={searchParams}
    />
  );
}