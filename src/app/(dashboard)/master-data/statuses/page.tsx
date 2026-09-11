import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { statusResource } from "@/lib/master-data/resources/status";

export const metadata: Metadata = { title: "สถานะ · ข้อมูลหลัก" };

export default function MasterDataStatusesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return <MasterDataResourcePage resource={statusResource} searchParams={searchParams} />;
}
