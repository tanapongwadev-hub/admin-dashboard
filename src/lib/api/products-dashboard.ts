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
  /** Totals per product for the range (active products plus any with movements). */
  byProduct: Array<{
    code: string;
    name: string;
    unit: string | null;
    minStock: number;
    balance: number;
    receivedQty: number;
    receivedDocs: number;
    issuedQty: number;
    issuedDocs: number;
  }>;
}

export function getProductsOverview(accessToken: string, from: string, to: string) {
  return apiFetch<ProductsOverview>(
    `/dashboard/products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

export interface ProductMovementDetail {
  product: { code: string; name: string; unit: string | null } | null;
  range: { from: string; to: string };
  totals: { receivedQty: number; issuedQty: number; count: number };
  truncated: boolean;
  items: Array<{
    id: string;
    type: "receive" | "issue";
    qty: number;
    balanceAfter: number;
    referenceNo: string;
    remark: string | null;
    recordedAt: string;
    recordedBy: string | null;
  }>;
}

export function getProductMovements(accessToken: string, code: string, from: string, to: string) {
  return apiFetch<ProductMovementDetail>(
    `/dashboard/products/movements?code=${encodeURIComponent(code)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
