"use client";

import { Loader2, Printer, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generatePackagesAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoardLot, LineBoard, PackageView } from "@/lib/api/production-lots";
import { formatThaiDate } from "@/lib/production-day";
import type { ReverseTarget } from "./reverse-dialog";

const DEFAULT_PACK_SIZE = 100;

/** Same split as cps-api domain/packing.ts — full boxes then one partial. */
function previewBoxes(qty: number, packSize: number): number[] {
  if (qty < 1 || packSize < 1) return [];
  const boxes = Array(Math.floor(qty / packSize)).fill(packSize);
  if (qty % packSize) boxes.push(qty % packSize);
  return boxes;
}

/**
 * "แพ็กกล่อง" at a receiving (FG/STORE) step: split part of an FG lot into
 * boxes, one QR each. Remounted per open by the parent (fresh requestId).
 * After success it switches to a result view with a print button.
 */
export function PackDialog({
  lineId,
  lot,
  onClose,
  onDone,
  onPrint,
  onUndo,
}: {
  lineId: string;
  lot: BoardLot;
  onClose: () => void;
  onDone: (board: LineBoard) => void;
  onPrint: (packages: PackageView[], fgLotNo: string) => void;
  /** Omitted without the reverse permission: no "ยกเลิกการแพ็กนี้". */
  onUndo?: (target: ReverseTarget) => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [qty, setQty] = useState(String(lot.remainingQty));
  const [packSize, setPackSize] = useState(String(DEFAULT_PACK_SIZE));
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<PackageView[] | null>(null);

  const qtyNum = Number(qty) || 0;
  const sizeNum = Number(packSize) || 0;
  const boxes = previewBoxes(qtyNum, sizeNum);
  const over = qtyNum > lot.remainingQty;
  const valid = Number.isInteger(qtyNum) && qtyNum >= 1 && !over && Number.isInteger(sizeNum) && sizeNum >= 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const result = await generatePackagesAction(lineId, { requestId, fgLotId: lot.id, qty: qtyNum, packSize: sizeNum });
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(`สร้าง ${result.result.packages.length} กล่องจาก ${lot.lotNo}`);
    setCreated(result.result.packages);
    onDone(result.board);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        {created ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>แพ็กแล้ว {created.length} กล่อง</DialogTitle>
              <DialogDescription>
                Lot {lot.lotNo} · พิมพ์ฉลาก QR (60×40 มม.) แล้วติดที่กล่อง
              </DialogDescription>
            </DialogHeader>
            <ul className="mx-6 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {created.map((pkg) => (
                <li key={pkg.id} className="flex items-center gap-3 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data: URL SVG */}
                  <img src={pkg.qrImage} alt="" className="size-12 shrink-0 rounded bg-white p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-fg">{pkg.qrCode}</p>
                    <p className="text-xs text-fg-secondary">
                      ต้นทาง {pkg.origins.map((o) => `${o.lotNo} (${o.qty})`).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums text-fg">{pkg.initialQty}</span>
                    {pkg.unitType === "PARTIAL" && <Badge variant="warning">เศษ</Badge>}
                  </div>
                </li>
              ))}
            </ul>
            <DialogFooter>
              {onUndo && (
                <Button
                  variant="ghost"
                  className="mr-auto"
                  onClick={() =>
                    onUndo({
                      lineId,
                      requestId,
                      label: `แพ็กกล่อง ${lot.lotNo} ${created.length} กล่อง`,
                    })
                  }
                >
                  <Undo2 className="size-4" /> ยกเลิกการแพ็กนี้
                </Button>
              )}
              <Button variant="ghost" onClick={onClose}>
                ปิด
              </Button>
              <Button onClick={() => onPrint(created, lot.lotNo)}>
                <Printer className="size-4" /> พิมพ์ฉลาก {created.length} ใบ
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>แพ็กกล่อง · {lot.lotNo}</DialogTitle>
              <DialogDescription>
                ผลิต {formatThaiDate(lot.productionDate)} กะ {lot.shift} · ยังไม่แพ็ก{" "}
                {lot.remainingQty.toLocaleString("th-TH")} ชิ้น
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 px-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pk-qty">จำนวนที่แพ็ก (ชิ้น)</Label>
                  <Input
                    id="pk-qty"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={lot.remainingQty}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pk-size">ชิ้นต่อกล่อง</Label>
                  <Input
                    id="pk-size"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                  />
                </div>
              </div>
              {boxes.length > 0 && !over && (
                <div className="flex flex-wrap gap-1.5" aria-label="ตัวอย่างกล่อง">
                  {boxes.map((b, i) => (
                    <span
                      key={i}
                      className={
                        b < sizeNum
                          ? "rounded border border-dashed border-warning/60 bg-warning-soft px-2 py-1 text-xs tabular-nums text-warning-fg"
                          : "rounded border border-border-strong bg-primary-soft px-2 py-1 text-xs tabular-nums text-primary"
                      }
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
              <p role={over ? "alert" : undefined} className={over ? "text-xs text-danger" : "text-xs text-fg-secondary"}>
                {over
                  ? `เกินจำนวนที่ยังไม่แพ็ก (${lot.remainingQty} ชิ้น)`
                  : boxes.length
                    ? `${boxes.length} กล่อง${boxes[boxes.length - 1] < sizeNum ? ` (กล่องสุดท้ายเป็นเศษ ${boxes[boxes.length - 1]} ชิ้น)` : ""} · QR 1 ดวงต่อกล่อง`
                    : "ใส่จำนวนอย่างน้อย 1 ชิ้น"}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={!valid || saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                สร้างกล่อง + QR
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
