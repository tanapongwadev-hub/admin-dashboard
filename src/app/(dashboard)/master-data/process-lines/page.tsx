import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { processLineResource } from "@/lib/master-data/resources/process-line";
import { listProcessLines, type ListProcessLinesParams } from "@/lib/api/process-lines";

export const metadata: Metadata = { title: "สายการผลิต · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). `list` is
// passed here, not on the resource descriptor — see `MasterDataListFn` in
// lib/master-data/types.ts (2026-09-19 client-bundle-leak fix).
export default function MasterDataProcessLinesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={processLineResource}
      list={(accessToken, params) => listProcessLines(accessToken, params as unknown as ListProcessLinesParams)}
      searchParams={searchParams}
    />
  );
}