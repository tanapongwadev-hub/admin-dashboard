"use client";

import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveSalesOrderAction } from "@/app/(dashboard)/sales/actions";
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
import { MasterDataEmptyLink } from "@/components/ui/master-data-empty-link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SalesLookups, SalesOrderDetail } from "@/lib/api/sales";

const schema = z
  .object({
    customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
    orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "กรุณาระบุวันที่สั่ง"),
    dueDate: z.string().optional(),
    customerPo: z.string().max(100, "ไม่เกิน 100 ตัวอักษร").optional(),
    remark: z.string().max(1000, "ไม่เกิน 1,000 ตัวอักษร").optional(),
    lines: z
      .array(
        z.object({
          productId: z.string().min(1, "กรุณาเลือกสินค้า"),
          quantity: z.coerce
            .number({ message: "กรุณาระบุจำนวน" })
            .int("ต้องเป็นจำนวนเต็ม")
            .min(1, "อย่างน้อย 1"),
          remark: z.string().max(500, "ไม่เกิน 500 ตัวอักษร").optional(),
        }),
      )
      .min(1, "ต้องมีอย่างน้อย 1 รายการ"),
  })
  .refine((v) => !v.dueDate || v.dueDate >= v.orderDate, {
    path: ["dueDate"],
    message: "วันส่งมอบต้องไม่ก่อนวันที่สั่ง",
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

function defaults(order?: SalesOrderDetail | null): FormInput {
  if (!order) {
    return {
      customerId: "",
      orderDate: today(),
      dueDate: "",
      customerPo: "",
      remark: "",
      lines: [{ productId: "", quantity: 1, remark: "" }],
    };
  }
  return {
    customerId: order.customer.id,
    orderDate: order.orderDate,
    dueDate: order.dueDate ?? "",
    customerPo: order.customerPo ?? "",
    remark: order.remark ?? "",
    lines: order.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      remark: l.remark ?? "",
    })),
  };
}

/**
 * Create/edit a DRAFT sales order. The parent remounts this per open
 * session (`key`), so defaults are read once — no reset-on-open effect.
 */
