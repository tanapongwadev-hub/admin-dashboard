// Mock data for the dashboard home page only — scoped separately from
// src/lib/data.ts (which is e-commerce-shaped mock data still used by
// /{products,users,orders}). This file models what the real cps-api domain
// actually is: a factory materials/production floor, not a storefront. See
// AGENTS.md § Conventions › API for why pages still render mock data
// instead of the real endpoints.

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const rand = seededRandom(7);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function daysAgo(n: number, hour = 8) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(rand() * 60), 0, 0);
  return d.toISOString();
}

// ---- Stock movement (14-day received vs disbursed, kg) ----
export interface StockMovementPoint {
  date: string;
  received: number;
  disbursed: number;
}

export const stockMovementTrend: StockMovementPoint[] = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  const received = Math.round(1800 + rand() * 1400);
  const disbursed = Math.round(1500 + rand() * 1500);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    received,
    disbursed,
  };
});

// ---- Material category breakdown (stock on hand, by category) ----
export interface MaterialCategoryShare {
  name: string;
  value: number;
  color: string;
}

export const materialCategoryBreakdown: MaterialCategoryShare[] = [
  { name: "ท่อเหล็ก", value: 18400, color: "chart-2" },
  { name: "แผ่นเหล็ก", value: 12100, color: "chart-3" },
  { name: "ม้วนเหล็ก", value: 9600, color: "chart-1" },
  { name: "อุปกรณ์ยึด", value: 4200, color: "chart-4" },
  { name: "วัสดุสิ้นเปลือง", value: 2100, color: "chart-5" },
];

// ---- Weekly throughput (this week, received vs disbursed) ----
export interface ThroughputPoint {
  day: string;
  received: number;
  disbursed: number;
}

export const weeklyThroughput: ThroughputPoint[] = [
  { day: "จ.", received: 2100, disbursed: 1850 },
  { day: "อ.", received: 1950, disbursed: 2200 },
  { day: "พ.", received: 2400, disbursed: 1980 },
  { day: "พฤ.", received: 1800, disbursed: 2350 },
  { day: "ศ.", received: 2650, disbursed: 2100 },
  { day: "ส.", received: 1200, disbursed: 900 },
  { day: "อา.", received: 400, disbursed: 250 },
];

// ---- Recent receiving / disbursement documents ----
export type StockDocType = "Receiving" | "Disbursement";
export type StockDocStatus = "Draft" | "Confirmed" | "Cancelled";

export interface StockDocument {
  id: string;
  type: StockDocType;
  material: string;
  counterparty: string;
  qty: number;
  unit: string;
  status: StockDocStatus;
  date: string;
}

const materials = [
  "Steel Pipe Ø50mm",
  "Steel Pipe Ø76mm",
  "PVC Sheet 4mm",
  "Aluminum Coil 1.2mm",
  "Hex Bolt M8x40",
  "Welding Rod E7018",
  "Galvanized Sheet 2mm",
  "Stainless Coil 0.8mm",
  "Angle Bar 40x40",
  "Rubber Gasket 6mm",
];
const suppliers = ["Siam Steel Co.", "Chiewchan Metal Works", "Ayutthaya Fasteners", "Thai Coil Supply", "Rayong Sheet Metal"];
const lines = ["Cutting Line 1", "Cutting Line 2", "Press Line 1", "Assembly Line 3", "Welding Bay 2"];
const docStatuses: StockDocStatus[] = ["Confirmed", "Confirmed", "Confirmed", "Draft", "Cancelled"];

export const recentDocuments: StockDocument[] = Array.from({ length: 8 }).map((_, i) => {
  const type: StockDocType = i % 2 === 0 ? "Receiving" : "Disbursement";
  return {
    id: `${type === "Receiving" ? "GRN" : "GDN"}-${(30500 + i).toString()}`,
    type,
    material: pick(materials),
    counterparty: type === "Receiving" ? pick(suppliers) : pick(lines),
    qty: Math.round(50 + rand() * 950),
    unit: pick(["kg", "pcs", "m"]),
    status: pick(docStatuses),
    date: daysAgo(Math.floor(rand() * 4)),
  };
});

// ---- Floor activity feed ----
export interface FloorActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  avatarColor: string;
}

const staff = ["Somchai P.", "Nattapong K.", "Ploy S.", "Wichai T.", "Ananya R.", "Kittipong W."];
const avatarColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const floorActions = [
  "ยืนยันการรับเข้าสำหรับ",
  "เบิกจ่ายสต็อกให้กับ",
  "แจ้งเตือนสต็อกต่ำสำหรับ",
  "อัปเดตสูตรการผลิต (BOM) สำหรับ",
  "บันทึกการปรับปรุงสต็อกของ",
  "ยืนยันการเบิกจ่ายให้กับ",
];

export const floorActivity: FloorActivityItem[] = Array.from({ length: 7 }).map((_, i) => ({
  id: `FA-${i}`,
  actor: pick(staff),
  action: pick(floorActions),
  target: pick(materials),
  time: daysAgo(Math.floor(rand() * 2), 6 + Math.floor(rand() * 12)),
  avatarColor: pick(avatarColors),
}));

// ---- Low-stock watchlist ----
export interface WatchlistItem {
  code: string;
  name: string;
  qty: number;
  reorderPoint: number;
  unit: string;
}

export const lowStockWatchlist: WatchlistItem[] = [
  { code: "MAT-0231", name: "Hex Bolt M8x40", qty: 180, reorderPoint: 500, unit: "pcs" },
  { code: "MAT-0114", name: "Welding Rod E7018", qty: 42, reorderPoint: 100, unit: "kg" },
  { code: "MAT-0087", name: "Rubber Gasket 6mm", qty: 95, reorderPoint: 200, unit: "pcs" },
  { code: "MAT-0203", name: "Stainless Coil 0.8mm", qty: 310, reorderPoint: 600, unit: "kg" },
  { code: "MAT-0056", name: "Angle Bar 40x40", qty: 220, reorderPoint: 350, unit: "m" },
];

export function dashboardStats() {
  const receivedToday = stockMovementTrend[stockMovementTrend.length - 1].received;
  const disbursedToday = stockMovementTrend[stockMovementTrend.length - 1].disbursed;
  const stockValue = materialCategoryBreakdown.reduce((s, c) => s + c.value, 0);
  const lowStockCount = lowStockWatchlist.filter((item) => item.qty < item.reorderPoint).length;
  return { stockValue, receivedToday, disbursedToday, lowStockCount };
}
