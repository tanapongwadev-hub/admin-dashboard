"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert, ImagePlus, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  createMaterialPcAction,
  updateMaterialPcAction,
  uploadMaterialPcImageAction,
} from "@/app/(dashboard)/materials/pc/actions";
import type { Material, MaterialLookups, MaterialShape } from "@/lib/api/materials";
import { cn } from "@/lib/utils";

const NONE = "__none__";
const shapes: MaterialShape[] = ["PCS", "PIPE", "SHEET", "COIL"];
const MATERIAL_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const MATERIAL_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateMaterialImage(
  file: Pick<File, "type" | "size"> | null,
  required = true
): string | null {
  if (!file) return required ? "กรุณาเลือกรูปภาพวัสดุ" : null;
  if (!MATERIAL_IMAGE_TYPES.has(file.type)) {
    return "รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP";
  }
  if (file.size > MATERIAL_IMAGE_MAX_SIZE) {
    return "รูปภาพต้องมีขนาดไม่เกิน 5 MiB";
  }
  return null;
}

export function materialImageUpdateFields(imagePath?: string): { imagePath?: string } {
  return imagePath ? { imagePath } : {};
}

export function MaterialImagePicker({
  file,
  previewUrl,
  error,
  required = true,
  hasExistingImage = false,
  inputRef,
  onChange,
}: {
  file: Pick<File, "name" | "size"> | null;
  previewUrl: string | null;
  error: string | null;
  required?: boolean;
  hasExistingImage?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor="material-image">
          รูปภาพวัสดุ {required && <span className="text-danger">*</span>}
        </Label>
        <span className="text-xs text-fg-muted">{required ? "จำเป็น" : "ไม่บังคับ"}</span>
      </div>

      <Input
        ref={inputRef}
        id="material-image"
        name="materialImage"
        type="file"
        required={required}
        accept="image/jpeg,image/png,image/webp"
        aria-describedby="material-image-hint material-image-error"
        aria-invalid={error ? true : undefined}
        onChange={onChange}
        className="peer sr-only"
      />

      <label
        htmlFor="material-image"
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
              alt={hasExistingImage && !file ? "รูปภาพวัสดุปัจจุบัน" : "ตัวอย่างรูปภาพวัสดุที่เลือก"}
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
              <span className="mt-0.5 block text-xs text-fg-muted">
                {(file.size / 1024 / 1024).toFixed(2)} MiB
              </span>
            </span>
          ) : hasExistingImage ? (
            <span className="text-sm leading-5 text-fg-secondary">
              หากไม่เลือก รูปปัจจุบันจะยังคงอยู่
            </span>
          ) : (
            <span className="text-sm leading-5 text-fg-secondary">
              คลิกบริเวณนี้เพื่อเลือกรูปวัสดุจากอุปกรณ์
            </span>
          )}
          <span id="material-image-hint" className="text-xs text-fg-muted">
            JPEG, PNG หรือ WebP · สูงสุด 5 MiB
          </span>
          <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-fg shadow-sm transition-colors group-hover:bg-primary-hover">
            {file || hasExistingImage ? "เลือกรูปใหม่" : "เลือกไฟล์"}
          </span>
        </span>
      </label>

      <p
        id="material-image-error"
        className="flex min-h-5 items-center gap-1.5 text-xs text-danger"
        aria-live="polite"
      >
        {error && <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
        {error}
      </p>
    </div>
  );
}

const schema = z
  .object({
    code: z.string().min(1, "กรุณากรอกรหัส").max(50),
    name: z.string().min(1, "กรุณากรอกชื่อ").max(255),
    materialType: z.enum(["PCS", "PIPE", "SHEET", "COIL"]),
    ratio: z.coerce.number().int().min(1).optional().or(z.literal("")),
    unitId: z.string().min(1, "กรุณาเลือกหน่วย"),
    packingQuantity: z.coerce.number().int().min(1).optional().or(z.literal("")),
    deliveryTypeId: z.string(),
    modelId: z.string(),
    loadingPointId: z.string(),
    processLineName: z.string().max(255).optional(),
    scale: z.string().max(255).optional(),
    specification: z.string().optional(),
    description: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.materialType !== "PCS" && !values.ratio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ratio"],
        message: "ต้องระบุอัตราส่วนสำหรับวัสดุประเภท PIPE, SHEET และ COIL",
      });
    }
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toDefaultValues(material?: Material | null): FormInput {
  return {
    code: material?.code ?? "",
    name: material?.name ?? "",
    materialType: material?.materialType ?? "PCS",
    ratio: material?.ratio ?? "",
    unitId: material?.unitId ?? "",
    packingQuantity: material?.packingQuantity ?? "",
    deliveryTypeId: material?.deliveryTypeId ?? NONE,
    modelId: material?.modelId ?? NONE,
    loadingPointId: material?.loadingPointId ?? NONE,
    processLineName: material?.processLineName ?? "",
    scale: material?.scale ?? "",
    specification: material?.specification ?? "",
    description: material?.description ?? "",
  };
}

