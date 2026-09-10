"use client";

import * as React from "react";
import { toast } from "sonner";
import { PackageCheck, Boxes, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  createMaterialsReceivingAction,
  confirmMaterialsReceivingAction,
  getSuppliersByMaterialAction,
} from "@/app/(dashboard)/materials/materials-receiving/actions";
import type { MaterialReceivingLookups, MaterialReceivingLookup } from "@/lib/api/materials-receiving";
import { formatNumber, cn } from "@/lib/utils";

// Custom month-letter mapping — MUST mirror cps-api's lot-code.util.ts
// exactly (Jan-Dec = A,B,C,D,F,G,H,I,J,K,L,M, deliberately skipping "E").
// Only used here for a client-side PREVIEW of the non-sequence part of the
// lot codes; the real Internal Lot's running number is only known after the
// backend actually allocates it (see AGENTS.md § Material Receiving — the
// backend generates lots to stay concurrency-safe, the frontend never does).
const MONTH_CODES = ["A", "B", "C", "D", "F", "G", "H", "I", "J", "K", "L", "M"] as const;

function buildLotDatePart(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11 || !day) return "";
  return `${year.slice(2)}${MONTH_CODES[monthIndex]}${day}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const RATIO_REQUIRED_TYPES = new Set(["PIPE", "SHEET", "COIL"]);

interface PackagePreviewRow {
  packageNo: number;
  quantity: number;
  isRemainder: boolean;
}

function buildPackagePreview(receiveQuantity: number, packingQuantity: number): PackagePreviewRow[] {
  if (receiveQuantity <= 0 || packingQuantity <= 0) return [];
  const packageCount = Math.ceil(receiveQuantity / packingQuantity);
  const rows: PackagePreviewRow[] = [];
  let remaining = receiveQuantity;
  for (let i = 1; i <= packageCount; i += 1) {
    const qty = i === packageCount ? remaining : Math.min(packingQuantity, remaining);
    rows.push({ packageNo: i, quantity: qty, isRemainder: i === packageCount && qty < packingQuantity });
    remaining -= qty;
  }
  return rows;
}

// The "receiving ticket" — styled after the physical lot label this data
// becomes once printed and stuck on a box. Punch-hole circles use bg-surface
// (the dialog's own background, see ui/dialog.tsx) sitting on a bg-surface-2
// card, so they read as cutouts rather than decoration.
function LotTicket({
  internalLotPreview,
  supplierLotPreview,
}: {
  internalLotPreview: string;
  supplierLotPreview: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface-2">
      <span className="absolute -left-2 top-6 size-4 rounded-full bg-surface" aria-hidden="true" />
      <span className="absolute -left-2 bottom-6 size-4 rounded-full bg-surface" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2 px-5 pb-1 pt-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted">ป้ายรับเข้า</span>
        <Boxes className="size-3.5 text-fg-muted" aria-hidden="true" />
      </div>
      <div className="px-5 pb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-fg-muted">Internal Lot</p>
        <p className="break-all font-mono text-lg font-semibold uppercase tracking-wide text-fg">
          {internalLotPreview}
        </p>
        <p className="text-[11px] text-fg-muted">เลขลำดับ (XXX) ระบบจะกำหนดจริงตอนบันทึก</p>
      </div>
      <div className="border-t border-dashed border-border-strong px-5 py-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-fg-muted">Supplier Lot</p>
        <p className="font-mono text-base font-semibold uppercase tracking-wide text-fg-secondary">
          {supplierLotPreview || "—"}
        </p>
      </div>
    </div>
  );
}

export function MaterialsReceivingFormDialog({
  open,
  onOpenChange,
  lookups,
  onSaved,
  initialMaterialId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: MaterialReceivingLookups;
  onSaved: () => void;
  // Pre-selects a material — set when arriving from /materials/pc's
  // "รับเข้า" row action (see materials-receiving-client.tsx). Only read
  // once, at mount, same as every other field here: the parent remounts
  // this whole dialog via `key` on every open, so a stale value from a
  // previous open never leaks into a later one.
  initialMaterialId?: string;
}) {
  // No reset-on-open effect here — the parent (materials-receiving-client)
  // remounts this whole component with a fresh `key` every time it opens
  // (see AGENTS.md § Material Receiving), so every state variable's useState
  // initializer already runs fresh. That's the "derive, don't effect"
  // pattern this project's lint config enforces.
  const [materialId, setMaterialId] = React.useState(initialMaterialId ?? "");
  const [receiveQuantity, setReceiveQuantity] = React.useState("");
  const [supplierProductionDate, setSupplierProductionDate] = React.useState(todayIso());
  const [supplierId, setSupplierId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Suppliers are fetched per materialId and keyed by it — the only setState
  // call happens inside the async .then() callback (a genuine async gap),
  // never synchronously in the effect body. `suppliers`/`isLoadingSuppliers`
  // are derived by comparing the stored result's materialId against the
  // current one, same pattern as products-details-dialog.tsx's BOM fetch
  // (see AGENTS.md § Products).
  const [suppliersResult, setSuppliersResult] = React.useState<
    { materialId: string; suppliers: MaterialReceivingLookup[] } | null
  >(null);

  React.useEffect(() => {
    if (!materialId) return;
    let cancelled = false;
    getSuppliersByMaterialAction(materialId).then((result) => {
      if (cancelled) return;
      if (result.status === "success") {
        setSuppliersResult({ materialId, suppliers: result.suppliers });
      } else {
        toast.error(result.message);
        setSuppliersResult({ materialId, suppliers: [] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const suppliers =
    materialId && suppliersResult?.materialId === materialId ? suppliersResult.suppliers : [];
  const isLoadingSuppliers = !!materialId && suppliersResult?.materialId !== materialId;
  // The supplier <Select> only renders (and only needs a real value) when
  // there's more than one option — derive its value instead of resetting
  // `supplierId` via an effect whenever `materialId` changes.
  const supplierSelectValue = suppliers.some((s) => s.id === supplierId) ? supplierId : "";
  const effectiveSupplierId = supplierSelectValue || (suppliers.length === 1 ? suppliers[0].id : "");

  const selectedMaterial = lookups.materials.find((m) => m.id === materialId);
  const packingQuantity = selectedMaterial?.packingQuantity ?? null;
  const receiveQty = Number(receiveQuantity) || 0;
  const packagePreview =
    packingQuantity && packingQuantity > 0 ? buildPackagePreview(receiveQty, packingQuantity) : [];
  const packagePreviewTotal = packagePreview.reduce((sum, r) => sum + r.quantity, 0);
  const receiveDate = todayIso();
  // Internal Lot uses a fixed "CCI" prefix, not the material's own code —
  // the sequence is shared across every material received on the same
  // date, so the prefix has to stay a fixed literal for the lot to stay
  // unique (see AGENTS.md § Material Receiving). Computable regardless of
  // which material is selected.
  const internalLotPreview = `CCI-${buildLotDatePart(receiveDate)}-XXX`;
  const supplierLotPreview = supplierProductionDate ? buildLotDatePart(supplierProductionDate) : "";
  const needsRatio = selectedMaterial?.materialType ? RATIO_REQUIRED_TYPES.has(selectedMaterial.materialType) : false;
  const missingRatio = needsRatio && !selectedMaterial?.ratio;
  const isFutureProductionDate = supplierProductionDate > receiveDate;

  const canSubmit =
    !!selectedMaterial &&
    receiveQty > 0 &&
    !!packingQuantity &&
    packingQuantity > 0 &&
    !!supplierProductionDate &&
    !isFutureProductionDate &&
    !missingRatio &&
    (suppliers.length <= 1 || !!effectiveSupplierId) &&
    !isSubmitting;

  async function handleConfirmReceive() {
    if (!selectedMaterial || !canSubmit) return;
    setIsSubmitting(true);

    const createResult = await createMaterialsReceivingAction({
      materialId: selectedMaterial.id,
      supplierId: effectiveSupplierId || undefined,
      receiveQuantity: String(receiveQty),
      supplierProductionDate,
      receiveDate,
    });

    if (createResult.status === "error") {
      setIsSubmitting(false);
      toast.error(createResult.message);
      return;
    }

    const confirmResult = await confirmMaterialsReceivingAction(createResult.receiving.id);
    setIsSubmitting(false);

    if (confirmResult.status === "success") {
      toast.success("รับเข้าวัตถุดิบสำเร็จ", {
        description: `${confirmResult.receiving.internalLotNo} · ${confirmResult.receiving.packageCount} กล่อง`,
      });
      onSaved();
      onOpenChange(false);
      return;
    }
    // Draft was created (real backend write) but confirm failed — same
    // "truthful partial success" treatment used elsewhere in this app
    // (see AGENTS.md § Products' BOM/workflow phases): don't imply the
    // stock update succeeded when it didn't.
    toast.error(`บันทึกร่างสำเร็จ (${createResult.receiving.internalLotNo}) แต่ยืนยันไม่สำเร็จ: ${confirmResult.message}`, {
      description: "รายการนี้ยังอยู่ในสถานะร่าง สามารถกดยืนยันได้อีกครั้งจากรายการ",
    });
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <DialogHeader>
          <DialogTitle>รับเข้าวัตถุดิบ</DialogTitle>
          <DialogDescription>
            ระบบจะสร้าง Internal Lot, Supplier Lot, จำนวนกล่อง/แพ็ก และ QR Code ให้อัตโนมัติเมื่อกดยืนยันการรับเข้า
          </DialogDescription>
        </DialogHeader>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2 md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Left: form */}
          <div className="flex flex-col gap-4 px-6 py-5 md:overflow-y-auto md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col gap-1.5">
              <Label>วัสดุ</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger><SelectValue placeholder="เลือกวัสดุ" /></SelectTrigger>
                <SelectContent>
                  {lookups.materials.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.code} · {material.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMaterial && (
                <p className="text-xs text-fg-muted">
                  Packing: {packingQuantity ? `${formatNumber(packingQuantity)} / กล่อง` : "ยังไม่ได้ตั้งค่าจำนวนต่อแพ็ก"}
                </p>
              )}
              {selectedMaterial && !packingQuantity && (
                <p className="text-xs text-danger">
                  วัสดุนี้ยังไม่ได้ตั้งค่าจำนวนต่อแพ็ก (Packing Quantity) กรุณาตั้งค่าใน Material Master ก่อนรับเข้า
                </p>
              )}
              {missingRatio && (
                <p className="text-xs text-danger">
                  วัสดุประเภท {selectedMaterial?.materialType} ต้องตั้งค่า ratio ใน Material Master ก่อนรับเข้า
                </p>
              )}
            </div>

            {suppliers.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label>ซัพพลายเออร์</Label>
                <Select value={supplierSelectValue} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue placeholder="เลือกซัพพลายเออร์" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} · {supplier.nameTh || supplier.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-fg-muted">วัสดุนี้มีซัพพลายเออร์มากกว่า 1 ราย กรุณาเลือก</p>
              </div>
            )}
            {materialId && !isLoadingSuppliers && suppliers.length === 0 && (
              <p className="text-xs text-danger">วัสดุนี้ยังไม่ได้เชื่อมกับซัพพลายเออร์ กรุณาตั้งค่าใน Material Master ก่อน</p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mr-receive-qty">จำนวนรับเข้า</Label>
                <Input
                  id="mr-receive-qty"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={receiveQuantity}
                  onChange={(e) => setReceiveQuantity(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mr-supplier-production-date">วันที่ Supplier ผลิต</Label>
                <Input
                  id="mr-supplier-production-date"
                  type="date"
                  max={receiveDate}
                  value={supplierProductionDate}
                  onChange={(e) => setSupplierProductionDate(e.target.value)}
                />
                {isFutureProductionDate && (
                  <p className="text-[11px] text-danger">วันที่ Supplier ผลิตต้องไม่เป็นวันที่ในอนาคต</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: live receiving ticket + box preview */}
          <div className="flex flex-col gap-4 border-t border-border bg-surface-2/40 px-6 py-5 md:overflow-y-auto md:border-l md:border-t-0 md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
            <LotTicket internalLotPreview={internalLotPreview} supplierLotPreview={supplierLotPreview} />

            {packagePreview.length > 0 ? (
              // Card, not a bare bordered box — same header/body/footer shape
              // as every other data card in the app (see AGENTS.md § Theme):
              // a labeled header with a count badge, a scrollable tile grid
              // body, and a footer strip that states the reconciliation
              // (total tiles == receive qty) as its own clear line instead of
              // a trailing "= X ✓" fragment easy to miss.
              <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Boxes className="size-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-fg">กล่อง/แพ็กที่จะได้</span>
                  </div>
                  <Badge variant="primary">{packagePreview.length} กล่อง</Badge>
                </div>

                <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {packagePreview.map((row) => (
                    <div
                      key={row.packageNo}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5",
                        row.isRemainder
                          ? "border-dashed border-warning/50 bg-warning-soft"
                          : "border-border-strong bg-primary-soft"
                      )}
                      title={row.isRemainder ? "กล่องเศษ (ไม่เต็มแพ็ก)" : undefined}
                    >
                      <span className={cn("font-mono text-[10px] font-semibold", row.isRemainder ? "text-warning" : "text-primary")}>
                        #{String(row.packageNo).padStart(3, "0")}
                      </span>
                      <span className="text-base font-bold leading-none tabular-nums text-fg">
                        {formatNumber(row.quantity)}
                      </span>
                      <Badge
                        variant={row.isRemainder ? "warning" : "primary"}
                        style={{ fontSize: "9px", padding: "0 5px", lineHeight: "14px" }}
                      >
                        {row.isRemainder ? "เศษ" : "เต็ม"}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-2/60 px-4 py-2.5">
                  <span className="text-[11px] text-fg-muted">
                    รวม {formatNumber(packagePreviewTotal)} จาก {formatNumber(receiveQty)}
                  </span>
                  {packagePreviewTotal === receiveQty && receiveQty > 0 ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" /> ครบตามจำนวนรับเข้า
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-fg-muted">กำลังคำนวณ…</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
                <Boxes className="size-6 text-fg-muted" aria-hidden="true" />
                <p className="text-xs text-fg-muted">
                  เลือกวัสดุและกรอกจำนวนรับเข้า
                  <br />
                  เพื่อดูตัวอย่างจำนวนกล่อง
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleConfirmReceive} disabled={!canSubmit}>
            <PackageCheck className="h-3.5 w-3.5" /> ยืนยันการรับเข้า
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
