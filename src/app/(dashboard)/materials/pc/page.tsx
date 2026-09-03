import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listMaterials, getMaterialLookups } from "@/lib/api/materials";
import { MaterialPcClient } from "@/components/materials-pc/material-pc-client";

const PAGE_SIZE = 20;

export default async function MaterialsPcPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIAL_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">You don&apos;t have access to Materials</p>
        <p className="max-w-sm text-sm text-fg-muted">
          Viewing materials requires the Material View permission. Ask an administrator for access.
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

  const [list, lookups] = await Promise.all([
    listMaterials(accessToken, {
      page,
      limit: PAGE_SIZE,
      search,
      isActive,
      type: "PC",
      sortBy: "code",
      sortOrder: "asc",
    }),
    getMaterialLookups(accessToken),
  ]);

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_CREATE") || session.permissions.includes("MATERIAL_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Materials · PC</h1>
        <p className="mt-1 text-sm text-fg-muted">Purchased-component materials used across the line.</p>
      </div>

      <MaterialPcClient
        materials={list.items}
        meta={list.meta}
        lookups={lookups}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