export function MaterialPcFormDialog({
  open,
  onOpenChange,
  material,
  lookups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  lookups: MaterialLookups;
  onSaved: () => void;
}) {
  const isEdit = !!material;
  const [supplierIds, setSupplierIds] = React.useState<string[]>([]);
  const [addSupplierId, setAddSupplierId] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const imageRequired = !material?.imagePath;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(material),
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(material));
      setSupplierIds(material?.suppliers.map((s) => s.id) ?? []);
      setAddSupplierId("");
      setImageFile(null);
      setImageError(null);
      setImagePreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return material?.imagePath ?? null;
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [open, material, reset]);

  React.useEffect(
    () => () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );

  const materialType = watch("materialType");
  const availableSuppliers = lookups.suppliers.filter((s) => !supplierIds.includes(s.id));
  const selectedSuppliers = supplierIds
    .map((id) => lookups.suppliers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  async function onSubmit(input: FormInput) {
    if (imageRequired) {
      const validationMessage = validateMaterialImage(imageFile, true);
      if (validationMessage) {
        setImageError(validationMessage);
        imageInputRef.current?.focus();
        return;
      }
    }

    const values: FormValues = schema.parse(input);
    const payload = {
      code: values.code,
      name: values.name,
      materialType: values.materialType,
      ratio: values.materialType === "PCS" ? null : Number(values.ratio),
      unitId: values.unitId,
      packingQuantity: values.packingQuantity === "" ? null : Number(values.packingQuantity),
      deliveryTypeId: values.deliveryTypeId === NONE ? null : values.deliveryTypeId,
      modelId: values.modelId === NONE ? null : values.modelId,
      loadingPointId: values.loadingPointId === NONE ? null : values.loadingPointId,
      processLineName: values.processLineName || null,
      scale: values.scale || null,
      specification: values.specification || null,
      description: values.description || null,
      supplierIds,
    };

    let imagePath: string | undefined;
    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.set("file", imageFile);
      const uploadResult = await uploadMaterialPcImageAction(imageFormData);
      if (uploadResult.status === "error") {
        setImageError(uploadResult.message);
        toast.error(uploadResult.message);
        return;
      }
      imagePath = uploadResult.image.imagePath;
    }

    const result = isEdit
      ? await updateMaterialPcAction(material!.id, {
          ...payload,
          ...materialImageUpdateFields(imagePath),
          updatedAt: material!.updatedAt,
        })
      : await createMaterialPcAction({ ...payload, imagePath });

    if (result.status === "success") {
      toast.success(isEdit ? "อัปเดตวัสดุแล้ว" : "สร้างวัสดุแล้ว", {
        description: `บันทึก ${result.material.name} เรียบร้อยแล้ว`,
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
            <DialogTitle>{isEdit ? "แก้ไขวัสดุ PC" : "เพิ่มวัสดุ PC"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลวัสดุประเภทชิ้นส่วนจัดซื้อนี้" : "เพิ่มวัสดุประเภทชิ้นส่วนจัดซื้อใหม่"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <MaterialImagePicker
                file={imageFile}
                previewUrl={imagePreview}
                error={imageError}
                required={imageRequired}
                hasExistingImage={isEdit && !!material?.imagePath && !imageFile}
                inputRef={imageInputRef}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  const validationMessage = validateMaterialImage(file, imageRequired);
                  setImageError(validationMessage);
                  if (validationMessage || !file) {
                    setImageFile(null);
                    setImagePreview((current) => {
                      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                      return material?.imagePath ?? null;
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
                <Input id="code" placeholder="MAT-0231" {...register("code")} />
                {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">ชื่อ</Label>
                <Input id="name" placeholder="Hex Bolt M8x40" {...register("name")} />
                {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>รูปทรง</Label>
                <Select value={materialType} onValueChange={(v) => setValue("materialType", v as MaterialShape)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shapes.map((shape) => (
                      <SelectItem key={shape} value={shape}>{shape}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ratio">
                  อัตราส่วน {materialType !== "PCS" && <span className="text-danger">*</span>}
                </Label>
                <Input id="ratio" type="number" min="1" disabled={materialType === "PCS"} {...register("ratio")} />
                {errors.ratio && <p className="text-xs text-danger">{errors.ratio.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>หน่วย</Label>
                <Select value={watch("unitId")} onValueChange={(v) => setValue("unitId", v)}>
                  <SelectTrigger><SelectValue placeholder="เลือกหน่วย" /></SelectTrigger>
                  <SelectContent>
                    {lookups.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.nameEn ?? unit.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId && <p className="text-xs text-danger">{errors.unitId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="packingQuantity">จำนวนต่อแพ็ก</Label>
                <Input id="packingQuantity" type="number" min="1" {...register("packingQuantity")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>ประเภทการจัดส่ง</Label>
                <Select value={watch("deliveryTypeId")} onValueChange={(v) => setValue("deliveryTypeId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    {lookups.deliveryTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>รุ่น</Label>
                <Select value={watch("modelId")} onValueChange={(v) => setValue("modelId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    {lookups.models.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>จุดขึ้นสินค้า</Label>
                <Select value={watch("loadingPointId")} onValueChange={(v) => setValue("loadingPointId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                    {lookups.loadingPoints.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="processLineName">สายการผลิต</Label>
                <Input id="processLineName" placeholder="Cutting Line 1" {...register("processLineName")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scale">มาตราส่วน</Label>
                <Input id="scale" placeholder="1:4" {...register("scale")} />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label>ซัพพลายเออร์</Label>
              <div className="flex gap-2">
                <Select value={addSupplierId} onValueChange={setAddSupplierId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="เพิ่มซัพพลายเออร์..." /></SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nameEn ?? s.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!addSupplierId}
                  onClick={() => {
                    if (addSupplierId) {
                      setSupplierIds((prev) => [...prev, addSupplierId]);
                      setAddSupplierId("");
                    }
                  }}
                >
                  เพิ่ม
                </Button>
              </div>
              {selectedSuppliers.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedSuppliers.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs text-fg-secondary"
                    >
                      {s.nameEn ?? s.code}
                      <button
                        type="button"
                        aria-label={`ลบ ${s.nameEn ?? s.code}`}
                        onClick={() => setSupplierIds((prev) => prev.filter((id) => id !== s.id))}
                        className="text-fg-muted hover:text-danger"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="specification">ข้อมูลจำเพาะ</Label>
                <Textarea id="specification" rows={3} {...register("specification")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea id="description" rows={3} {...register("description")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มวัสดุ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
