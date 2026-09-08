"use client";

import { ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReceivingMaterialPhoto } from "@/components/materials-receiving/materials-receiving-table";
import type { MaterialReceiving, MaterialReceivingPackageStatus } from "@/lib/api/materials-receiving";
import { formatNumber } from "@/lib/utils";

const PACKAGE_STATUS_DISPLAY: Record<MaterialReceivingPackageStatus, { label: string; variant: "primary" | "warning" | "neutral" | "danger" }> = {
  pending: { label: "รอยืนยัน", variant: "neutral" },
  in_stock: { label: "IN_STOCK", variant: "primary" },
  partial: { label: "PARTIAL", variant: "warning" },
  issued: { label: "ISSUED", variant: "neutral" },
  damaged: { label: "DAMAGED", variant: "danger" },
  returned: { label: "RETURNED", variant: "danger" },
};

// Remaining-quantity color language, shared by the top hero stat and every
// box tile — ratio-based, not status-based, since a box's real-world state
// (still full / partially issued / depleted) is what a warehouse user is
// actually scanning for here, independent of the receiving's own draft/
// confirmed/cancelled status (see STATUS_ACCENT in materials-receiving-table.tsx
// for that separate, status-based accent language).
function remainingTone(
  remaining: number,
  initial: number
): { wash: string; text: string; label: string; badgeVariant: "neutral" | "warning" | "primary" | "success" } {
  if (initial <= 0) {
    return { wash: "from-surface-2 to-surface-2", text: "text-fg-muted", label: "ไม่มีข้อมูล", badgeVariant: "neutral" };
  }
  if (remaining <= 0) {
    return { wash: "from-surface-2 to-surface-2", text: "text-fg-muted", label: "ใช้หมดแล้ว", badgeVariant: "neutral" };
  }
  const ratio = remaining / initial;
  if (ratio < 0.3) {
    return {
      wash: "from-warning-soft/70 via-warning-soft/20 to-transparent",
      text: "text-warning",
      label: "ใกล้หมด",
      badgeVariant: "warning",
    };
  }
  if (ratio < 1) {
    return {
      wash: "from-primary-soft/60 via-primary-soft/15 to-transparent",
      text: "text-primary",
      label: "ใช้งานบางส่วน",
      badgeVariant: "primary",
    };
  }
  return {
    wash: "from-success-soft/60 via-success-soft/15 to-transparent",
    text: "text-success",
    label: "พร้อมใช้งานเต็มจำนวน",
    badgeVariant: "success",
  };
}

export function MaterialsReceivingDetailsDialog({
  receiving,
  onOpenChange,
}: {
  receiving: MaterialReceiving | null;
  onOpenChange: (open: boolean) => void;
}) {
  const packages = receiving?.packages ?? [];
  const totalInitial = packages.reduce((sum, pkg) => sum + Number(pkg.quantity), 0);
  const totalRemaining = packages.reduce((sum, pkg) => sum + Number(pkg.remainingQuantity), 0);
  const overallTone = remainingTone(totalRemaining, totalInitial);

  return (
    <Dialog open={!!receiving} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl">
        {receiving && (
          <>
            <DialogHeader className="flex-row items-center gap-3 space-y-0">
              <ReceivingMaterialPhoto
                imagePath={receiving.material?.imagePath}
                materialName={receiving.material?.name ?? "ไม่ระบุวัสดุ"}
                className="size-12 shrink-0 rounded-lg"
                iconClassName="size-5"
              />
              <div className="min-w-0">
                <DialogTitle>{receiving.internalLotNo}</DialogTitle>
                <DialogDescription>
                  {receiving.material?.code} · {receiving.material?.name}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* ยอดคงเหลือ is the number a warehouse user actually came here
                  to check — given its own gradient "stage" (not just a cell
                  in the facts grid) so it reads as the headline stat, with a
                  tone that shifts by how much of the received quantity is
                  still available (see remainingTone above). */}
              <div
                className={`flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br ${overallTone.wash} px-4 py-3.5 sm:px-5 sm:py-4`}
              >
                <div className="min-w-0">
                  <span className={`text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${overallTone.text}`}>
                    ยอดคงเหลือทั้งหมด
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[34px] font-bold leading-none tracking-[-0.025em] tabular-nums text-fg">
                      {formatNumber(totalRemaining)}
                    </span>
                    <span className="text-sm font-medium text-fg-muted">/ {formatNumber(totalInitial)}</span>
                  </div>
                </div>
                <Badge variant={overallTone.badgeVariant} style={{ fontSize: "11px" }}>
                  {overallTone.label}
                </Badge>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] text-fg-muted">Supplier Lot</dt>
                  <dd className="font-mono font-semibold text-fg">{receiving.supplierLotNo ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">จำนวนรับเข้า</dt>
                  <dd className="font-semibold text-fg">{formatNumber(Number(receiving.receiveQuantity))}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">จำนวนกล่อง</dt>
                  <dd className="font-semibold text-fg">{receiving.packageCount}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">วันที่รับเข้า</dt>
                  <dd className="font-semibold text-fg">{receiving.receiveDate}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">วันที่ Supplier ผลิต</dt>
                  <dd className="font-semibold text-fg">{receiving.supplierProductionDate ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-fg-muted">สถานะ</dt>
                  <dd className="font-semibold text-fg">
                    {receiving.status === "draft" ? "ร่าง" : receiving.status === "confirmed" ? "ยืนยันแล้ว" : "ยกเลิก"}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => {
                  const statusDisplay = PACKAGE_STATUS_DISPLAY[pkg.status];
                  const pkgTone = remainingTone(Number(pkg.remainingQuantity), Number(pkg.quantity));
                  return (
                    <div key={pkg.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-fg">
                          Box {String(pkg.packageNo).padStart(3, "0")}
                        </span>
                        <Badge variant={statusDisplay.variant}>{statusDisplay.label}</Badge>
                      </div>
                      <div className="flex items-center justify-center rounded-md bg-surface-2 p-2">
                        {pkg.qrCode ? (
                          // Backend returns a full data:image/png;base64,... string.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pkg.qrCode} alt={`QR ${pkg.lotDetailNo ?? pkg.packageNo}`} className="h-28 w-28" />
                        ) : (
                          <div className="flex h-28 w-28 items-center justify-center text-fg-muted">
                            <ImageOff className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <p className="text-center font-mono text-[11px] text-fg-muted">{pkg.lotDetailNo ?? "—"}</p>
                      {/* Per-box remaining stat gets the same gradient
                          treatment as the overall hero, scaled down — so
                          "which boxes still have stock" is scannable at a
                          glance across a grid of many boxes. */}
                      <div className={`flex items-baseline justify-between gap-2 rounded-md bg-gradient-to-br ${pkgTone.wash} px-2.5 py-2`}>
                        <div>
                          <p className="text-[9.5px] uppercase leading-none tracking-[0.06em] text-fg-muted">คงเหลือ</p>
                          <p className={`mt-1 text-lg font-bold leading-none tabular-nums ${pkgTone.text}`}>
                            {formatNumber(Number(pkg.remainingQuantity))}
                          </p>
                        </div>
                        <span className="text-[11px] font-medium text-fg-muted">จาก {formatNumber(Number(pkg.quantity))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
