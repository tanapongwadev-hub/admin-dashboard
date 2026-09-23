import type { MaterialJobOrderPickLine } from "@/lib/api/material-job-orders";

export interface PickLineMaterialGroup {
  materialCode: string;
  materialName: string;
  lines: MaterialJobOrderPickLine[];
  reserved: number;
  issued: number;
  outstanding: number;
}

/**
 * Groups a Job Order's flat pick-line list (one row per box/package) by
 * `materialCode` — used by both the on-screen pick-lines table
 * (job-order-detail.tsx) and the printed ใบจัดงาน (job-order-print-sheet.tsx)
 * so the two never drift into different groupings. Preserves the backend's
 * own ordering (materialId, receiveDate, package id — see
 * MaterialJobOrdersService#buildDetail) by grouping in first-seen order
 * rather than re-sorting.
 */
export function groupPickLinesByMaterial(
  pickLines: MaterialJobOrderPickLine[],
): PickLineMaterialGroup[] {
  const groups: PickLineMaterialGroup[] = [];
  const byCode = new Map<string, PickLineMaterialGroup>();
  for (const line of pickLines) {
    let group = byCode.get(line.materialCode);
    if (!group) {
      group = {
        materialCode: line.materialCode,
        materialName: line.materialName,
        lines: [],
        reserved: 0,
        issued: 0,
        outstanding: 0,
      };
      byCode.set(line.materialCode, group);
      groups.push(group);
    }
    group.lines.push(line);
    group.reserved += Number(line.reservedQuantity);
    group.issued += Number(line.issuedQuantity);
    group.outstanding += Number(line.outstandingQuantity);
  }
  return groups;
}
