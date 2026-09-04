import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listMaterials, getMaterialLookups, listStockBalances, type StockBalance } from "@/lib/api/materials";
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
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าวัสดุ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูวัสดุต้องมีสิทธิ์ Material View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
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

  // Stock quantity is a separate cps-api resource (`/stock-balances`) gated
  // on MATERIALS_RECEIVING_VIEW, not MATERIAL_VIEW — a user can see the
  // materials list without being able to see stock, so this is optional and
  // only fetched when permitted (see AGENTS.md § Materials PC).
  const canViewStock = session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_VIEW");

  const [list, lookups, stockBalances] = await Promise.all([
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
    canViewStock ? listStockBalances(accessToken) : Promise.resolve(null),
  ]);

  const stockByMaterialId = stockBalances
    ? stockBalances.reduce<Record<string, StockBalance>>((map, balance) => {
        map[balance.materialId] = balance;
        return map;
      }, {})
    : null;

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_CREATE") || session.permissions.includes("MATERIAL_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("MATERIAL_DELETE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">วัสดุ · PC</h1>
        <p className="mt-1 text-sm text-fg-muted">วัสดุประเภทชิ้นส่วนจัดซื้อที่ใช้งานทั่วทั้งสายการผลิต</p>
      </div>

      <MaterialPcClient
        materials={list.items}
        meta={list.meta}
        lookups={lookups}
        canEdit={canEdit}
        canDelete={canDelete}
        stockByMaterialId={stockByMaterialId}
      />
    </div>
  );
}
