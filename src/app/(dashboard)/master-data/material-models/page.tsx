import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { materialModelResource } from "@/lib/master-data/resources/material-model";
import { listMaterialModels, type ListMaterialModelsParams } from "@/lib/api/material-models";

export const metadata: Metadata = { title: "รุ่นวัสดุ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataMaterialModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={materialModelResource}
      list={(accessToken, params) => listMaterialModels(accessToken, params as unknown as ListMaterialModelsParams)}
      searchParams={searchParams}
    />
  );
}
