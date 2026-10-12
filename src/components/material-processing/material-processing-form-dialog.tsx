"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Scissors, ArrowRight, Boxes, Package, Check, Link2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProcessingSource } from "@/lib/api/material-processing";
import type { MaterialReceivingLookups } from "@/lib/api/materials-receiving";
import { processMaterialAction } from "@/app/(dashboard)/material-processing/actions";
import { formatNumber } from "@/lib/utils";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

const schema = z.object({
  targetMaterialId: z.string().min(1, "เลือก Material ปลายทาง"),
  sourceQuantity: z.number().int("กรอกจำนวนเต็ม").min(1, "กรอกอย่างน้อย 1").max(1000000),
  piecesPerUnit: z.number().int("กรอกจำนวนเต็ม").min(1, "กรอกอย่างน้อย 1").max(1000000),
  scrapQuantity: z.number().int("กรอกจำนวนเต็ม").min(0, "จำนวนเสียต้องไม่ติดลบ").max(1000000000),
  packingQuantity: z.number().int("กรอกจำนวนเต็ม").min(1, "กรอกอย่างน้อย 1").max(1000000),
  remark: z.string().max(1000, "หมายเหตุไม่เกิน 1,000 ตัวอักษร"),
}).superRefine((value, ctx) => {
  const expected = value.sourceQuantity * value.piecesPerUnit;
  const output = expected - value.scrapQuantity;
  if (output <= 0) ctx.addIssue({ code: "custom", path: ["scrapQuantity"], message: "จำนวนชิ้นดีต้องมากกว่า 0" });
  if (expected > 1000000000) ctx.addIssue({ code: "custom", path: ["piecesPerUnit"], message: "จำนวนชิ้นทั้งหมดต้องไม่เกิน 1,000,000,000" });
  if (Math.ceil(output / value.packingQuantity) > 5000) ctx.addIssue({ code: "custom", path: ["packingQuantity"], message: "สร้างได้ไม่เกิน 5,000 กล่องต่อใบแปรรูป" });
});
type FormValues = z.infer<typeof schema>;
type NumericField = "sourceQuantity" | "piecesPerUnit" | "scrapQuantity" | "packingQuantity";

