import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { customerResource } from "@/lib/master-data/resources/customer";
import { listCustomers, type ListCustomersParams } from "@/lib/api/customers";

export const metadata: Metadata = { title: "ลูกค้า · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={customerResource}
      list={(accessToken, params) => listCustomers(accessToken, params as unknown as ListCustomersParams)}
      searchParams={searchParams}
    />
  );
}