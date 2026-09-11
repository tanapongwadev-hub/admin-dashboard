import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { deliveryTypeResource } from "@/lib/master-data/resources/delivery-type";

export const metadata: Metadata = { title: "ประเภทการจัดส่ง · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11).
export default function MasterDataDeliveryTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return <MasterDataResourcePage resource={deliveryTypeResource} searchParams={searchParams} />;
}
