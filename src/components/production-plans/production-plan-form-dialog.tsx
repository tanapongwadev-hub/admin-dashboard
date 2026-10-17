"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
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
import { SearchableFilterSelect } from "@/components/ui/searchable-filter-select";
import { Textarea } from "@/components/ui/textarea";
import { MasterDataEmptyLink } from "@/components/ui/master-data-empty-link";
import {
  createProductionPlanAction,
  updateProductionPlanAction,
} from "@/app/(dashboard)/production/products/plans/actions";
import type {
  ProductionPlan,
  ProductionPlanLookups,
} from "@/lib/api/production-plans";

const schema = z.object({
  title: z.string().max(255),
  remark: z.string().max(2000),
  lines: z
    .array(
      z.object({
        targetId: z.string().min(1, "กรุณาเลือกรายการผลิต"),
        quantity: z.coerce
          .number()
          .int("ต้องเป็นจำนวนเต็ม")
          .min(1, "อย่างน้อย 1"),
        needByDate: z.string().min(1, "กรุณาระบุวันที่"),
        remark: z.string().max(1000),
      }),
    )
    .min(1),
});
type Values = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;
const blank = { targetId: "", quantity: 1, needByDate: "", remark: "" };

export function ProductionPlanFormDialog({
  open,
  onOpenChange,
  plan,
  lookups,
  onSaved,
  targetType = 'product',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ProductionPlan | null;
  lookups: ProductionPlanLookups;
  onSaved: () => void;
  targetType?: 'product' | 'material';
}) {
  const targetLabel = targetType === 'material' ? 'วัตถุดิบภายใน' : 'สินค้า';
  const targetOptions = targetType === 'material'
    ? (lookups.materials ?? []).map((material) => {
        const reason = material.isRaw ? 'วัตถุดิบก่อนแปรรูป' : !material.activeBomId ? 'ยังไม่มี BOM' : null;
        return {
          value: `material:${material.id}`,
          label: `${material.code} · ${material.name} · ${reason ?? `BOM ${material.activeBomVersion}`}`,
          disabled: reason !== null,
        };
      })
    : lookups.products.map((product) => ({ value: `product:${product.id}`, label: `${product.code} · ${product.name} · BOM ${product.activeBomVersion}` }));
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      title: plan?.title ?? "",
      remark: plan?.remark ?? "",
      lines: plan?.lines.map((line) => ({
        targetId: line.materialId ? `material:${line.materialId}` : `product:${line.productId}`,
        quantity: line.quantity,
        needByDate: line.needByDate.slice(0, 10),
        remark: line.remark ?? "",
      })) ?? [blank],
    },
  });
  const fields = useFieldArray({ control: form.control, name: "lines" });
  async function submit(values: Values) {
    const payload = {
      title: values.title.trim() || undefined,
      remark: values.remark.trim() || undefined,
      lines: values.lines.map((line) => ({
        ...(line.targetId.startsWith('material:') ? { materialId: line.targetId.slice(9) } : { productId: line.targetId.slice(8) }),
        quantity: line.quantity, needByDate: line.needByDate,
        remark: line.remark.trim() || undefined,
      })),
    };
    const result = plan
      ? await updateProductionPlanAction(plan.id, payload)
      : await createProductionPlanAction(payload);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(plan ? "บันทึกแผนแล้ว" : "สร้างแผนการผลิตแล้ว", {
      description: result.plan.code,
    });
    onOpenChange(false);
    onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="flex flex-col overflow-hidden sm:h-[90dvh] sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {plan ? `แก้ไข ${plan.code}` : "สร้างแผนการผลิต"}
          </DialogTitle>
          <DialogDescription>
            {targetLabel}แต่ละรายการจะผูกกับ BOM ที่เปิดใช้งานเมื่อบันทึก
            และยังไม่กันสต็อกจนกว่าจะอนุมัติ
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-title">ชื่อแผน</Label>
                <Input
                  id="plan-title"
                  {...form.register("title")}
                  placeholder="เช่น แผนผลิตสัปดาห์ที่ 39"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-remark">หมายเหตุรวม</Label>
                <Input id="plan-remark" {...form.register("remark")} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-fg">รายการผลิต</h3>
                <p className="text-xs text-fg-muted">
                  เลือก{targetLabel}ที่มี BOM เปิดใช้งานแล้ว
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fields.append({ ...blank })}
              >
                <Plus className="size-4" />
                เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-3">
              {fields.fields.map((field, index) => (
                <fieldset
                  key={field.id}
                  className="rounded-lg border border-border p-4"
                >
                  <legend className="px-2 text-sm font-medium text-fg">
                    รายการที่ {index + 1}
                  </legend>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(120px,.5fr)_minmax(160px,.7fr)_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`plan-target-${index}`}>{targetLabel} *</Label>
                      {targetOptions.length === 0 ? (
                        <MasterDataEmptyLink href={targetType === 'material' ? '/engineering/bom/materials' : '/engineering/bom/products'} resourceLabel={`${targetLabel}ที่มี BOM เปิดใช้งาน`} />
                      ) : (
                        <Controller
                          control={form.control}
                          name={`lines.${index}.targetId`}
                          render={({ field: input }) => (
                            <SearchableFilterSelect
                              id={`plan-target-${index}`}
                              label={targetLabel}
                              value={input.value} onChange={input.onChange}
                              onBlur={input.onBlur} triggerRef={input.ref}
                              disabled={form.formState.isSubmitting}
                              invalid={!!form.formState.errors.lines?.[index]?.targetId}
                              placeholder={`เลือก${targetLabel}`}
                              allLabel={`เลือก${targetLabel}`}
                              searchPlaceholder="ค้นหารหัสหรือชื่อ..."
                              options={targetOptions}
                            />
                          )}
                        />
                      )}
                      {form.formState.errors.lines?.[index]?.targetId && (
                        <p className="text-xs text-danger">
                          {
                            form.formState.errors.lines[index]?.targetId
                              ?.message
                          }
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`plan-qty-${index}`}>จำนวนผลิต</Label>
                      <Input
                        id={`plan-qty-${index}`}
                        type="number"
                        min="1"
                        step="1"
                        {...form.register(`lines.${index}.quantity`)}
                        aria-invalid={
                          !!form.formState.errors.lines?.[index]?.quantity
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`plan-date-${index}`}>
                        วันที่ต้องการใช้
                      </Label>
                      <Input
                        id={`plan-date-${index}`}
                        type="date"
                        {...form.register(`lines.${index}.needByDate`)}
                        aria-invalid={
                          !!form.formState.errors.lines?.[index]?.needByDate
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-end text-danger"
                      disabled={fields.fields.length === 1}
                      onClick={() => fields.remove(index)}
                      aria-label={`ลบรายการที่ ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor={`plan-line-remark-${index}`}>
                      หมายเหตุรายการ
                    </Label>
                    <Textarea
                      id={`plan-line-remark-${index}`}
                      rows={2}
                      {...form.register(`lines.${index}.remark`)}
                    />
                  </div>
                </fieldset>
              ))}
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "กำลังบันทึก..." : "บันทึกร่าง"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
