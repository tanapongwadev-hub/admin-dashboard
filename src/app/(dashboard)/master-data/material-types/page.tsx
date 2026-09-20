import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { materialTypeResource } from "@/lib/master-data/resources/material-type";
import { listMaterialTypes, type ListMaterialTypesParams } from "@/lib/api/material-types";

export const metadata: Metadata = { title: "ประเภทวัสดุ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataMaterialTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={materialTypeResource}
      list={(accessToken, params) => listMaterialTypes(accessToken, params as unknown as ListMaterialTypesParams)}
      searchParams={searchParams}
    />
  );
}
