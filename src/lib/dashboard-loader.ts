import { getDashboardSummary } from "@/lib/api/dashboard";
import { listMaterialInventory, type MaterialInventoryItem, type MaterialInventorySummary } from "@/lib/api/materials";
import { listMaterialsReceiving, type MaterialReceiving } from "@/lib/api/materials-receiving";
import { listMaterialsDisbursement, type MaterialsDisbursement } from "@/lib/api/materials-disbursement";
import type { StockDocument, StockDocStatus, StockMovementPoint, WatchlistItem } from "@/lib/dashboard-data";

export interface DashboardData {
  canViewStock: boolean;
  canViewReceiving: boolean;
  canViewDisbursement: boolean;
  /** One point per day (oldest first). Values are confirmed document counts. */
  trend: StockMovementPoint[];
  inventory: MaterialInventorySummary | null;
  /** Row counts per raw status value. */
  productionOrders: Record<string, number>;
  productionPlans: Record<string, number>;
  watchlist: WatchlistItem[];
  documents: StockDocument[];
  /** Confirmed documents in the last 7 days, used for the KPI cards. */
  receivedLast7: number;
  disbursedLast7: number;
  loadedAt: string;
}

interface Session {
  user: { isSuperAdmin: boolean };
  permissions: string[];
}

const can = (session: Session, code: string) => session.user.isSuperAdmin || session.permissions.includes(code);

function dayLabel(isoDate: string) {
  return new Date(`${isoDate}T00:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
}

const quiet = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);

const receivingStatus = (status: MaterialReceiving["status"]): StockDocStatus =>
  status === "confirmed" ? "Confirmed" : status === "cancelled" ? "Cancelled" : "Draft";

const disbursementStatus = (status: MaterialsDisbursement["status"]): StockDocStatus =>
  status === "confirmed" ? "Confirmed" : status === "cancelled" ? "Cancelled" : "Draft";

function receivingDoc(receiving: MaterialReceiving): StockDocument {
  return {
    id: receiving.runNo ?? receiving.internalLotNo,
    type: "Receiving",
    material: receiving.material?.name ?? "—",
    counterparty: receiving.supplier?.nameTh ?? receiving.supplier?.code ?? "—",
    qty: Number(receiving.receiveQuantity),
    unit: receiving.unit?.code ?? "",
    status: receivingStatus(receiving.status),
    date: receiving.receiveDate,
  };
}

function disbursementDoc(disbursement: MaterialsDisbursement): StockDocument {
  const first = disbursement.items[0];
  const extra = disbursement.items.length - 1;
  const confirmed = disbursement.status === "confirmed";
  return {
    id: disbursement.disbursementNo,
    type: "Disbursement",
    material: first ? `${first.material?.name ?? "—"}${extra > 0 ? ` +${extra}` : ""}` : "—",
    counterparty: disbursement.disbursementType === "production" ? "เบิกเพื่อผลิต" : "ตัดสต็อก",
    qty: disbursement.items.reduce((sum, item) => sum + Number(confirmed ? item.disbursedQuantity : item.requestedQuantity), 0),
    unit: "",
    status: disbursementStatus(disbursement.status),
    date: disbursement.disbursementDate,
  };
}

function watchItem(item: MaterialInventoryItem): WatchlistItem {
  return {
    code: item.code,
    name: item.name,
    qty: Number(item.currentStock),
    reorderPoint: Number(item.minimumStock),
    unit: item.unit?.symbol ?? item.unit?.nameTh ?? "",
  };
}

// Summary counts come from cps-api /dashboard/summary, open to every signed-in
// user. The detail lists (watchlist, recent documents) stay gated by the
// viewer's own permissions, and every block degrades to empty on failure so
// one unavailable endpoint never takes the page down.
export async function loadDashboardData(accessToken: string, session: Session): Promise<DashboardData> {
  const canViewStock = can(session, "MATERIALS_RECEIVING_VIEW");
  const canViewReceiving = canViewStock;
  const canViewDisbursement = can(session, "MATERIALS_DISBURSEMENT_VIEW");

  const [summary, inventoryLow, inventoryOut, recentReceivings, recentDisbursements] = await Promise.all([
    quiet(getDashboardSummary(accessToken)),
    canViewStock
      ? quiet(listMaterialInventory(accessToken, { page: 1, limit: 5, isActive: true, stockStatus: "LOW_STOCK", sortBy: "currentStock", sortOrder: "asc" }))
      : Promise.resolve(null),
    canViewStock
      ? quiet(listMaterialInventory(accessToken, { page: 1, limit: 5, isActive: true, stockStatus: "OUT_OF_STOCK", sortBy: "code", sortOrder: "asc" }))
      : Promise.resolve(null),
    canViewReceiving ? quiet(listMaterialsReceiving(accessToken, { page: 1, limit: 8, sortBy: "receiveDate", sortOrder: "desc" })) : Promise.resolve(null),
    canViewDisbursement ? quiet(listMaterialsDisbursement(accessToken, { page: 1, limit: 8, sortBy: "disbursementDate", sortOrder: "desc" })) : Promise.resolve(null),
  ]);

  const documents = [
    ...(recentReceivings?.items ?? []).map(receivingDoc),
    ...(recentDisbursements?.items ?? []).map(disbursementDoc),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  const watchlist = [...(inventoryOut?.items ?? []), ...(inventoryLow?.items ?? [])].slice(0, 6).map(watchItem);

  return {
    canViewStock,
    canViewReceiving,
    canViewDisbursement,
    trend: (summary?.trend ?? []).map((point) => ({ date: dayLabel(point.date), received: point.received, disbursed: point.disbursed })),
    inventory: summary?.inventory ?? null,
    productionOrders: summary?.productionOrders ?? {},
    productionPlans: summary?.productionPlans ?? {},
    watchlist,
    documents,
    receivedLast7: summary?.receivedLast7 ?? 0,
    disbursedLast7: summary?.disbursedLast7 ?? 0,
    loadedAt: new Date().toISOString(),
  };
}
