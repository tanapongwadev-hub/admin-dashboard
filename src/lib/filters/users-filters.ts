import type { UserStatusFilter } from "@/lib/api/users";

export interface UsersFilterState {
  search: string;
  status: "all" | UserStatusFilter;
}

export const USER_STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "active", label: "ใช้งานอยู่" },
  { value: "inactive", label: "ระงับการใช้งาน" },
];

export function readUsersFilters(
  params: URLSearchParams | { get(key: string): string | null },
): UsersFilterState {
  const status = params.get("status");
  return {
    search: (params.get("search") ?? "").trim(),
    status: status === "active" || status === "inactive" ? status : "all",
  };
}

export function buildUsersChips(filters: UsersFilterState) {
  const chips: { key: keyof UsersFilterState; label: string }[] = [];
  if (filters.status !== "all") {
    const label = USER_STATUS_OPTIONS.find((option) => option.value === filters.status)?.label;
    chips.push({ key: "status", label: `สถานะ: ${label}` });
  }
  return chips;
}
