import type { MaterialJobOrderPickLine } from "@/lib/api/material-job-orders";

export function getIssueEligiblePickLines(
  pickLines: readonly MaterialJobOrderPickLine[],
) {
  return pickLines.filter(
    (line) =>
      line.pickedAt &&
      !line.releasedAt &&
      Number(line.outstandingQuantity) > 0,
  );
}

export function buildAllOutstandingIssueItems(
  pickLines: readonly MaterialJobOrderPickLine[],
) {
  return getIssueEligiblePickLines(pickLines).map((line) => ({
    reservationId: line.reservationId,
    quantity: line.outstandingQuantity,
  }));
}
