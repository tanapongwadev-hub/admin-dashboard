"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { MaterialJobOrderDetail } from "@/lib/api/material-job-orders";
import { groupPickLinesByMaterial } from "@/lib/group-pick-lines";
import { formatNumber } from "@/lib/utils";

// Same "print the current document, no popup window" pattern as
// materials-receiving-qr-print-sheet.tsx (see that file's own comment for
// why `window.open()` + `document.write()` is popup-blocker-fragile in this
// app). Driven by a `trigger` counter instead of a nullable target — this
// page always has a jobOrder, printing just needs to *re-fire* on repeated
// clicks of "พิมพ์ใบจัดงาน", which a boolean/target-object can't express as
// cleanly as an incrementing counter can.
export function MaterialJobOrderPrintSheet({
  jobOrder,
  trigger,
}: {
  jobOrder: MaterialJobOrderDetail;
  trigger: number;
}) {
  React.useEffect(() => {
    if (trigger === 0) return;
    const raf = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  if (trigger === 0) return null;

  // Print every line, including ones already issued (released) — filtering
  // them out left the sheet empty once the job order had been issued.
  const materialGroups = groupPickLinesByMaterial(jobOrder.pickLines);

  return createPortal(
    <div className="hidden print:block">
      <h1 className="text-base font-semibold text-black">ใบจัดงานวัตถุดิบ</h1>
      <p className="mt-1 text-sm text-black">เลขที่: {jobOrder.code}</p>
      <p className="text-sm text-black">
        Production Plan: {jobOrder.productionPlan.code}
      </p>
      <div className="mt-2 text-sm text-black">
        {jobOrder.productionPlan.lines.map((line) => (
          <p key={line.id}>
            รายการผลิต: {line.productCode} · {line.productName} — จำนวนผลิต{" "}
            {formatNumber(Number(line.quantity))} · วันที่ต้องใช้ {line.needByDate}
          </p>
        ))}
      </div>
      <h2 className="mt-4 text-sm font-semibold text-black">รายการวัตถุดิบ</h2>
      {jobOrder.materials.map((material) => (
        <p key={material.materialCode} className="text-sm text-black">
          {material.materialCode} · {material.materialName} — จำนวนที่ต้องใช้{" "}
          {material.reserved}
        </p>
      ))}
      <table className="mt-3 w-full border-collapse text-xs text-black">
        <thead>
          <tr className="border border-gray-400">
            <th className="border border-gray-400 px-2 py-1">☐</th>
            <th className="border border-gray-400 px-2 py-1">QR</th>
            <th className="border border-gray-400 px-2 py-1">Lot</th>
            <th className="border border-gray-400 px-2 py-1">กล่อง</th>
            <th className="border border-gray-400 px-2 py-1">จำนวน</th>
          </tr>
        </thead>
        <tbody>
          {materialGroups.map((group) => (
            <React.Fragment key={group.materialCode}>
              <tr className="break-inside-avoid border border-gray-400">
                <td
                  colSpan={5}
                  className="border border-gray-400 bg-gray-100 px-2 py-1 font-semibold"
                >
                  {group.materialCode} · {group.materialName}
                  <span className="ml-2 font-mono text-lg font-bold">
                    Lot{" "}
                    {[...new Set(group.lines.map((line) => line.internalLotNo))].join(", ")}
                  </span>
                  <span className="ml-2 font-normal">
                    — ต้องใช้ {group.reserved} ({group.lines.length} กล่อง)
                  </span>
                </td>
              </tr>
              {group.lines.map((line) => (
                <tr
                  key={line.reservationId}
                  className="break-inside-avoid border border-gray-400"
                >
                  <td className="border border-gray-400 px-2 py-2 text-center text-base">
                    {line.pickedAt || line.releasedAt ? "✓" : ""}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 font-mono text-[10px]">
                    {line.qrCode ?? "—"}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 font-mono text-lg font-bold leading-tight">
                    {line.internalLotNo}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-center text-base font-bold">
                    {line.packageNo}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right text-base font-bold">
                    {formatNumber(Number(line.reservedQuantity))}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex justify-between text-xs text-black">
        <p>Prepared By: ___________________</p>
        <p>Picked By: ___________________</p>
        <p>Issued By: ___________________</p>
      </div>
    </div>,
    document.body,
  );
}