export function MaterialProcessingFormDialog({ source, lookups, onClose, onSaved }: {
  source: ProcessingSource; lookups: MaterialReceivingLookups; onClose: () => void; onSaved: () => void;
}) {
  const [requestKey] = React.useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = React.useState(false);
  const sourceMaterial = lookups.materials.find((material) => material.id === source.materialId);
  const destinations = lookups.materials.filter((material) => material.id !== source.materialId);
  const configuredTarget = destinations.find((material) => material.id === sourceMaterial?.processingMaterialId);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onChange", defaultValues: {
    targetMaterialId: configuredTarget?.id ?? "", sourceQuantity: Number(source.receiveQuantity), piecesPerUnit: sourceMaterial?.ratio || 1,
    scrapQuantity: 0, packingQuantity: configuredTarget?.packingQuantity || 50, remark: "",
  } });
  const values = form.watch();
  const expected = (values.sourceQuantity || 0) * (values.piecesPerUnit || 0);
  const good = Math.max(0, expected - (values.scrapQuantity || 0));
  const packageCount = values.packingQuantity > 0 ? Math.ceil(good / values.packingQuantity) : 0;
  const hasPreview = [values.sourceQuantity, values.piecesPerUnit, values.scrapQuantity, values.packingQuantity].every(Number.isInteger)
    && values.sourceQuantity > 0 && values.piecesPerUnit > 0 && values.scrapQuantity >= 0
    && values.packingQuantity > 0 && expected <= 1000000000
    && good > 0 && packageCount > 0 && packageCount <= 5000;
  const target = destinations.find((material) => material.id === values.targetMaterialId);
  const available = Number(source.availableQuantity);
  const sourceExceedsAvailable = values.sourceQuantity > available;
  const fullBoxes = hasPreview ? Math.floor(good / values.packingQuantity) : 0;
  const remainder = hasPreview ? good % values.packingQuantity : 0;
  // Always include the final box so a remainder stays visible on large runs.
  const previewIndexes = hasPreview
    ? packageCount <= 6
      ? Array.from({ length: packageCount }, (_, index) => index)
      : [0, 1, 2, 3, 4, packageCount - 1]
    : [];

  function numericField(name: NumericField, label: string, unit: string, hint: string) {
    const error = form.formState.errors[name];
    return (
      <div className="space-y-2">
        <Label htmlFor={`mp-${name}`}>{label} <span className="text-danger">*</span></Label>
        <div className="relative">
          <Input
            id={`mp-${name}`}
            type="number"
            inputMode="numeric"
            min={name === "scrapQuantity" ? 0 : 1}
            max={name === "sourceQuantity" ? Math.floor(available) : undefined}
            step="1"
            className="h-11 pr-20 text-base tabular-nums"
            {...form.register(name, { valueAsNumber: true })}
            aria-required="true"
            aria-invalid={!!error || (name === "sourceQuantity" && sourceExceedsAvailable)}
            aria-describedby={`mp-${name}-hint${error ? ` mp-${name}-error` : ""}`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-fg-muted">{unit}</span>
        </div>
        <p id={`mp-${name}-hint`} className={`text-xs ${name === "sourceQuantity" && sourceExceedsAvailable ? "text-danger" : "text-fg-muted"}`}>
          {name === "sourceQuantity" && sourceExceedsAvailable ? "จำนวนเกินวัตถุดิบพร้อมแปรรูป" : hint}
        </p>
        {error && <p id={`mp-${name}-error`} role="alert" className="text-xs text-danger">{error.message}</p>}
      </div>
    );
  }
  async function submit(data: FormValues) {
    if (submitting) return;
    if (data.sourceQuantity > Number(source.availableQuantity)) {
      form.setError("sourceQuantity", { message: "จำนวนเกินวัตถุดิบคงเหลือที่ไม่ถูกจอง" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await processMaterialAction({ ...data, sourceReceivingId: source.id, requestKey });
      if (result.status === "error") { toast.error(result.message); return; }
      toast.success("แปรรูปและรับเข้าปลายทางแล้ว", { description: `${result.processing.code} · ${formatNumber(Number(result.processing.outputQuantity))} ชิ้น` });
      onSaved();
    } catch {
      toast.error(CONNECTION_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogContent fullScreenOnMobile size="xl" className="overflow-hidden">
        <DialogHeader className="shrink-0 gap-3 pr-12">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Scissors className="size-5" aria-hidden="true" /></span>
            <div className="space-y-1">
              <DialogTitle className="text-lg">แปรรูปวัตถุดิบ</DialogTitle>
              <DialogDescription>กำหนดจำนวนตัดและการบรรจุ เพื่อรับเข้าวัสดุปลายทาง</DialogDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted" aria-hidden="true">
            <span>วัตถุดิบต้นทาง</span><ArrowRight className="size-3" /><span>ตัดชิ้นงาน</span><ArrowRight className="size-3" /><span>รับเข้าปลายทาง</span>
          </div>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-busy={submitting}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
              <fieldset disabled={submitting} className="min-w-0 space-y-6">
                <legend className="sr-only">รายละเอียดการแปรรูปวัตถุดิบ</legend>
                <section aria-labelledby="mp-source-heading" className="space-y-4">
                  <h3 id="mp-source-heading" className="flex items-center gap-2 text-sm font-semibold text-fg"><span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-xs text-fg-secondary">1</span> วัตถุดิบต้นทาง</h3>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="space-y-2 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-primary">{source.materialCode}</span><Badge variant="neutral">{source.materialType}</Badge></div>
                      <p className="text-sm font-semibold text-fg">{source.materialName}</p>
                      <p className="break-all font-mono text-xs text-fg-muted">ล็อต {source.internalLotNo}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2 px-4 py-3">
                      <div><p className="text-xs font-medium text-fg-secondary">พร้อมแปรรูป</p><p className="mt-0.5 text-xs text-fg-muted">หักจำนวนที่ถูกจองแล้ว</p></div>
                      <p className="text-xl font-semibold tabular-nums text-fg">{formatNumber(available)} <span className="text-xs font-normal text-fg-muted">{source.unit}</span></p>
                    </div>
                  </div>
                  {numericField("sourceQuantity", "จำนวนวัตถุดิบที่ใช้", source.unit, `ใช้ได้สูงสุด ${formatNumber(Math.floor(available))} ${source.unit} · กรอกจำนวนเต็ม`)}
                </section>

                <section aria-labelledby="mp-cut-heading" className="space-y-4 border-t border-border pt-5">
                  <h3 id="mp-cut-heading" className="flex items-center gap-2 text-sm font-semibold text-fg"><span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-xs text-fg-secondary">2</span> กำหนดการตัดชิ้นงาน</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {numericField("piecesPerUnit", `ตัดได้ต่อ 1 ${source.unit}`, "ชิ้น", "จำนวนชิ้นทั้งหมดก่อนหักชิ้นเสีย")}
                    {numericField("scrapQuantity", "จำนวนชิ้นเสียรวม", "ชิ้น", "กรอก 0 หากไม่มีชิ้นเสีย")}
                  </div>
                </section>

                <section aria-labelledby="mp-output-heading" className="space-y-4 border-t border-border pt-5">
                  <h3 id="mp-output-heading" className="flex items-center gap-2 text-sm font-semibold text-fg"><span className="flex size-6 items-center justify-center rounded-full bg-surface-2 text-xs text-fg-secondary">3</span> วัสดุและการบรรจุปลายทาง</h3>
                  <div className="space-y-2">
                    <Label htmlFor="mp-target">Material ปลายทาง <span className="text-danger">*</span></Label>
                    <Controller control={form.control} name="targetMaterialId" render={({ field }) => (
                      <Select disabled={submitting} value={field.value} onValueChange={(value) => {
                        field.onChange(value);
                        const selected = destinations.find((material) => material.id === value);
                        if (selected?.packingQuantity) form.setValue("packingQuantity", selected.packingQuantity, { shouldValidate: true });
                      }}>
                        <SelectTrigger id="mp-target" ref={field.ref} onBlur={field.onBlur} className="h-11 text-base sm:text-sm" aria-required="true" aria-invalid={!!form.formState.errors.targetMaterialId} aria-describedby={`mp-target-hint${form.formState.errors.targetMaterialId ? " mp-target-error" : ""}`}>
                          <SelectValue placeholder="เลือกวัสดุชิ้นงานหลังแปรรูป" />
                        </SelectTrigger>
                        <SelectContent>{destinations.map((material) => <SelectItem key={material.id} value={material.id}>{material.code} · {material.name} ({material.unit})</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                    <p id="mp-target-hint" className="text-xs text-fg-muted">เลือก Material แยกจากวัตถุดิบต้นทาง</p>
                    {form.formState.errors.targetMaterialId && <p id="mp-target-error" role="alert" className="text-xs text-danger">{form.formState.errors.targetMaterialId.message}</p>}
                    {destinations.length === 0 && <p className="text-xs text-danger">กรุณาสร้าง Material ปลายทางแยกในหน้าวัสดุก่อน</p>}
                  </div>
                  {numericField("packingQuantity", "จำนวนชิ้นต่อกล่อง", "ชิ้น / กล่อง", "กล่องสุดท้ายรับเข้าเท่าจำนวนชิ้นที่เหลือ")}
                  <div className="space-y-2">
                    <Label htmlFor="mp-remark">หมายเหตุ <span className="font-normal text-fg-muted">(ถ้ามี)</span></Label>
                    <Input id="mp-remark" className="h-11 text-base sm:text-sm" placeholder="เช่น รายละเอียดการตัดหรือรอบแปรรูป" {...form.register("remark")} maxLength={1000} aria-invalid={!!form.formState.errors.remark} aria-describedby={form.formState.errors.remark ? "mp-remark-error" : undefined} />
                    {form.formState.errors.remark && <p id="mp-remark-error" role="alert" className="text-xs text-danger">{form.formState.errors.remark.message}</p>}
                  </div>
                </section>
              </fieldset>

              <aside className="min-w-0 self-start overflow-hidden rounded-xl border border-border bg-surface-2 md:sticky md:top-6" aria-labelledby="mp-preview-heading">
                <div className="border-b border-border bg-surface px-5 py-4">
                  <h3 id="mp-preview-heading" className="flex items-center gap-2 text-sm font-semibold text-fg"><Boxes className="size-4 text-primary" aria-hidden="true" /> สรุปก่อนรับเข้า</h3>
                  <p className="mt-1 text-xs text-fg-muted">อัปเดตตามจำนวนที่กรอก</p>
                </div>
                <div className="space-y-5 p-5">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-fg-secondary">ชิ้นงานดีที่จะรับเข้า</p>
                    <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-primary" role="status" aria-live="polite" aria-atomic="true">{hasPreview ? formatNumber(good) : "—"} <span className="text-sm font-normal text-fg-muted">ชิ้น</span></p>
                    <p className="mt-3 text-xs leading-relaxed text-fg-secondary">{formatNumber(values.sourceQuantity || 0)} {source.unit} × {formatNumber(values.piecesPerUnit || 0)} ชิ้น − เสีย {formatNumber(values.scrapQuantity || 0)} ชิ้น</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                      <div><dt className="text-fg-muted">ตัดได้ทั้งหมด</dt><dd className="mt-1 font-semibold tabular-nums text-fg">{hasPreview ? formatNumber(expected) : "—"} ชิ้น</dd></div>
                      <div><dt className="text-fg-muted">ต้นทางเหลือพร้อมแปรรูป</dt><dd className={`mt-1 font-semibold tabular-nums ${sourceExceedsAvailable ? "text-danger" : "text-fg"}`}>{hasPreview && !sourceExceedsAvailable ? formatNumber(available - values.sourceQuantity) : "—"} {source.unit}</dd></div>
                    </dl>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-fg">การบรรจุ</h4><Badge variant="primary">{hasPreview ? formatNumber(packageCount) : "—"} กล่อง</Badge></div>
                    {hasPreview ? <>
                      <p className="text-xs text-fg-secondary">เต็ม {formatNumber(fullBoxes)} กล่อง × {formatNumber(values.packingQuantity)} ชิ้น{remainder > 0 ? ` + เศษ ${formatNumber(remainder)} ชิ้น` : ""}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {previewIndexes.map((index) => {
                          const quantity = Math.min(values.packingQuantity, good - index * values.packingQuantity);
                          const isRemainder = quantity < values.packingQuantity;
                          return <div key={index} className={`rounded-lg border p-3 ${isRemainder ? "border-warning bg-warning-soft" : "border-border bg-surface"}`}>
                            <div className="flex items-center gap-1.5 text-xs text-fg-muted"><Package className="size-3.5 shrink-0" aria-hidden="true" /><span>กล่อง {formatNumber(index + 1)}</span></div>
                            <p className="my-2 text-lg font-semibold tabular-nums text-fg">{formatNumber(quantity)} <span className="text-xs font-normal text-fg-muted">ชิ้น</span></p>
                            <Badge variant={isRemainder ? "warning" : "neutral"}>{isRemainder ? "กล่องเศษ" : "เต็มกล่อง"}</Badge>
                          </div>;
                        })}
                      </div>
                      {packageCount > 6 && <p className="text-xs text-fg-muted">แสดง 5 กล่องแรกและกล่องสุดท้าย จาก {formatNumber(packageCount)} กล่อง</p>}
                    </> : <div className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-xs leading-relaxed text-fg-muted">กรอกจำนวนการตัดและการบรรจุให้ครบ<br />เพื่อดูตัวอย่างกล่องที่จะรับเข้า</div>}
                  </div>

                  <div className="space-y-3 border-t border-border pt-4">
                    <div className="flex items-start gap-2"><ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><p className="text-xs text-fg-muted">รับเข้าเป็น Material</p>{target ? <><p className="mt-1 break-all font-mono text-xs font-semibold text-primary">{target.code}</p><p className="mt-1 text-sm text-fg">{target.name}</p></> : <p className="mt-1 text-sm text-fg-muted">รอเลือกวัสดุปลายทาง</p>}</div></div>
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-secondary"><Link2 className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden="true" />สร้างรหัสรับเข้าและ QR กล่องใหม่ เชื่อมโยงกลับมายังล็อตต้นทาง</p>
                  </div>
                </div>
              </aside>
            </div>
          </div>
          <DialogFooter className="shrink-0 flex-wrap bg-surface">
            <p className="mr-auto hidden text-xs text-fg-muted sm:block">ยืนยันเพื่อหักต้นทางและรับเข้าปลายทาง</p>
            <Button type="button" variant="outline" className="h-11" disabled={submitting} onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" className="h-11 flex-1 sm:flex-none" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              {submitting ? "กำลังบันทึก…" : "ยืนยันแปรรูปและรับเข้า"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
