"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { PackageView } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";
import { ProductionQrLabel, ProductionQrPrintLayout } from "./production-qr-print-layout";

export interface LabelContext {
  targetType?: "product" | "material";
  productCode: string;
  productName: string;
  orderCode: string;
  fgLotNo: string;
}

/**
 * Box labels, eight labels per A4 page. Same "print the current
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
    <ProductionQrPrintLayout
      title={`ป้าย${context.targetType === "material" ? "วัสดุภายใน" : "สินค้าสำเร็จรูป"} · ${context.orderCode}`}
      labels={packages.map((pkg) => (
        <ProductionQrLabel
          key={pkg.id}
          qrImage={pkg.qrImage}
          qrCode={pkg.qrCode}
          productCode={context.productCode}
          productName={context.productName}
          orderCode={context.orderCode}
          quantity={pkg.initialQty}
          fields={[
            { label: context.targetType === "material" ? "ล็อตวัสดุภายใน" : "ล็อตสินค้าสำเร็จรูป", value: context.fgLotNo },
            { label: "กล่อง", value: `${pkg.boxNo}${pkg.unitType === "PARTIAL" ? " · กล่องเศษ" : ""}` },
            { label: "วันผลิตต้นทางแรก / กะ", value: pkg.origins[0] ? `${formatThaiDate(pkg.origins[0].productionDate)} / ${pkg.origins[0].shift}` : "—" },
          ]}
        />
      ))}
    />,
    document.body,
  );
}
