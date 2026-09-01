import { apiFetch } from "./client";
import type { AppUser } from "../types";

export function getUsers() {
  return apiFetch<AppUser[]>("/users");
}

export function getUser(id: string) {
  return apiFetch<AppUser>(`/users/${id}`);
}
