import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { processStepResource } from "@/lib/master-data/resources/process-step";
import { listProcessSteps, type ListProcessStepsParams } from "@/lib/api/process-steps";

export const metadata: Metadata = { title: "กระบวนการผลิต · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page.
export default function MasterDataProcessStepsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={processStepResource}
      list={(accessToken, params) => listProcessSteps(accessToken, params as unknown as ListProcessStepsParams)}
      searchParams={searchParams}
    />
  );
}
