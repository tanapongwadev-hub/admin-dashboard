import { apiFetch } from "./client";

export interface BomOverviewItem {
  code: string;
  name: string;
  imagePath: string | null;
  quantity: string;
  unit: string | null;
  isScrap: boolean;
}

export interface BomOverviewOwner {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  imagePath: string | null;
  boms: Array<{ id: string; version: string; status: "DRAFT" | "ACTIVE" | "INACTIVE"; items: BomOverviewItem[] }>;
  workflows: Array<{
    id: string;
    version: string;
    status: "DRAFT" | "ACTIVE" | "INACTIVE";
    steps: Array<{ code: string; name: string }>;
  }>;
}

export interface BomOverview {
  products: BomOverviewOwner[];
  materials: BomOverviewOwner[];
}

/** Read-only list of every product / material with a BOM or workflow (all versions). */
export function getBomOverview(accessToken: string) {
  return apiFetch<BomOverview>("/bom-overview", { headers: { Authorization: `Bearer ${accessToken}` } });
}
