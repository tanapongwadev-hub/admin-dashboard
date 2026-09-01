import type {
  AppUser,
  Product,
  Order,
  ActivityItem,
  NotificationItem,
  UserRole,
  UserStatus,
  ProductStatus,
  OrderStatus,
} from "./types";

const firstNames = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "Lucas", "Mia", "Elijah", "Amelia", "James", "Harper", "Ben",
  "Evelyn", "Aiden", "Luna", "Kai", "Nora", "Leo", "Zoe", "Milo",
  "Chloe", "Theo", "Aria", "Finn", "Layla", "Owen",
];
const lastNames = [
  "Carter", "Nguyen", "Patel", "Kim", "Rossi", "Muller", "Silva", "Kowalski",
  "Andersen", "Fischer", "Nakamura", "Novak", "Haddad", "Larsson", "Costa",
  "Dubois", "Petrov", "Santos", "Okafor", "Lindgren",
];
const avatarColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];
const roles: UserRole[] = ["Owner", "Admin", "Editor", "Viewer"];
const userStatuses: UserStatus[] = ["Active", "Invited", "Suspended"];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const rand = seededRandom(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const users: AppUser[] = Array.from({ length: 64 }).map((_, i) => {
  const first = pick(firstNames);
  const last = pick(lastNames);
  const status = i === 0 ? "Active" : pick(userStatuses);
  return {
    id: `USR-${(1000 + i).toString()}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@panel.io`,
    role: i === 0 ? "Owner" : pick(roles),
    status,
    avatarColor: pick(avatarColors),
    lastActive: daysAgo(Math.floor(rand() * 30)),
    joined: daysAgo(Math.floor(rand() * 400) + 30),
  };
});

const categories = ["Apparel", "Electronics", "Home & Living", "Beauty", "Sporting Goods", "Stationery"];
const productAdjectives = ["Classic", "Essential", "Pro", "Studio", "Lightweight", "Heritage", "Urban", "Nomad", "Aria", "Nova"];
const productNouns = ["Backpack", "Headphones", "Desk Lamp", "Sneakers", "Water Bottle", "Notebook", "Jacket", "Keyboard", "Sunglasses", "Mug"];

export const products: Product[] = Array.from({ length: 48 }).map((_, i) => {
  const stock = Math.floor(rand() * 400);
  let status: ProductStatus = "In stock";
  if (stock === 0) status = "Out of stock";
  else if (stock < 25) status = "Low stock";
  if (rand() < 0.08) status = "Draft";
  return {
    id: `PRD-${(2000 + i).toString()}`,
    name: `${pick(productAdjectives)} ${pick(productNouns)}`,
    sku: `SKU-${(10000 + i * 7).toString()}`,
    category: pick(categories),
    price: Math.round((rand() * 180 + 12) * 100) / 100,
    stock,
    status,
    sales: Math.floor(rand() * 2000),
    updated: daysAgo(Math.floor(rand() * 60)),
  };
});

const orderStatuses: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const payments: Order["payment"][] = ["Paid", "Paid", "Paid", "Refunded", "Failed"];

export const orders: Order[] = Array.from({ length: 72 }).map((_, i) => {
  const user = pick(users);
  return {
    id: `ORD-${(30450 + i).toString()}`,
    customer: user.name,
    email: user.email,
    date: daysAgo(Math.floor(rand() * 45)),
    amount: Math.round((rand() * 420 + 18) * 100) / 100,
    items: Math.floor(rand() * 5) + 1,
    status: pick(orderStatuses),
    payment: pick(payments),
  };
});

const actions = [
  "created invoice",
  "updated the profile for",
  "deleted product",
  "invited",
  "resolved ticket",
  "published article",
  "commented on",
  "approved refund for",
];

export const activity: ActivityItem[] = Array.from({ length: 12 }).map((_, i) => {
  const user = pick(users);
  return {
    id: `ACT-${i}`,
    actor: user.name,
    action: pick(actions),
    target: pick(products).name,
    time: daysAgo(Math.floor(rand() * 6)),
    avatarColor: user.avatarColor,
  };
});

export const notifications: NotificationItem[] = [
  { id: "n1", title: "New order received", description: "Order ORD-30512 was just placed by Harper Costa.", time: "2m ago", read: false, type: "success" },
  { id: "n2", title: "Low stock alert", description: "Urban Sneakers has fewer than 25 units left.", time: "1h ago", read: false, type: "warning" },
  { id: "n3", title: "Payment failed", description: "Payment for ORD-30498 could not be processed.", time: "3h ago", read: false, type: "danger" },
  { id: "n4", title: "Weekly report ready", description: "Your analytics summary for last week is ready to view.", time: "1d ago", read: true, type: "info" },
  { id: "n5", title: "New team member", description: "Kai Petrov accepted the invite to join as Editor.", time: "2d ago", read: true, type: "info" },
];

export const revenueTrend = [
  { month: "Jan", revenue: 42500, expenses: 28100 },
  { month: "Feb", revenue: 46800, expenses: 29900 },
  { month: "Mar", revenue: 51200, expenses: 31200 },
  { month: "Apr", revenue: 48900, expenses: 30500 },
  { month: "May", revenue: 57300, expenses: 33800 },
  { month: "Jun", revenue: 62100, expenses: 35100 },
  { month: "Jul", revenue: 59800, expenses: 34700 },
  { month: "Aug", revenue: 66400, expenses: 36900 },
  { month: "Sep", revenue: 71200, expenses: 38200 },
  { month: "Oct", revenue: 68500, expenses: 37600 },
  { month: "Nov", revenue: 74900, expenses: 39800 },
  { month: "Dec", revenue: 81300, expenses: 42100 },
];

export const trafficSources = [
  { name: "Organic search", value: 4820, color: "chart-1" },
  { name: "Direct", value: 3210, color: "chart-2" },
  { name: "Social", value: 2140, color: "chart-3" },
  { name: "Referral", value: 1380, color: "chart-4" },
  { name: "Email", value: 960, color: "chart-5" },
];

export const weeklyVisitors = [
  { day: "Mon", visitors: 2400, sales: 1200 },
  { day: "Tue", visitors: 2210, sales: 1398 },
  { day: "Wed", visitors: 2290, sales: 1800 },
  { day: "Thu", visitors: 2000, sales: 1908 },
  { day: "Fri", visitors: 2780, sales: 2400 },
  { day: "Sat", visitors: 1890, sales: 2100 },
  { day: "Sun", visitors: 1590, sales: 1500 },
];

export function statsFor() {
  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const pendingOrders = orders.filter((o) => o.status === "Pending" || o.status === "Processing").length;
  const lowStock = products.filter((p) => p.status === "Low stock" || p.status === "Out of stock").length;
  return { totalRevenue, activeUsers, pendingOrders, lowStock };
}

export function categoryPerformance() {
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(p.category, (map.get(p.category) ?? 0) + p.sales);
  }
  return Array.from(map.entries())
    .map(([category, sales]) => ({ category, sales }))
    .sort((a, b) => b.sales - a.sales);
}

export const conversionFunnel = [
  { stage: "Visitors", value: 12480 },
  { stage: "Product views", value: 8210 },
  { stage: "Added to cart", value: 3640 },
  { stage: "Checkout started", value: 2120 },
  { stage: "Purchased", value: 1480 },
];
