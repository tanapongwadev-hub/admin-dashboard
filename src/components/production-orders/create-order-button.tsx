"use client";

import { Boxes, Factory, Layers, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProductionOrderAction } from "@/app/(dashboard)/products/process-orders/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Model = "LOT" | "PACKET";

const MODELS: Array<{ value: Model; title: string; detail: string; icon: typeof Layers }> = [
  {
    value: "LOT",
    title: "ระบบ Lot (ทดลองใช้)",
    detail:
      "ทุกขั้นตอนมี Lot ต่อวันต่อกะ ส่งต่อบางส่วนได้ สอบกลับถึง Lot ที่ WE ได้ทุกชิ้น · QR ออกที่กล่อง FG",
    icon: Layers,
  },
  {
    value: "PACKET",
    title: "ระบบกล่องแบบเดิม",
    detail: "สร้างกล่อง + QR ตั้งแต่บันทึกผลผลิตที่ขั้นแรก แล้วเลื่อนกล่องผ่านแต่ละขั้นตอน",
    icon: Boxes,
  },
];

/**
 * "สั่งผลิต" for one issued plan. During the lot-model trial the user picks
 * the tracking model per order (plan Phase 8); the choice cannot be changed
 * after the order exists.
 */
export function CreateOrderButton({ planId, planCode }: { planId: string; planCode: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState<Model>("LOT");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createProductionOrderAction(planId, model);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      toast.success(`สั่งผลิตแล้ว ${result.order.code}`);
      router.push(`/products/process-orders/${result.order.id}`);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} aria-label={`สั่งผลิตแผน ${planCode}`}>
        <Factory className="size-4" />
        สั่งผลิต
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>สั่งผลิตแผน {planCode}</DialogTitle>
            <DialogDescription>เลือกวิธีติดตามงานของใบสั่งผลิตนี้ (เปลี่ยนภายหลังไม่ได้)</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="วิธีติดตามงาน" className="flex flex-col gap-2 px-6">
            {MODELS.map((m) => {
              const Icon = m.icon;
              const selected = model === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setModel(m.value)}
                  className={cn(
                    "flex gap-3 rounded-md border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary-soft"
                      : "border-border bg-surface hover:bg-surface-2",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-5 shrink-0", selected ? "text-primary" : "text-fg-muted")} aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-fg">{m.title}</span>
                    <span className="text-xs text-fg-secondary">{m.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              ยกเลิก
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Factory className="size-4" />}
              ยืนยันสั่งผลิต
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
