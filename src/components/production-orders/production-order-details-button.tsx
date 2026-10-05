"use client";

import { Eye, Loader2, Printer, StepForward } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  advanceProductionOrderPacketAction,
  getProductionOrderAction,
} from "@/app/(dashboard)/products/process-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ProductionOrderDetail,
  ProductionOrderPacket,
} from "@/lib/api/production-orders";

export function ProductionOrderDetailsButton({
  orderId,
  orderCode,
  canAdvance,
}: {
  orderId: string;
  orderCode: string;
  canAdvance: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`ดูรายละเอียด ${orderCode}`}
      >
        <Eye className="size-4" />
        รายละเอียด
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent fullScreenOnMobile size="xl" className="print:hidden">
          {/* Mounted only while open so every open fetches fresh data. */}
          {open && (
            <DetailsBody
              orderId={orderId}
              orderCode={orderCode}
              canAdvance={canAdvance}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PacketStatus({ packet }: { packet: ProductionOrderPacket }) {
  if (packet.status === "COMPLETED") {
    return <Badge variant="success">ผลิตเสร็จแล้ว</Badge>;
  }
  return (
    <Badge variant="info">
      ขั้นที่ {packet.currentStepIndex + 1}: {packet.currentStep?.name ?? "—"}
    </Badge>
  );
}

function DetailsBody({
  orderId,
  orderCode,
  canAdvance,
}: {
  orderId: string;
  orderCode: string;
  canAdvance: boolean;
}) {
  const [order, setOrder] = useState<ProductionOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getProductionOrderAction(orderId).then((result) => {
      if (cancelled) return;
      if (result.status === "error") setError(result.message);
      else setOrder(result.order);
    });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  async function advance(packetId: string) {
    setAdvancingId(packetId);
    const result = await advanceProductionOrderPacketAction(packetId);
    setAdvancingId(null);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    setOrder(result.order);
    toast.success("เลื่อนขั้นตอนแล้ว");
  }

  return (
    <div className="flex max-h-[85vh] flex-col">
      <DialogHeader className="shrink-0">
        <DialogTitle>ใบสั่งผลิต {orderCode}</DialogTitle>
        <DialogDescription>
          {order
            ? `แผน ${order.planCode ?? "—"} · ผลิตเสร็จ ${order.completedPacketCount}/${order.packetCount} packet`
            : "กำลังโหลด..."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {error && <p className="text-sm text-danger">{error}</p>}
        {!order && !error && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-fg-muted" />
          </div>
        )}
        {order?.lines.map((line) => (
          <section key={line.id} className="mb-6 last:mb-0">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-fg">
                <span className="font-mono text-fg-secondary">
                  {line.product.code}
                </span>{" "}
                {line.product.name}
              </h3>
              <p className="text-xs text-fg-muted">
                ผลิต {line.quantity} ชิ้น · packet ละ {line.packingQuantity} ·{" "}
                {line.packets.length} packet
              </p>
              <ol className="mt-2 flex flex-wrap items-center gap-1 text-xs text-fg-secondary">
                {line.steps.map((step, i) => (
                  <li key={step.index} className="flex items-center gap-1">
                    <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5">
                      {i + 1}. {step.name}
                    </span>
                    {i < line.steps.length - 1 && <span aria-hidden>→</span>}
                  </li>
                ))}
              </ol>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {line.packets.map((packet) => (
                <li
                  key={packet.id}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={packet.qrImage}
                    alt={`QR Code ${packet.qrCode}`}
                    className="size-24 shrink-0 rounded border border-border bg-white"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="truncate font-mono text-xs text-fg-secondary">
                      {packet.qrCode}
                    </p>
                    <p className="text-sm text-fg">
                      Packet {packet.packetNo} ·{" "}
                      <span className="font-semibold">{packet.quantity}</span>{" "}
                      ชิ้น
                    </p>
                    <PacketStatus packet={packet} />
                    {canAdvance && packet.status !== "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-auto self-start"
                        disabled={advancingId === packet.id}
                        onClick={() => void advance(packet.id)}
                      >
                        {advancingId === packet.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <StepForward className="size-4" />
                        )}
                        ไปขั้นตอนถัดไป
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="flex shrink-0 justify-end border-t border-border px-6 py-3">
        <Button
          variant="outline"
          size="sm"
          disabled={!order}
          onClick={() => setPrinting(true)}
        >
          <Printer className="size-4" />
          พิมพ์ QR Code
        </Button>
      </div>

      {printing && order && <PrintSheet order={order} />}
    </div>
  );
}

// Print-only overlay (same "print the current document, no window.open()"
// technique as materials-receiving-qr-print-sheet.tsx).
function PrintSheet({ order }: { order: ProductionOrderDetail }) {
  return createPortal(
    <div id="qr-print-root" className="hidden print:block">
      <div className="grid grid-cols-3 gap-3 p-4">
        {order.lines.flatMap((line) =>
          line.packets.map((packet) => (
            <div
              key={packet.id}
              className="flex flex-col items-center gap-1 border border-black p-2 text-center text-xs text-black"
              style={{ breakInside: "avoid" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={packet.qrImage} alt="" className="size-32" />
              <p className="font-mono">{packet.qrCode}</p>
              <p>
                {line.product.code} · {line.product.name}
              </p>
              <p>
                Packet {packet.packetNo} · {packet.quantity} ชิ้น
              </p>
            </div>
          )),
        )}
      </div>
    </div>,
    document.body,
  );
}
