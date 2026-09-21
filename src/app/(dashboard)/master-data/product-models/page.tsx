import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { productModelResource } from "@/lib/master-data/resources/product-model";
import { listProductModels, type ListProductModelsParams } from "@/lib/api/product-models";

export const metadata: Metadata = { title: "รุ่นสินค้า · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataProductModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={productModelResource}
      list={(accessToken, params) => listProductModels(accessToken, params as unknown as ListProductModelsParams)}
      searchParams={searchParams}
    />
  );
}