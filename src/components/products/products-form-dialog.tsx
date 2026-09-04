"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createProductAction, updateProductAction } from "@/app/(dashboard)/products/actions";
import type { Product, ProductLookups } from "@/lib/api/products";

const schema = z.object({
  code: z.string().min(1, "กรุณากรอกรหัส").max(50),
  name: z.string().min(1, "กรุณากรอกชื่อ").max(255),
  unitId: z.string().min(1, "กรุณาเลือกหน่วย"),
  modelId: z.string().min(1, "กรุณาเลือกรุ่น"),
  customerId: z.string().min(1, "กรุณาเลือกลูกค้า"),
  locationId: z.string().min(1, "กรุณาเลือกสถานที่"),
  productTypeId: z.string().min(1, "กรุณาเลือกประเภทสินค้า"),
  deliveryTypeId: z.string().min(1, "กรุณาเลือกประเภทการจัดส่ง"),
  loadingPointId: z.string().min(1, "กรุณาเลือกจุดขึ้นสินค้า"),
  processLineId: z.string().min(1, "กรุณาเลือกสายการผลิต"),
  packing: z.coerce.number().int().min(1).optional().or(z.literal("")),
  lotSize: z.coerce.number().int().min(1).optional().or(z.literal("")),
  safetyStock: z.coerce.number().int().min(0).optional().or(z.literal("")),
  minStock: z.coerce.number().int().min(0).optional().or(z.literal("")),
  scale: z.string().max(50).optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(product?: Product | null): FormInput {
  return {
    code: product?.code ?? "",
    name: product?.name ?? "",
    unitId: product?.unitId ?? "",
    modelId: product?.modelId ?? "",
    customerId: product?.customerId ?? "",
    locationId: product?.locationId ?? "",
    productTypeId: product?.productTypeId ?? "",
    deliveryTypeId: product?.deliveryTypeId ?? "",
    loadingPointId: product?.loadingPointId ?? "",
    processLineId: product?.processLineId ?? "",
    packing: product?.packing ?? "",
    lotSize: product?.lotSize ?? "",
    safetyStock: product?.safetyStock ?? "",
    minStock: product?.minStock ?? "",
    scale: product?.scale ?? "",
  };
}

export function ProductsFormDialog({
  open,
  onOpenChange,
  product,
  lookups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  lookups: ProductLookups;
  onSaved: () => void;
}) {
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(product),
  });

  React.useEffect(() => {
    if (open) reset(toDefaultValues(product));
  }, [open, product, reset]);

  async function onSubmit(input: FormInput) {
    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code,
      name: values.name,
      unitId: values.unitId,
      modelId: values.modelId,
      customerId: values.customerId,
      locationId: values.locationId,
      productTypeId: values.productTypeId,
      deliveryTypeId: values.deliveryTypeId,
      loadingPointId: values.loadingPointId,
      processLineId: values.processLineId,
      packing: values.packing === "" ? undefined : Number(values.packing),
      lotSize: values.lotSize === "" ? undefined : Number(values.lotSize),
      safetyStock: values.safetyStock === "" ? null : Number(values.safetyStock),
      minStock: values.minStock === "" ? null : Number(values.minStock),
      scale: values.scale || null,
    };

    const result = isEdit
      ? await updateProductAction(product!.id, { ...payload, updatedAt: product!.updatedAt })
      : await createProductAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตสินค้าแล้ว" : "สร้างสินค้าแล้ว", {
        description: `บันทึก ${result.product.name} เรียบร้อยแล้ว`,
      });
      onOpenChange(false);
      onSaved();
      return;
    }
    toast.error(result.message);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขสินค้า" : "เพิ่มสินค้า"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลสินค้านี้" : "เพิ่มสินค้าใหม่เข้าสู่แคตตาล็อก"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">รหัส</Label>
                <Input id="code" placeholder="PRD-0231" {...register("code")} />
                {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">ชื่อสินค้า</Label>
                <Input id="name" placeholder="Rear Seat Frame Assembly" {...register("name")} />
                {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>หน่วย</Label>
                <Select value={watch("unitId")} onValueChange={(v) => setValue("unitId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกหน่วย" /></SelectTrigger>
                  <SelectContent>
                    {lookups.units.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId && <p className="text-xs text-danger">{errors.unitId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>รุ่น</Label>
                <Select value={watch("modelId")} onValueChange={(v) => setValue("modelId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกรุ่น" /></SelectTrigger>
                  <SelectContent>
                    {lookups.productModels.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.modelId && <p className="text-xs text-danger">{errors.modelId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>ลูกค้า</Label>
                <Select value={watch("customerId")} onValueChange={(v) => setValue("customerId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกลูกค้า" /></SelectTrigger>
                  <SelectContent>
                    {lookups.customers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && <p className="text-xs text-danger">{errors.customerId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>สถานที่</Label>
                <Select value={watch("locationId")} onValueChange={(v) => setValue("locationId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกสถานที่" /></SelectTrigger>
                  <SelectContent>
                    {lookups.locations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.locationId && <p className="text-xs text-danger">{errors.locationId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>ประเภทสินค้า</Label>
                <Select value={watch("productTypeId")} onValueChange={(v) => setValue("productTypeId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกประเภทสินค้า" /></SelectTrigger>
                  <SelectContent>
                    {lookups.productTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.productTypeId && <p className="text-xs text-danger">{errors.productTypeId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>ประเภทการจัดส่ง</Label>
                <Select value={watch("deliveryTypeId")} onValueChange={(v) => setValue("deliveryTypeId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกประเภทการจัดส่ง" /></SelectTrigger>
                  <SelectContent>
                    {lookups.deliveryTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.deliveryTypeId && <p className="text-xs text-danger">{errors.deliveryTypeId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>จุดขึ้นสินค้า</Label>
                <Select value={watch("loadingPointId")} onValueChange={(v) => setValue("loadingPointId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกจุดขึ้นสินค้า" /></SelectTrigger>
                  <SelectContent>
                    {lookups.loadingPoints.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.loadingPointId && <p className="text-xs text-danger">{errors.loadingPointId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>สายการผลิต</Label>
                <Select value={watch("processLineId")} onValueChange={(v) => setValue("processLineId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกสายการผลิต" /></SelectTrigger>
                  <SelectContent>
                    {lookups.processLines.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.processLineId && <p className="text-xs text-danger">{errors.processLineId.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="packing">จำนวนต่อแพ็ก</Label>
                <Input id="packing" type="number" min="1" placeholder="1" {...register("packing")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lotSize">ขนาดล็อต</Label>
                <Input id="lotSize" type="number" min="1" placeholder="1" {...register("lotSize")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="safetyStock">สต็อกปลอดภัย</Label>
                <Input id="safetyStock" type="number" min="0" placeholder="อัตโนมัติจากขนาดล็อต" {...register("safetyStock")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minStock">สต็อกขั้นต่ำ</Label>
                <Input id="minStock" type="number" min="0" placeholder="อัตโนมัติจากจำนวนต่อแพ็ก" {...register("minStock")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scale">มาตราส่วน</Label>
                <Input id="scale" placeholder="1:4" {...register("scale")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มสินค้า"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
