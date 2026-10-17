import { apiFetch } from "./client";

// cps-api GET /dashboard/products?from=&to= — finished-product stock movements
// (receive from FG packing / manual, issue from sales / manual) for a range.
export interface ProductsOverviewTop {
  code: string;
  name: string;
  unit: string | null;
  qty: number;
  docs: number;
}

export interface ProductsOverviewMovement {
  id: string;
  productCode: string;
  productName: string;
  qty: number;
  unit: string | null;
  referenceNo: string;
  date: string;
}

export interface ProductsOverview {
  range: { from: string; to: string; days: number };
  totals: { receivedQty: number; receivedDocs: number; disbursedQty: number; disbursedDocs: number };
  daily: Array<{
    date: string;
    receivedQty: number;
    receivedDocs: number;
    disbursedQty: number;
    disbursedDocs: number;
  }>;
  topReceived: ProductsOverviewTop[];
  topIssued: ProductsOverviewTop[];
  byCustomer: Array<{ name: string; qty: number; docs: number }>;
  receiveSource: Array<{ source: string; qty: number; docs: number }>;
  issueSource: Array<{ source: string; qty: number; docs: number }>;
  recentReceives: ProductsOverviewMovement[];
  recentIssues: ProductsOverviewMovement[];
  stock: { total: number; outOfStock: number; lowStock: number; normal: number; totalQty: number };
  lowStock: Array<{ code: string; name: string; unit: string | null; balance: number; minStock: number }>;
}

export function getProductsOverview(accessToken: string, from: string, to: string) {
  return apiFetch<ProductsOverview>(
    `/dashboard/products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
