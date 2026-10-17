import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { MaterialsDashboardView } from "@/components/materials-dashboard/materials-dashboard-view";
import { listMaterialInventory, listMaterials } from "@/lib/api/materials";
import { listMaterialsReceiving } from "@/lib/api/materials-receiving";
import { getMaterialsOverview, type MaterialsOverview } from "@/lib/api/materials-dashboard";
import { addDays } from "@/lib/production-day";
import { getCurrentSession } from "@/lib/session";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function MaterialsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const canViewMaterials = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIAL_VIEW"));
  const canViewStock = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_VIEW"));

  const canViewDisbursement = !!session && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_DISBURSEMENT_VIEW"));

  if (!session || (!canViewMaterials && !canViewStock && !canViewDisbursement)) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" aria-hidden="true" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงภาพรวมวัตถุดิบ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          หน้านี้ต้องใช้สิทธิ์ Material View หรือ Materials Receiving View กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    );
  }

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Stock and receiving share MATERIALS_RECEIVING_VIEW. Keep the fallback
  // material count separate so MATERIAL_VIEW-only users still get a useful
  // landing page without requesting an endpoint they cannot access.
  const inventoryPromise = canViewStock
    ? Promise.all([
        listMaterialInventory(accessToken, {
          page: 1,
          limit: 6,
          isActive: true,
          stockStatus: "OUT_OF_STOCK",
          sortBy: "code",
          sortOrder: "asc",
        }),
        listMaterialInventory(accessToken, {
          page: 1,
          limit: 6,
          isActive: true,
          stockStatus: "LOW_STOCK",
          sortBy: "currentStock",
          sortOrder: "asc",
        }),
      ])
    : Promise.resolve(null);
  const materialListPromise = !canViewStock && canViewMaterials
    ? listMaterials(accessToken, { page: 1, limit: 1, isActive: true, sortBy: "code", sortOrder: "asc" })
    : Promise.resolve(null);
  const receivingPromise = canViewStock
    ? listMaterialsReceiving(accessToken, {
        page: 1,
        limit: 6,
        sortBy: "receiveDate",
        sortOrder: "desc",
      })
    : Promise.resolve(null);

  // Receiving/disbursement overview for the chosen range (default: last 30 days).
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const to = params.to && DATE.test(params.to) ? (params.to > today ? today : params.to) : today;
  const from = params.from && DATE.test(params.from) ? params.from : addDays(to, -29);
  const overviewPromise: Promise<MaterialsOverview | null> =
    canViewStock || canViewDisbursement
      ? getMaterialsOverview(accessToken, from <= to ? from : to, to).catch(() => null)
      : Promise.resolve(null);

  const [inventoryPages, materialList, receivingList, overview] = await Promise.all([
    inventoryPromise,
    materialListPromise,
    receivingPromise,
    overviewPromise,
  ]);

  const inventorySummary = inventoryPages?.[0].summary ?? null;
  const criticalMaterials = inventoryPages
    ? [...inventoryPages[0].items, ...inventoryPages[1].items].slice(0, 6)
    : [];

  return (
    <MaterialsDashboardView
      inventorySummary={inventorySummary}
      materialTotal={inventorySummary?.total ?? materialList?.meta.totalItems ?? 0}
      criticalMaterials={criticalMaterials}
      recentReceivings={receivingList?.items ?? []}
      receivingTotal={receivingList?.meta.totalItems ?? null}
      overview={overview}
      today={today}
      canViewMaterials={canViewMaterials}
      canViewStock={canViewStock}
      canCreateReceiving={canViewStock && (session.user.isSuperAdmin || session.permissions.includes("MATERIALS_RECEIVING_CREATE"))}
    />
  );
}

export const metadata: Metadata = { title: "ภาพรวมวัตถุดิบ" };
