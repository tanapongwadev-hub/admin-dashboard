import { apiFetch } from "./client";

export interface ProductStockMovement {
  id: string;
  type: "receive" | "issue";
  quantity: string;
  balanceAfter: string;
  referenceNo: string;
  remark: string | null;
  actorName: string;
  createdAt: string;
}

export interface ProductStock {
  productId: string;
  quantity: string;
  receivedQuantity: string;
  issuedQuantity: string;
  movements: ProductStockMovement[];
}

export interface ProductStockPayload {
  requestId: string;
  type: "receive" | "issue";
  quantity: number;
  referenceNo: string;
  remark?: string;
}

export function getProductStockBalances(token: string) {
  return apiFetch<Array<{ productId: string; quantity: string }>>("/products/stock-balances", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getProductStock(token: string, id: string) {
  return apiFetch<ProductStock>(`/products/${encodeURIComponent(id)}/stock`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function recordProductStock(token: string, id: string, payload: ProductStockPayload) {
  return apiFetch<ProductStock>(`/products/${encodeURIComponent(id)}/stock-movements`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
  });
}
