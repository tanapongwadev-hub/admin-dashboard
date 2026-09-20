"use client";

import * as React from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { listBomUsageByMaterialAction } from "@/app/(dashboard)/materials/pc/actions";
import type { Material } from "@/lib/api/materials";
import type { BomUsageRow, BomStatus } from "@/lib/api/boms";

// Same DRAFT/ACTIVE/INACTIVE display mapping products-details-dialog.tsx
// already uses for a BOM's own status badge — kept as a small local
// duplicate (matching this codebase's existing WORKFLOW_STATUS_DISPLAY
// precedent) rather than extracting a shared util for a 3-line map.
const BOM_STATUS_DISPLAY: Record<BomStatus, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "ร่าง", variant: "warning" },
  ACTIVE: { label: "เปิดใช้งาน", variant: "success" },
  INACTIVE: { label: "ปิดใช้งาน", variant: "neutral" },
};

// Inner view — extracted so a future SSR test can render it directly,
// mirroring the split already used by MaterialPcDetailsDialog/
// MaterialPcDetailsView (see that file's own comment on why: Radix Dialog
// renders through a Portal that `renderToStaticMarkup` can't capture).
export function MaterialBomUsageView({ material }: { material: Material }) {
  // Keyed by materialId (not just the result) so switching to a different
  // material is detected by comparison rather than a synchronous
  // "reset to loading" setState at the top of the effect — the latter is a
  // set-state-in-effect this project's lint config rejects. Same pattern as
  // products-details-dialog.tsx's BOM tab fetch. The only setState call
  // here happens inside the .then() callback, after a real async gap.
  const [result, setResult] = React.useState<
    | { materialId: string; status: "success"; usage: BomUsageRow[] }
    | { materialId: string; status: "error"; message: string }
    | null
  >(null);

  React.useEffect(() => {
    let cancelled = false;
    listBomUsageByMaterialAction(material.id).then((res) => {
      if (cancelled) return;
      setResult(
        res.status === "success"
          ? { materialId: material.id, status: "success", usage: res.usage }
          : { materialId: material.id, status: "error", message: res.message }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [material.id]);

  const isCurrent = result?.materialId === material.id;
  const usage = isCurrent && result.status === "success" ? result.usage : null;
  const error = isCurrent && result.status === "error" ? result.message : null;

  return (
    <div className="flex flex-col">
      <header className="border-b border-border px-6 py-5">
        <p className="font-mono text-xs tracking-[0.05em] text-primary">{material.code}</p>
        <h2 className="mt-1 text-lg font-semibold leading-tight text-fg">{material.name}</h2>
        <p className="mt-1 text-sm text-fg-muted">BOM / Products ที่ใช้วัสดุนี้</p>
      </header>

      <section className="px-6 py-5">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : usage === null ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> กำลังโหลดข้อมูล...
          </p>
        ) : usage.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
            <PackageSearch className="size-7 text-fg-muted" aria-hidden="true" />
            <p className="text-sm text-fg-muted">Material นี้ยังไม่ได้ถูกใช้งานใน BOM</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list — mirrors products-details-dialog.tsx's
                sm:hidden BOM item cards. */}
            <div className="divide-y divide-border rounded-lg border border-border sm:hidden">
              {usage.map((row) => {
                const status = BOM_STATUS_DISPLAY[row.bomStatus];
                return (
                  <div key={row.bomItemId} className="space-y-2 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-fg-muted">{row.productCode}</p>
                        <p className="mt-0.5 text-sm font-medium text-fg">{row.productName}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                        {formatNumber(row.quantity)} <span className="text-xs font-medium text-fg-muted">{row.unitNameTh}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-fg-muted">{row.bomVersion}</span>
                      <Badge variant={status.variant} style={{ fontSize: "10.5px" }}>
                        {status.label}
                      </Badge>
                      {row.isScrap && <Badge variant="outline">เศษ</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table — Product Code / Product Name / BOM / Qty */}
            <div className="hidden overflow-hidden rounded-lg border border-border sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-left text-[11px] uppercase tracking-wide text-fg-muted">
                    <th className="px-4 py-2.5 font-medium">Product Code</th>
                    <th className="px-4 py-2.5 font-medium">Product Name</th>
                    <th className="px-4 py-2.5 font-medium">BOM</th>
                    <th className="px-4 py-2.5 font-medium">จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((row) => {
                    const status = BOM_STATUS_DISPLAY[row.bomStatus];
                    return (
                      <tr key={row.bomItemId} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-fg-muted">{row.productCode}</td>
                        <td className="px-4 py-2.5 text-fg">{row.productName}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-fg-secondary">{row.bomVersion}</span>
                            <Badge variant={status.variant} style={{ fontSize: "10.5px" }}>
                              {status.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-fg-secondary">
                          {formatNumber(row.quantity)} {row.unitNameTh}
                          {row.isScrap && (
                            <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                              เศษ
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function MaterialBomUsageDialog({
  material,
  onOpenChange,
}: {
  material: Material | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!material) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg" className="p-0">
        <MaterialBomUsageView material={material} />
        <footer className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
