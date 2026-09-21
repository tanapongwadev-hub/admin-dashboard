import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { productTypeResource } from "@/lib/master-data/resources/product-type";
import { listProductTypes, type ListProductTypesParams } from "@/lib/api/product-types";

export const metadata: Metadata = { title: "ประเภทสินค้า · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataProductTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={productTypeResource}
      list={(accessToken, params) => listProductTypes(accessToken, params as unknown as ListProductTypesParams)}
      searchParams={searchParams}
    />
  );
}