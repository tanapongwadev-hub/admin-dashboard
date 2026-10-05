// Factory production day + shift, same rules as cps-api
// (modules/production/domain/production-day.ts):
//   A 08:00–16:59, B 17:00–07:59 — before 08:00 belongs to the previous
//   day's shift B. Asia/Bangkok (UTC+7, no DST). Back-dating up to 2 days.

export type Shift = "A" | "B";

export const SHIFT_LABELS: Record<Shift, string> = {
  A: "กะ A (08:00–17:00)",
  B: "กะ B (17:00–08:00)",
};

export const MAX_BACKDATE_DAYS = 2;

export function currentProductionDay(now = new Date()): { productionDate: string; shift: Shift } {
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hour = local.getUTCHours();
  if (hour < 8) {
    local.setUTCDate(local.getUTCDate() - 1);
    return { productionDate: local.toISOString().slice(0, 10), shift: "B" };
  }
  return { productionDate: local.toISOString().slice(0, 10), shift: hour < 17 ? "A" : "B" };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 2026-10-05 → 05/10/69 (Buddhist era, as on the shop floor). */
export function formatThaiDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String((y + 543) % 100).padStart(2, "0")}`;
}
