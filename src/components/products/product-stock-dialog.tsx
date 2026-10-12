"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProductStockAction, recordProductStockAction } from "@/app/(dashboard)/products/stock-actions";
import { ProductStockBalance, formatProductQuantity } from "./product-stock-balance";
import type { Product } from "@/lib/api/products";
import type { ProductStock } from "@/lib/api/product-stock";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

const schema = z.object({
  type: z.enum(["receive", "issue"]),
  quantity: z.number().min(0.0001, "ระบุจำนวนมากกว่า 0").max(1000000000, "จำนวนมากเกินกำหนด")
    .refine((value) => /^\d+(\.\d{1,4})?$/.test(String(value)), "ระบุทศนิยมได้ไม่เกิน 4 ตำแหน่ง"),
  referenceNo: z.string().trim().min(1, "ระบุเลขที่เอกสารอ้างอิง").max(100),
  remark: z.string().trim().max(1000),
});
type Values = z.infer<typeof schema>;

export function ProductStockDialog({ product, canManageStock, onClose, onSaved }: {
  product: Product; canManageStock: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [stock, setStock] = useState<ProductStock | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [pending, startTransition] = useTransition();
  const request = useRef<{ signature: string; id: string } | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: "receive", referenceNo: "", remark: "" } });
  useEffect(() => {
    let cancelled = false;
    getProductStockAction(product.id).then((result) => {
      if (cancelled) return;
      if (result.status === "success") { setStock(result.stock); setError(""); }
      else setError(result.message);
    }).catch(() => { if (!cancelled) setError(CONNECTION_ERROR_MESSAGE); });
    return () => { cancelled = true; };
  }, [product.id, reload]);

  function submit(values: Values) {
    const signature = JSON.stringify(values);
    const activeRequest = request.current?.signature === signature ? request.current : { signature, id: crypto.randomUUID() };
    request.current = activeRequest;
    const requestId = activeRequest.id;
    startTransition(async () => {
      try {
        const result = await recordProductStockAction(product.id, { ...values, requestId });
        if (result.status === "error") { setError(result.message); return; }
        setStock(result.stock); setError(""); request.current = null;
        form.reset({ type: values.type, referenceNo: "", remark: "" });
        toast.success(values.type === "receive" ? "รับเข้าสินค้าสำเร็จรูปแล้ว" : "จ่ายออกสินค้าสำเร็จรูปแล้ว");
        onSaved();
      } catch { setError(CONNECTION_ERROR_MESSAGE); }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent fullScreenOnMobile size="xl" onInteractOutside={(event) => { if (pending) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>สต็อกสินค้าสำเร็จรูป · {product.code}</DialogTitle>
          <DialogDescription>{product.name} — ยอดรับเข้าลบยอดจ่ายออกที่บันทึกในระบบ</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto p-6">
          <ProductStockBalance product={product} quantity={stock?.quantity} />
          {stock && <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-fg-secondary"><p>รับเข้าสะสม {formatProductQuantity(stock.receivedQuantity)}</p><p>จ่ายออกสะสม {formatProductQuantity(stock.issuedQuantity)}</p></div>}
          {error && <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}{!stock && <Button variant="secondary" size="sm" className="ml-2" onClick={() => setReload((value) => value + 1)}>โหลดใหม่</Button>}</div>}
          {!stock && !error && <p role="status" className="text-sm text-fg-muted">กำลังโหลดยอดคงเหลือ…</p>}
          {canManageStock && product.isActive && stock && (
            <form onSubmit={form.handleSubmit(submit)} className="rounded-md border border-border bg-surface-2/40 p-4">
              <h3 className="mb-3 text-sm font-semibold text-fg">บันทึกความเคลื่อนไหว</h3>
              <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stock-type">ประเภทรายการ</Label>
                  <Controller control={form.control} name="type" render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                      <SelectTrigger id="stock-type" ref={field.ref} onBlur={field.onBlur}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="receive">รับเข้าสินค้าสำเร็จรูป</SelectItem><SelectItem value="issue">จ่ายออกสินค้าสำเร็จรูป</SelectItem></SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5"><Label htmlFor="stock-quantity">จำนวน ({product.unit?.nameTh || product.unit?.code || "หน่วยสินค้า"})</Label><Input id="stock-quantity" type="number" min="0.0001" max="1000000000" step="0.0001" required {...form.register("quantity", { valueAsNumber: true })} aria-invalid={!!form.formState.errors.quantity} />{form.formState.errors.quantity && <p role="alert" className="text-xs text-danger">{form.formState.errors.quantity.message}</p>}</div>
                <div className="space-y-1.5"><Label htmlFor="stock-reference">เลขที่เอกสารอ้างอิง</Label><Input id="stock-reference" required maxLength={100} placeholder="เช่น ใบรับสินค้า / ใบส่งสินค้า" {...form.register("referenceNo")} aria-invalid={!!form.formState.errors.referenceNo} />{form.formState.errors.referenceNo && <p role="alert" className="text-xs text-danger">{form.formState.errors.referenceNo.message}</p>}</div>
                <div className="space-y-1.5"><Label htmlFor="stock-remark">หมายเหตุ</Label><Input id="stock-remark" maxLength={1000} {...form.register("remark")} /></div>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2"><p className="text-xs text-fg-muted">บันทึกแล้วมีผลต่อยอดคงเหลือทันที</p><Button type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "ยืนยันรายการ"}</Button></div>
              </fieldset>
            </form>
          )}
          {stock && <section aria-label="ประวัติรับเข้าและจ่ายออก"><h3 className="mb-3 text-sm font-semibold text-fg">ความเคลื่อนไหวล่าสุด (สูงสุด 50 รายการ)</h3>
            {stock.movements.length === 0 ? <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-fg-muted">ยังไม่มีรายการรับเข้า–จ่ายออกสินค้า</p> : <ol className="space-y-2">{stock.movements.map((entry) => <li key={entry.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant={entry.type === "receive" ? "success" : "warning"}>{entry.type === "receive" ? "รับเข้า" : "จ่ายออก"}</Badge><span className="text-sm font-semibold tabular-nums text-fg">{entry.type === "receive" ? "+" : "−"}{formatProductQuantity(entry.quantity)}</span></div><p className="text-xs text-fg-secondary">คงเหลือหลังรายการ {formatProductQuantity(entry.balanceAfter)}</p></div>
              <p className="mt-2 break-words text-sm text-fg">{entry.referenceNo}</p>{entry.remark && <p className="mt-1 break-words text-xs text-fg-secondary">{entry.remark}</p>}<p className="mt-2 text-xs text-fg-muted">{new Date(entry.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} · {entry.actorName}</p>
            </li>)}</ol>}
          </section>}
        </div>
        <DialogFooter className="mt-auto"><Button variant="secondary" disabled={pending} onClick={onClose}>ปิด</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
