import { apiFetch } from "./client";
import type { Product } from "../types";

export function getProducts() {
  return apiFetch<Product[]>("/products");
}

export function getProduct(id: string) {
  return apiFetch<Product>(`/products/${id}`);
}
