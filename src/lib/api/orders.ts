import { apiFetch } from "./client";
import type { Order } from "../types";

export function getOrders() {
  return apiFetch<Order[]>("/orders");
}

export function getOrder(id: string) {
  return apiFetch<Order>(`/orders/${id}`);
}
