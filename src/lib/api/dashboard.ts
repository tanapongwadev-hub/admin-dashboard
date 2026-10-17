import { apiFetch } from "./client";

// cps-api GET /dashboard/summary — aggregate counts, open to any signed-in user.
export interface DashboardSummary {
  inventory: { total: number; normal: number; lowStock: number; outOfStock: number };
  trend: Array<{ date: string; received: number; disbursed: number }>;
  receivedLast7: number;
  disbursedLast7: number;
  productionOrders: Record<string, number>;
  productionPlans: Record<string, number>;
}

export function getDashboardSummary(accessToken: string) {
  return apiFetch<DashboardSummary>("/dashboard/summary", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
