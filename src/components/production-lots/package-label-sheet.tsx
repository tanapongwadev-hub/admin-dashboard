"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { PackageView } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";

export interface LabelContext {
  productCode: string;
  productName: string;
  orderCode: string;
  fgLotNo: string;
}

/**
 * Box labels, one 60×40 mm label per printed page. Same "print the current
 * document, no popup" pattern as materials-receiving-qr-print-sheet.tsx: the
 * sheet is portaled to <body>, hidden on screen, shown only under @media print
 * (the app shell is hidden by #dashboard-shell's print rule), and cleared on
 * `afterprint`. The @page size rule exists only while this sheet is mounted.
 */
export function PackageLabelSheet({
  packages,
  context,
  onDone,
}: {
  packages: PackageView[] | null;
  context: LabelContext | null;
  onDone: () => void;
}) {
  React.useEffect(() => {
    if (!packages?.length) return;
    const after = () => onDone();
    window.addEventListener("afterprint", after);
    const raf = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", after);
    };
  }, [packages, onDone]);

  if (!packages?.length || !context) return null;

  return createPortal(
    <div className="hidden print:block">
      <style>{"@page { size: 60mm 40mm; margin: 0; }"}</style>
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className="flex h-[40mm] w-[60mm] gap-[2mm] overflow-hidden p-[2mm] text-black [break-after:page] [break-inside:avoid]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG, printed */}
          <img src={pkg.qrImage} alt="" className="size-[26mm] shrink-0" />
          <div className="flex min-w-0 flex-col justify-between text-[2.6mm] leading-tight">
            <div>
              <p className="truncate font-bold">{context.productCode}</p>
              <p className="line-clamp-2">{context.productName}</p>
            </div>
            <div>
              <p className="font-mono font-bold">{context.fgLotNo}</p>
              <p>
                กล่อง {pkg.boxNo} · {pkg.initialQty} ชิ้น{pkg.unitType === "PARTIAL" ? " (เศษ)" : ""}
              </p>
              {pkg.origins.length > 0 && (
                <p className="truncate">
                  ต้นทาง{" "}
                  {pkg.origins.map((o) => `${o.lotNo}${pkg.origins.length > 1 ? `×${o.qty}` : ""}`).join(", ")}
                </p>
              )}
              <p className="truncate font-mono text-[2.2mm]">{pkg.qrCode}</p>
              <p className="text-[2.2mm]">
                {context.orderCode}
                {pkg.origins[0] ? ` · ผลิต ${formatThaiDate(pkg.origins[0].productionDate)}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
