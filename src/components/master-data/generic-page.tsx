import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { GenericMasterDataClient } from "@/components/master-data/generic-client";
import type { MasterDataResourceConfig, BaseMasterEntity } from "@/lib/master-data/types";

const PAGE_SIZE = 20;

// Generic Server Component body for every simple-master `/master-data/*`
// page — see AGENTS.md § Master-data generic CRUD page. Every existing
// hand-written `page.tsx` files did exactly this (permission gate on
// `${PREFIX}_VIEW/CREATE/UPDATE/DELETE`, read page/search/status from
// searchParams, fetch the initial list, render the client) differing only
// in the permission prefix, list function, and page copy — all of which now
// live on the resource's own descriptor. Each resource's real `page.tsx`
// is now a 3-line wrapper: `export default function Page({ searchParams }) {
// return <MasterDataResourcePage resource={xResource} searchParams={searchParams} />; }`
export async function MasterDataResourcePage<TEntity extends BaseMasterEntity>({
  resource,
  searchParams,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView =
    !!session && (session.user.isSuperAdmin || session.permissions.includes(`${resource.permissionPrefix}_VIEW`));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้า{resource.entityLabel}</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดู{resource.entityLabel}ต้องมีสิทธิ์ {resource.permissionLabelEnglish} กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || undefined;
  const isActive = params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  const list = await resource.list(accessToken, {
    page,
    limit: PAGE_SIZE,
    search,
    isActive,
    sortBy: resource.sortBy,
    sortOrder: "asc",
  });

  // Mirrors every resource's own permission split: create/update gate is on
  // the broader CREATE+UPDATE pair, delete is the dedicated DELETE code.
  // The backend re-checks on every call regardless (UX-only here, not the
  // security boundary).
  const canEdit =
    session.user.isSuperAdmin ||
    session.permissions.includes(`${resource.permissionPrefix}_CREATE`) ||
    session.permissions.includes(`${resource.permissionPrefix}_UPDATE`);
  const canDelete = session.user.isSuperAdmin || session.permissions.includes(`${resource.permissionPrefix}_DELETE`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">{resource.pageTitle}</h1>
        <p className="mt-1 text-sm text-fg-muted">{resource.pageDescription}</p>
      </div>

      <GenericMasterDataClient resourceKey={resource.key} items={list.items} meta={list.meta} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
