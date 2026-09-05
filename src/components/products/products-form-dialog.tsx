"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert, ImagePlus } from "lucide-react";
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
import {
  createProductAction,
  updateProductAction,
  uploadProductImageAction,
} from "@/app/(dashboard)/products/actions";
import type { Product, ProductLookups } from "@/lib/api/products";
import { cn } from "@/lib/utils";

const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Unlike Materials PC's imagePath (required on create — a business decision
// specific to that resource), cps-api's CreateProductDto/UpdateProductDto
// both declare productImagePath optional (confirmed by reading the DTOs
// directly), so this picker is always optional — no `required` prop to
// thread through, just a plain nullable validation.
export function validateProductImage(file: Pick<File, "type" | "size"> | null): string | null {
  if (!file) return null;
  if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
    return "รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP";
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
    return "รูปภาพต้องมีขนาดไม่เกิน 5 MiB";
  }
  return null;
}

// Same "dashed selection card" pattern as Materials PC's MaterialImagePicker
// (see material-pc-form-dialog.tsx) — visually hidden native file input,
// clickable label, preview/content split on sm+. Kept as its own local copy
// rather than a shared component, per this project's established "hand-write
// each resource's own form pieces" convention (see AGENTS.md § Materials PC
// "Not (yet) applied to Products/Users/Orders").
function ProductImagePicker({
  file,
  previewUrl,
  error,
  hasExistingImage = false,
  inputRef,
  onChange,
}: {
  file: Pick<File, "name" | "size"> | null;
  previewUrl: string | null;
  error: string | null;
  hasExistingImage?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor="product-image">รูปภาพสินค้า</Label>
        <span className="text-xs text-fg-muted">ไม่บังคับ</span>
      </div>

      <Input
        ref={inputRef}
        id="product-image"
        name="productImage"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-describedby="product-image-hint product-image-error"
        aria-invalid={error ? true : undefined}
        onChange={onChange}
        className="peer sr-only"
      />

      <label
        htmlFor="product-image"
        className={cn(
          "group grid min-h-44 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed bg-surface transition-colors",
          "sm:grid-cols-[12rem_1fr]",
          "hover:border-primary/60 hover:bg-primary-soft/30",
          "peer-focus-visible:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40",
          error ? "border-danger bg-danger-soft/30" : "border-border-strong"
        )}
      >
        <span className="relative flex min-h-36 items-center justify-center overflow-hidden border-b border-border bg-surface-2 sm:min-h-full sm:border-r sm:border-b-0">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={hasExistingImage && !file ? "รูปภาพสินค้าปัจจุบัน" : "ตัวอย่างรูปภาพสินค้าที่เลือก"}
              fill
              unoptimized
              sizes="(min-width: 640px) 192px, 100vw"
              className="object-contain p-2"
            />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform group-hover:scale-105">
              <ImagePlus className="size-7" aria-hidden="true" />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-col items-start justify-center gap-2.5 p-5">
          <span className="text-sm font-semibold text-fg">
            {file ? "เปลี่ยนรูปภาพ" : hasExistingImage ? "รูปภาพปัจจุบัน" : "เลือกรูปภาพ"}
          </span>
          {file ? (
            <span className="w-full min-w-0">
              <span className="block truncate text-sm text-fg-secondary">{file.name}</span>
              <span className="mt-0.5 block text-xs text-fg-muted">{(file.size / 1024 / 1024).toFixed(2)} MiB</span>
            </span>
          ) : hasExistingImage ? (
            <span className="text-sm leading-5 text-fg-secondary">หากไม่เลือก รูปปัจจุบันจะยังคงอยู่</span>
          ) : (
            <span className="text-sm leading-5 text-fg-secondary">คลิกบริเวณนี้เพื่อเลือกรูปสินค้าจากอุปกรณ์ (ไม่บังคับ)</span>
          )}
          <span id="product-image-hint" className="text-xs text-fg-muted">
            JPEG, PNG หรือ WebP · สูงสุด 5 MiB
          </span>
          <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-fg shadow-sm transition-colors group-hover:bg-primary-hover">
            {file || hasExistingImage ? "เลือกรูปใหม่" : "เลือกไฟล์"}
          </span>
        </span>
      </label>

      <p id="product-image-error" className="flex min-h-5 items-center gap-1.5 text-xs text-danger" aria-live="polite">
        {error && <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
        {error}
      </p>
    </div>
  );
}

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
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

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
    if (open) {
      reset(toDefaultValues(product));
      setImageFile(null);
      setImageError(null);
      setImagePreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return product?.productImagePath ?? null;
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [open, product, reset]);

  React.useEffect(
    () => () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );

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

    let productImagePath: string | undefined;
    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.set("file", imageFile);
      const uploadResult = await uploadProductImageAction(imageFormData);
      if (uploadResult.status === "error") {
        setImageError(uploadResult.message);
        toast.error(uploadResult.message);
        return;
      }
      productImagePath = uploadResult.image.imagePath;
    }

    const result = isEdit
      ? await updateProductAction(product!.id, {
          ...payload,
          // Omit entirely (not `null`) unless a replacement was actually
          // staged, so an edit with no new file leaves the existing image
          // untouched — same distinction Materials PC's materialImageUpdateFields
          // makes, just inlined here since Products only has the one field.
          ...(productImagePath ? { productImagePath } : {}),
          updatedAt: product!.updatedAt,
        })
      : await createProductAction({ ...payload, productImagePath });

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
            <div className="mb-5">
              <ProductImagePicker
                file={imageFile}
                previewUrl={imagePreview}
                error={imageError}
                hasExistingImage={isEdit && !!product?.productImagePath && !imageFile}
                inputRef={imageInputRef}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  const validationMessage = validateProductImage(file);
                  setImageError(validationMessage);
                  if (validationMessage || !file) {
                    setImageFile(null);
                    setImagePreview((current) => {
                      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                      return product?.productImagePath ?? null;
                    });
                    event.currentTarget.value = "";
                    return;
                  }
                  setImageFile(file);
                  setImagePreview((current) => {
                    if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                    return URL.createObjectURL(file);
                  });
                }}
              />
            </div>
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
