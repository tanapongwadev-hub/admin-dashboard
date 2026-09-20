import type { Metadata } from "next";
import { MasterDataResourcePage } from "@/components/master-data/generic-page";
import { categoryResource } from "@/lib/master-data/resources/category";
import { listCategories, type ListCategoriesParams } from "@/lib/api/categories";

export const metadata: Metadata = { title: "หมวดหมู่ · ข้อมูลหลัก" };

// Thin per-route wrapper around the generic `/master-data/*` CRUD page —
// see AGENTS.md § Master-data generic CRUD page (2026-09-11). All the real
// logic (permission gate, list fetch, dialogs) lives in
// `MasterDataResourcePage` + the shared generic UI components; this file's
// only job is binding them to Categories' own descriptor.
//
// `list` is passed here, not on `categoryResource` itself — see the
// comment on `MasterDataListFn` in lib/master-data/types.ts (2026-09-19
// client-bundle-leak fix). Only this file (a Server Component) touches
// `listCategories`/`lib/api/*`.
export default function MasterDataCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  return (
    <MasterDataResourcePage
      resource={categoryResource}
      list={(accessToken, params) => listCategories(accessToken, params as unknown as ListCategoriesParams)}
      searchParams={searchParams}
    />
  );
}
