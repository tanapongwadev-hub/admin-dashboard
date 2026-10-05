import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { organizationResource } from "@/lib/master-data/resources/organization";
import { listOrganizations, type ListOrganizationsParams } from "@/lib/api/organizations";

export const metadata: Metadata = { title: "องค์กร · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page.
export default function MasterDataOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={organizationResource}
      list={(accessToken, params) => listOrganizations(accessToken, params as unknown as ListOrganizationsParams)}
      searchParams={searchParams}
    />
  );
}
