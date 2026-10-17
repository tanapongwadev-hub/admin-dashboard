import { apiFetch } from "./client";

// cps-api GET /dashboard/materials?from=&to= — receiving / disbursement
// overview for a date range. Sections the caller has no permission for come
// back empty with `access.<section> = false`.
export interface MaterialsOverviewDay {
  date: string;
  receivedQty: number;
  receivedDocs: number;
  disbursedQty: number;
  disbursedDocs: number;
}

export interface MaterialsOverviewTop {
  code: string;
  name: string;
  unit: string | null;
  qty: number;
  docs: number;
}

export interface MaterialsOverview {
  range: { from: string; to: string; days: number };
  access: { receiving: boolean; disbursement: boolean };
  totals: {
    receivedQty: number;
    receivedDocs: number;
    disbursedQty: number;
    disbursedDocs: number;
    receivingCancelled: number;
    receivingDraft: number;
    disbursementCancelled: number;
    disbursementDraft: number;
  };
  daily: MaterialsOverviewDay[];
  topReceived: MaterialsOverviewTop[];
  topDisbursed: MaterialsOverviewTop[];
  bySupplier: Array<{ name: string; qty: number; docs: number }>;
  byDisbursementType: Array<{ type: string; qty: number; docs: number }>;
  recentReceivings: Array<{
    id: string;
    lotNo: string;
    materialCode: string;
    materialName: string;
    qty: number;
    unit: string | null;
    supplier: string | null;
    date: string;
  }>;
  recentDisbursements: Array<{
    id: string;
    documentNo: string;
    type: string;
    date: string;
    items: number;
    qty: number;
    firstMaterial: string | null;
  }>;
}

export function getMaterialsOverview(accessToken: string, from: string, to: string) {
  return apiFetch<MaterialsOverview>(
    `/dashboard/materials?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
