import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { statusResource } from "@/lib/master-data/resources/status";
import { listStatusItems, type ListStatusItemsParams } from "@/lib/api/status-items";

export const metadata: Metadata = { title: "สถานะ · ข้อมูลหลัก" };

// `list` is passed here, not on the resource descriptor — see
// `MasterDataListFn` in lib/master-data/types.ts (2026-09-19
// client-bundle-leak fix).
export default function MasterDataStatusesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={statusResource}
      list={(accessToken, params) => listStatusItems(accessToken, params as unknown as ListStatusItemsParams)}
      searchParams={searchParams}
    />
  );
}