export function SalesOrderFormDialog({
  open,
  onOpenChange,
  order,
  lookups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: SalesOrderDetail | null;
  lookups: SalesLookups;
  onSaved: (order: SalesOrderDetail) => void;
}) {
  const isEdit = !!order;
  const [saving, setSaving] = React.useState(false);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: defaults(order),
  });
  const { register, control, handleSubmit, setValue, watch, formState } = form;
  const { errors } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = watch("lines");
  const customerId = watch("customerId");
  const productById = new Map(lookups.products.map((p) => [p.id, p]));

  function optionsFor(index: number) {
    const taken = new Set(
      lines.filter((_, i) => i !== index).map((l) => l.productId).filter(Boolean),
    );
    // Products of the chosen customer first, then the rest.
    return lookups.products
      .filter((p) => !taken.has(p.id))
      .sort((a, b) =>
        Number(b.customerId === customerId) - Number(a.customerId === customerId) ||
        a.code.localeCompare(b.code),
      );
  }

  const totalQty = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    const result = await saveSalesOrderAction(
      order?.id ?? null,
      {
        customerId: values.customerId,
        orderDate: values.orderDate,
        dueDate: values.dueDate || null,
        customerPo: values.customerPo?.trim() || null,
        remark: values.remark?.trim() || null,
        lines: values.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          remark: l.remark?.trim() || null,
        })),
      },
      order?.version,
    );
    setSaving(false);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? "บันทึกออเดอร์แล้ว" : `สร้างออเดอร์ ${result.order.code} แล้ว`);
    onSaved(result.order);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="flex flex-col p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            {isEdit ? `แก้ไขออเดอร์ขาย ${order.code}` : "สร้างออเดอร์ขาย"}
          </DialogTitle>
          <DialogDescription>
            ออเดอร์ใหม่เป็นสถานะร่าง — ยืนยันออเดอร์เพื่อสร้างใบจัดงานขายและจองกล่อง FG ตามลำดับ FIFO
          </DialogDescription>
        </DialogHeader>
        <form
          id="sales-order-form"
          onSubmit={handleSubmit(onSubmit)}
          className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <fieldset disabled={saving} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="so-customer">ลูกค้า *</Label>
                {lookups.customers.length === 0 ? (
                  <MasterDataEmptyLink href="/master-data/customers" resourceLabel="ลูกค้า" />
                ) : (
                  <Select
                    value={customerId}
                    onValueChange={(v) => setValue("customerId", v, { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="so-customer"
                      aria-invalid={!!errors.customerId || undefined}
                      aria-describedby={errors.customerId ? "so-customer-error" : undefined}
                    >
                      <SelectValue placeholder="เลือกลูกค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} · {c.nameTh}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.customerId && (
                  <p id="so-customer-error" role="alert" className="text-xs text-danger">
                    {errors.customerId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="so-order-date">วันที่สั่ง *</Label>
                <Input
                  id="so-order-date"
                  type="date"
                  aria-invalid={!!errors.orderDate || undefined}
                  {...register("orderDate")}
                />
                {errors.orderDate && (
                  <p role="alert" className="text-xs text-danger">{errors.orderDate.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="so-due-date">กำหนดส่ง</Label>
                <Input
                  id="so-due-date"
                  type="date"
                  aria-invalid={!!errors.dueDate || undefined}
                  aria-describedby={errors.dueDate ? "so-due-error" : undefined}
                  {...register("dueDate")}
                />
                {errors.dueDate && (
                  <p id="so-due-error" role="alert" className="text-xs text-danger">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="so-po">เลขที่ PO ลูกค้า</Label>
                <Input id="so-po" placeholder="เช่น PO-2026-0012" {...register("customerPo")} />
              </div>
            </div>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">รายการสินค้า</h3>
                <Badge variant="primary">
                  {fields.length} รายการ · รวม {totalQty.toLocaleString("th-TH")} ชิ้น
                </Badge>
              </div>
              {lookups.products.length === 0 ? (
                <MasterDataEmptyLink href="/engineering/products" resourceLabel="สินค้า" />
              ) : (
                fields.map((field, index) => {
                  const line = lines[index];
                  const product = line?.productId ? productById.get(line.productId) : undefined;
                  const qty = Number(line?.quantity) || 0;
                  const over = product ? qty > product.availableQty : false;
                  const lineErrors = errors.lines?.[index];
                  return (
                    <div
                      key={field.id}
                      className="overflow-hidden rounded-md border border-border-strong"
                    >
                      <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">
                          {product ? (
                            `${product.code} · ${product.name}`
                          ) : (
                            <span className="italic text-fg-muted">ยังไม่ได้เลือกสินค้า</span>
                          )}
                        </span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            aria-label={`ลบรายการที่ ${index + 1}`}
                          >
                            <Trash2 className="size-4 text-danger" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_9rem]">
                        <div className="space-y-1.5">
                          <Label htmlFor={`so-line-${index}-product`}>สินค้า *</Label>
                          <Select
                            value={line?.productId ?? ""}
                            onValueChange={(v) =>
                              setValue(`lines.${index}.productId`, v, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger
                              id={`so-line-${index}-product`}
                              aria-invalid={!!lineErrors?.productId || undefined}
                            >
                              <SelectValue placeholder="เลือกสินค้า" />
                            </SelectTrigger>
                            <SelectContent searchPlaceholder="ค้นหารหัสหรือชื่อสินค้า...">
                              {optionsFor(index).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.code} · {p.name} (พร้อมขาย {p.availableQty.toLocaleString("th-TH")})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-fg-muted">
                            สินค้าที่เลือกในรายการอื่นแล้วจะไม่แสดงซ้ำ
                          </p>
                          {lineErrors?.productId && (
                            <p role="alert" className="text-xs text-danger">
                              {lineErrors.productId.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`so-line-${index}-qty`}>
                            จำนวน{product?.unitName ? ` (${product.unitName})` : ""} *
                          </Label>
                          <Input
                            id={`so-line-${index}-qty`}
                            type="number"
                            min={1}
                            step={1}
                            inputMode="numeric"
                            aria-invalid={!!lineErrors?.quantity || undefined}
                            {...register(`lines.${index}.quantity`)}
                          />
                          {lineErrors?.quantity && (
                            <p role="alert" className="text-xs text-danger">
                              {lineErrors.quantity.message}
                            </p>
                          )}
                        </div>
                        {product && (
                          <p
                            className={`text-xs sm:col-span-2 ${over ? "text-danger" : "text-fg-muted"}`}
                          >
                            กล่อง FG พร้อมขาย {product.availableQty.toLocaleString("th-TH")} ชิ้น
                            ({product.boxCount} กล่อง)
                            {over && " — มากกว่าที่มี ยืนยันออเดอร์จะไม่ผ่านจนกว่าจะแพ็กเพิ่ม"}
                          </p>
                        )}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor={`so-line-${index}-remark`}>หมายเหตุรายการ</Label>
                          <Input id={`so-line-${index}-remark`} {...register(`lines.${index}.remark`)} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ productId: "", quantity: 1, remark: "" })}
                disabled={lines.length >= lookups.products.length}
              >
                <Plus className="size-4" />
                เพิ่มรายการสินค้า
              </Button>
            </section>

            <div className="space-y-1.5">
              <Label htmlFor="so-remark">หมายเหตุ</Label>
              <Textarea id="so-remark" rows={3} {...register("remark")} />
            </div>
          </fieldset>
        </form>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button type="submit" form="sales-order-form" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "บันทึกการแก้ไข" : "บันทึกร่าง"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
