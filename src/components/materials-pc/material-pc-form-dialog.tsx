"use client";

import * as React from "react";
import Image from "next/image";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ImagePlus, Loader2, Save, Scissors, X } from "lucide-react";
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
import { MasterDataEmptyLink } from "@/components/ui/master-data-empty-link";
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
  checkMaterialCodeAction,
  saveMaterialDraftAction,
} from "@/app/(dashboard)/materials/catalog/actions";
import type { Material, MaterialDraftRecord, MaterialLookups, MaterialShape } from "@/lib/api/materials";
import { cn } from "@/lib/utils";
import { useMaterialCodeAvailability, type MaterialCodeAvailability } from "@/hooks/use-material-code-availability";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

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
  id = "material-image",
  label = "รูปภาพวัสดุ",
  inputRef,
  onChange,
}: {
  file: Pick<File, "name" | "size"> | null;
  previewUrl: string | null;
  error: string | null;
  required?: boolean;
  hasExistingImage?: boolean;
  id?: string;
  label?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label} {required && <span className="text-danger">*</span>}
        </Label>
        <span className="text-xs text-fg-muted">{required ? "จำเป็น" : "ไม่บังคับ"}</span>
      </div>

      <Input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        required={required}
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={`${id}-hint ${id}-error`}
        aria-invalid={error ? true : undefined}
        onChange={onChange}
        className="peer sr-only"
      />

      <label
        htmlFor={id}
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
          <span id={`${id}-hint`} className="text-xs text-fg-muted">
            JPEG, PNG หรือ WebP · สูงสุด 5 MiB
          </span>
          <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-fg shadow-sm transition-colors group-hover:bg-primary-hover">
            {file || hasExistingImage ? "เลือกรูปใหม่" : "เลือกไฟล์"}
          </span>
        </span>
      </label>

      <p
        id={`${id}-error`}
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
    code: z.string().trim().min(1, "กรุณากรอกรหัส").max(50),
    name: z.string().min(1, "กรุณากรอกชื่อ").max(255),
    materialType: z.enum(["", "PCS", "PIPE", "SHEET", "COIL"]),
    locationType: z.enum(["internal", "external"]),
    outputLocationType: z.enum(["internal", "external"]),
    ratio: z.union([z.string(), z.number()]).optional(),
    unitId: z.string().min(1, "กรุณาเลือกหน่วย"),
    packingQuantity: z.union([z.string(), z.number()]).optional(),
    minimumStock: z.coerce.number().min(0, "สต็อกขั้นต่ำต้องไม่น้อยกว่า 0"),
    deliveryTypeId: z.string(),
    materialTypeId: z.string(),
    modelId: z.string(),
    loadingPointId: z.string(),
    processLineName: z.string().max(255).optional(),
    scale: z.string().max(255).optional(),
    specification: z.string().optional(),
    description: z.string().optional(),
    outputCode: z.string(),
    outputName: z.string(),
    outputUnitId: z.string(),
    outputModelId: z.string(),
    outputLoadingPointId: z.string(),
    outputProcessLineName: z.string().max(255, "สายการผลิตต้องไม่เกิน 255 ตัวอักษร"),
    outputScale: z.string().max(255, "มาตราส่วนต้องไม่เกิน 255 ตัวอักษร"),
    outputSpecification: z.string(),
    outputPackingQuantity: z.union([z.string(), z.number()]).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.materialType === "") {
      ctx.addIssue({ code: "custom", path: ["materialType"], message: "กรุณาเลือกชนิดเหล็กก่อนกรอกข้อมูลวัสดุ" });
      return;
    }
    const ratio = Number(values.ratio);
    if (values.materialType !== "PCS" && (!Number.isInteger(ratio) || ratio < 1 || ratio > 1000000)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ratio"],
        message: "กรอกจำนวนที่ตัดได้เป็นจำนวนเต็ม 1–1,000,000 ชิ้น",
      });
    }
    if (values.materialType !== "PCS") {
      for (const [field, message] of [
        ["outputCode", "กรุณากรอกรหัสวัสดุหลังแปรรูป"],
        ["outputName", "กรุณากรอกชื่อวัสดุหลังแปรรูป"],
        ["outputUnitId", "กรุณาเลือกหน่วยวัสดุหลังแปรรูป"],
      ] as const) {
        if (!values[field].trim()) ctx.addIssue({ code: "custom", path: [field], message });
      }
      const packing = Number(values.outputPackingQuantity);
      if (!Number.isInteger(packing) || packing < 1 || packing > 1000000) ctx.addIssue({ code: "custom", path: ["outputPackingQuantity"], message: "กรอกจำนวนชิ้นต่อกล่องเป็นจำนวนเต็ม 1–1,000,000" });
      if (values.outputCode.trim().length > 50) ctx.addIssue({ code: "custom", path: ["outputCode"], message: "รหัสไม่เกิน 50 ตัวอักษร" });
      if (values.outputName.trim().length > 255) ctx.addIssue({ code: "custom", path: ["outputName"], message: "ชื่อไม่เกิน 255 ตัวอักษร" });
      if (values.outputCode.trim().toLowerCase() === values.code.trim().toLowerCase()) {
        ctx.addIssue({ code: "custom", path: ["outputCode"], message: "รหัสหลังแปรรูปต้องต่างจากต้นทาง" });
      }
    } else if (values.packingQuantity !== "" && values.packingQuantity !== undefined) {
      const packing = Number(values.packingQuantity);
      if (!Number.isInteger(packing) || packing < 1) ctx.addIssue({ code: "custom", path: ["packingQuantity"], message: "จำนวนต่อแพ็กต้องเป็นจำนวนเต็มอย่างน้อย 1" });
    }
  });

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;
const SOURCE_FIELDS: (keyof FormInput)[] = ["code", "name", "locationType", "unitId", "packingQuantity", "minimumStock", "deliveryTypeId", "materialTypeId", "modelId", "loadingPointId", "processLineName", "scale", "specification", "description"];
const OUTPUT_FIELDS: (keyof FormInput)[] = ["outputCode", "outputName", "outputLocationType", "outputUnitId", "outputModelId", "outputLoadingPointId", "outputProcessLineName", "outputScale", "ratio", "outputPackingQuantity", "outputSpecification"];

function MaterialCodeFeedback({ id, check }: { id: string; check: MaterialCodeAvailability }) {
  return <p id={id} role="status" aria-live="polite" aria-atomic="true" className={cn("flex min-h-5 items-center gap-1.5 text-xs", check.status === "available" ? "text-success-fg" : check.status === "duplicate" || check.status === "error" ? "text-danger" : "text-fg-muted")}>
    {check.status === "checking" && <><Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />กำลังตรวจรหัส…</>}
    {check.status === "available" && <><Check className="size-3.5" aria-hidden="true" />รหัสนี้ใช้ได้</>}
    {check.status === "duplicate" && <><CircleAlert className="size-3.5" aria-hidden="true" />{check.message ?? "รหัสนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น"}</>}
    {check.status === "error" && <><CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />{check.message ?? "ตรวจรหัสไม่สำเร็จ กรุณาลองอีกครั้ง"}</>}
  </p>;
}

function toDefaultValues(material?: Material | null, draft?: MaterialDraftRecord | null): FormInput {
  return {
    code: material?.code ?? "",
    name: material?.name ?? "",
    materialType: material?.materialType ?? "",
    locationType: material?.locationType ?? "external",
    outputLocationType: material?.processingMaterial?.locationType ?? "external",
    ratio: material?.ratio ?? "",
    unitId: material?.unitId ?? "",
    packingQuantity: material?.packingQuantity ?? "",
    minimumStock: Number(material?.minimumStock ?? 0),
    deliveryTypeId: material?.deliveryTypeId ?? NONE,
    materialTypeId: material?.materialTypeId ?? NONE,
    modelId: material?.modelId ?? NONE,
    loadingPointId: material?.loadingPointId ?? NONE,
    processLineName: material?.processLineName ?? "",
    scale: material?.scale ?? "",
    specification: material?.specification ?? "",
    description: material?.description ?? "",
    outputCode: material?.processingMaterial?.code ?? "",
    outputName: material?.processingMaterial?.name ?? "",
    outputUnitId: material?.processingMaterial?.unitId ?? "",
    outputModelId: material?.processingMaterial?.modelId ?? NONE,
    outputLoadingPointId: material?.processingMaterial?.loadingPointId ?? NONE,
    outputProcessLineName: material?.processingMaterial?.processLineName ?? "",
    outputScale: material?.processingMaterial?.scale ?? "",
    outputSpecification: material?.processingMaterial?.specification ?? "",
    outputPackingQuantity: material?.processingMaterial?.packingQuantity ?? "",
    ...draft?.data,
  };
}

export function MaterialPcFormDialog({
  open,
  onOpenChange,
  material,
  draft,
  lookups,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  draft?: MaterialDraftRecord | null;
  lookups: MaterialLookups;
  onSaved: () => void;
}) {
  const isEdit = !!material;
  const [step, setStep] = React.useState(() => draft?.data.materialType ? Math.min(draft.step, draft.data.materialType === "PCS" ? 1 : 2) : 0);
  const [advancing, setAdvancing] = React.useState(false);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const stepHeadingRef = React.useRef<HTMLHeadingElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [supplierIds, setSupplierIds] = React.useState<string[]>([]);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const imageRequired = !material?.imagePath && !draft?.imagePath;
  const draftOutputImagePath = typeof draft?.data.outputImagePath === "string" ? draft.data.outputImagePath : null;
  const [outputImageFile, setOutputImageFile] = React.useState<File | null>(null);
  const [outputImagePreview, setOutputImagePreview] = React.useState<string | null>(draftOutputImagePath ?? material?.processingMaterial?.imagePath ?? null);
  const [outputImageError, setOutputImageError] = React.useState<string | null>(null);
  const outputImageInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    getFieldState,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(material, draft),
    // Validate on every change, not just on submit — without this, an error
    // shown after a failed submit only clears once react-hook-form's default
    // reValidateMode kicks in, which itself only activates after
    // `isSubmitted`. mode: "onChange" makes an error disappear the instant a
    // field becomes valid, even before the user has attempted to submit at
    // all — consistent with every form dialog in this app (see AGENTS.md).
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(material, draft));
      setSupplierIds(draft?.supplierIds ?? material?.suppliers.map((s) => s.id) ?? []);
      setImageFile(null);
      setImageError(null);
      setImagePreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return draft?.imagePath ?? material?.imagePath ?? null;
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
      setOutputImageFile(null);
      setOutputImageError(null);
      setOutputImagePreview((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return draftOutputImagePath ?? material?.processingMaterial?.imagePath ?? null;
      });
      if (outputImageInputRef.current) outputImageInputRef.current.value = "";
    }
  }, [open, material, draft, draftOutputImagePath, reset]);

  React.useEffect(
    () => () => {
      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview]
  );

  React.useEffect(
    () => () => {
      if (outputImagePreview?.startsWith("blob:")) URL.revokeObjectURL(outputImagePreview);
    },
    [outputImagePreview]
  );

  const materialType = watch("materialType");
  const hasMaterialType = materialType !== "";
  const isRawMaterial = hasMaterialType && materialType !== "PCS";
  const sourceCode = watch("code");
  const outputCode = watch("outputCode");
  const sameCode = isRawMaterial && sourceCode.trim() !== "" && sourceCode.trim().toLowerCase() === outputCode.trim().toLowerCase();
  const sourceCodeCheck = useMaterialCodeAvailability(sourceCode, material?.id, hasMaterialType && step > 0);
  const outputAvailability = useMaterialCodeAvailability(outputCode, material?.processingMaterial?.id, isRawMaterial && step === 2 && !sameCode);
  const outputCodeCheck: MaterialCodeAvailability = sameCode ? { status: "duplicate", message: "รหัสหลังแปรรูปต้องต่างจากต้นทาง" } : outputAvailability;
  const steps = isRawMaterial ? ["ชนิดเหล็ก", "Material ก่อนแปรรูป", "Material หลังแปรรูป"] : ["ชนิดเหล็ก", "ข้อมูล Material"];
  const lastStep = steps.length - 1;
  const busy = isSubmitting || advancing || savingDraft;
  const availableSuppliers = lookups.suppliers.filter((s) => !supplierIds.includes(s.id));
  const selectedSuppliers = supplierIds
    .map((id) => lookups.suppliers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  function goToStep(next: number, field?: string) {
    setStep(next);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
      const control = field ? document.getElementById(field) : null;
      (control ?? stepHeadingRef.current)?.focus();
    });
  }

  function validateSourceImage() {
    if (imageRequired) {
      const validationMessage = validateMaterialImage(imageFile, true);
      if (validationMessage) {
        setImageError(validationMessage);
        return false;
      }
    }
    return true;
  }

  async function validateCodes(fields: ("code" | "outputCode")[], values: FormInput = getValues()) {
    const responses = await Promise.all(fields.map(async (field) => {
      try {
        return await checkMaterialCodeAction(values[field], field === "code" ? material?.id : material?.processingMaterial?.id);
      } catch {
        return { status: "error" as const, message: CONNECTION_ERROR_MESSAGE };
      }
    }));
    let invalidField: "code" | "outputCode" | undefined;
    fields.forEach((field, index) => {
      const response = responses[index];
      if (getValues(field).trim().toLowerCase() !== values[field].trim().toLowerCase()) {
        setError(field, { type: "codeAvailability", message: "รหัสเปลี่ยนระหว่างตรวจ กรุณาลองอีกครั้ง" });
        invalidField ??= field;
      } else if (response.status === "error" || !response.available) {
        setError(field, { type: "codeAvailability", message: response.status === "error" ? response.message : "รหัสนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น" });
        invalidField ??= field;
      } else if (getFieldState(field).error?.type === "codeAvailability") {
        clearErrors(field);
      }
    });
    return invalidField;
  }

  async function nextStep() {
    if (busy) return;
    setAdvancing(true);
    try {
      if (step === 0) {
        if (await trigger("materialType", { shouldFocus: true })) goToStep(1);
        else goToStep(0, "materialType");
      } else if (step === 1) {
        const fieldsValid = await trigger(SOURCE_FIELDS, { shouldFocus: true });
        const imageValid = validateSourceImage();
        const invalidCode = fieldsValid ? await validateCodes(["code"]) : undefined;
        if (!imageValid) imageInputRef.current?.focus();
        if (invalidCode) goToStep(1, invalidCode);
        else if (fieldsValid && imageValid) goToStep(2);
        else if (imageValid) goToStep(1, SOURCE_FIELDS.find((field) => getFieldState(field).invalid));
      }
    } finally {
      setAdvancing(false);
    }
  }

  function onInvalid(fieldErrors: FieldErrors<FormInput>) {
    if (fieldErrors.materialType) { goToStep(0, "materialType"); return; }
    const sourceField = SOURCE_FIELDS.find((field) => fieldErrors[field]);
    const outputField = OUTPUT_FIELDS.find((field) => fieldErrors[field]);
    goToStep(sourceField ? 1 : isRawMaterial ? 2 : 1, sourceField ?? outputField);
  }

  async function saveDraft() {
    if (busy) return;
    setSavingDraft(true);
    const data = getValues();
    try {
      let imagePath = draft?.imagePath ?? null;
      if (imageFile) {
        const body = new FormData(); body.set("file", imageFile);
        const upload = await uploadMaterialPcImageAction(body);
        if (upload.status === "error") { toast.error(upload.message); return; }
        imagePath = upload.image.imagePath;
      }
      let outputImagePath = draftOutputImagePath;
      if (outputImageFile) {
        const body = new FormData(); body.set("file", outputImageFile);
        const upload = await uploadMaterialPcImageAction(body);
        if (upload.status === "error") { toast.error(upload.message); return; }
        outputImagePath = upload.image.imagePath;
      }
      const result = await saveMaterialDraftAction({ id: draft?.id, updatedAt: draft?.updatedAt,
        materialId: material?.id ?? null, materialUpdatedAt: material?.updatedAt ?? null,
        outputUpdatedAt: material?.processingMaterial?.updatedAt ?? null,
        step, data, supplierIds, imagePath, outputImagePath });
      if (result.status === "error") { toast.error(result.message); return; }
      toast.success("บันทึกร่างแล้ว", { description: "เปิดทำต่อได้จากปุ่ม ร่างของฉัน" });
      onOpenChange(false);
    } catch { toast.error(CONNECTION_ERROR_MESSAGE); }
    finally { setSavingDraft(false); }
  }

  async function onSubmit(input: FormInput) {
    if (!validateSourceImage()) {
      goToStep(1, "material-image");
      return;
    }

    if (isRawMaterial && outputImageError) {
      goToStep(2, "output-material-image");
      outputImageInputRef.current?.focus();
      return;
    }
    const values: FormValues = schema.parse(input);
    if (values.materialType === "") return;
    const invalidCode = await validateCodes(isRawMaterial ? ["code", "outputCode"] : ["code"], values);
    if (invalidCode) {
      goToStep(invalidCode === "code" ? 1 : 2, invalidCode);
      return;
    }
    let outputImagePath = draftOutputImagePath ?? undefined;
    if (isRawMaterial && outputImageFile) {
      const body = new FormData(); body.set("file", outputImageFile);
      const upload = await uploadMaterialPcImageAction(body);
      if (upload.status === "error") {
        goToStep(2, "output-material-image");
        outputImageInputRef.current?.focus();
        toast.error(upload.message);
        return;
      }
      outputImagePath = upload.image.imagePath;
    }

    const payload = {
      ...(draft ? { draftId: draft.id, draftUpdatedAt: draft.updatedAt } : {}),
      code: values.code,
      name: values.name,
      materialType: values.materialType,
      locationType: values.locationType,
      ratio: values.materialType === "PCS" ? null : Number(values.ratio),
      unitId: values.unitId,
      packingQuantity: isRawMaterial || values.packingQuantity === "" || values.packingQuantity === undefined ? null : Number(values.packingQuantity),
      ...(isRawMaterial ? { processingOutput: {
        ...materialImageUpdateFields(outputImagePath),
        code: values.outputCode.trim(),
        name: values.outputName.trim(),
        locationType: values.outputLocationType,
        unitId: values.outputUnitId,
        modelId: values.outputModelId === NONE ? null : values.outputModelId,
        loadingPointId: values.outputLoadingPointId === NONE ? null : values.outputLoadingPointId,
        processLineName: values.outputProcessLineName.trim() || null,
        scale: values.outputScale.trim() || null,
        specification: values.outputSpecification.trim() || null,
        packingQuantity: Number(values.outputPackingQuantity),
        ...(material?.processingMaterial ? { updatedAt: material.processingMaterial.updatedAt } : {}),
      } } : {}),
      minimumStock: Number(values.minimumStock),
      deliveryTypeId: values.deliveryTypeId === NONE ? null : values.deliveryTypeId,
      materialTypeId: values.materialTypeId === NONE ? null : values.materialTypeId,
      modelId: values.modelId === NONE ? null : values.modelId,
      loadingPointId: values.loadingPointId === NONE ? null : values.loadingPointId,
      processLineName: values.processLineName || null,
      scale: values.scale || null,
      specification: values.specification || null,
      description: values.description || null,
      supplierIds,
    };

    let imagePath: string | undefined = draft?.imagePath ?? undefined;
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

  const materialImagePicker = (
    <div className="mb-5">
      <MaterialImagePicker
        file={imageFile}
        previewUrl={imagePreview}
        error={imageError}
        required={imageRequired}
        hasExistingImage={!!(draft?.imagePath || material?.imagePath) && !imageFile}
        inputRef={imageInputRef}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          const validationMessage = validateMaterialImage(file, imageRequired);
          setImageError(validationMessage);
          if (validationMessage || !file) {
            setImageFile(null);
            setImagePreview((current) => {
              if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
              return draft?.imagePath ?? material?.imagePath ?? null;
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
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!busy) onOpenChange(nextOpen); }}>
      <DialogContent fullScreenOnMobile size="xl" className="overflow-hidden p-0">
        <form noValidate onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (step < lastStep) void nextStep();
          else void handleSubmit(onSubmit, onInvalid)(event);
        }} className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-busy={busy}>
          <DialogHeader className="shrink-0">
            <DialogTitle>{isEdit ? "แก้ไขวัสดุ PC" : "เพิ่มวัสดุ PC"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "แก้ไขข้อมูลวัสดุประเภทชิ้นส่วนจัดซื้อนี้" : "เพิ่มวัสดุประเภทชิ้นส่วนจัดซื้อใหม่"}
            </DialogDescription>
            {draft && <p className="mt-2 text-xs text-primary">กำลังทำต่อจากร่าง · บันทึกล่าสุด {new Date(draft.updatedAt).toLocaleString("th-TH")}</p>}
            <nav aria-label="ขั้นตอนกรอกข้อมูลวัสดุ" className="mt-4">
              <ol className={cn("grid gap-2", isRawMaterial ? "grid-cols-3" : "grid-cols-2")}>
                {steps.map((label, index) => <li key={index} aria-current={step === index ? "step" : undefined} className={cn("flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2", step === index ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg-muted")}>
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", step >= index ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg-muted")}>{step > index ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span>
                  <span className="text-xs font-medium leading-relaxed">{label}</span>
                </li>)}
              </ol>
            </nav>
          </DialogHeader>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <h3 ref={stepHeadingRef} tabIndex={-1} className="mb-4 text-sm font-semibold text-fg focus:outline-none">ขั้นตอน {step + 1} จาก {steps.length} · {steps[step]}</h3>
            <div hidden={step !== 0}>
            <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-4">
              <div className="space-y-1"><Label htmlFor="materialType">ชนิดเหล็ก <span className="text-danger">*</span></Label><p className="text-xs text-fg-muted">เลือกชนิดเหล็กก่อน เพื่อแสดงแบบฟอร์ม Material ที่ต้องกรอก</p></div>
              <Select value={materialType} disabled={busy} onValueChange={(value) => setValue("materialType", value as MaterialShape, { shouldValidate: true, shouldDirty: true })}>
                <SelectTrigger id="materialType" className="h-11 bg-surface text-base sm:text-sm" aria-required="true" aria-invalid={!!errors.materialType} aria-describedby={`materialType-hint${errors.materialType ? " materialType-error" : ""}`}><SelectValue placeholder="เลือกชนิดเหล็ก PCS / PIPE / SHEET / COIL" /></SelectTrigger>
                <SelectContent>{shapes.map((shape) => <SelectItem key={shape} value={shape}>{shape}</SelectItem>)}</SelectContent>
              </Select>
              <p id="materialType-hint" aria-live="polite" className="text-xs text-fg-secondary">{hasMaterialType ? isRawMaterial ? "กรอก Material 2 ชุด: วัตถุดิบก่อนแปรรูป และชิ้นงานหลังแปรรูป" : "กรอก Material 1 ชุด สำหรับวัสดุชนิด PCS" : "PCS ใช้ข้อมูล 1 ชุด · PIPE / SHEET / COIL ใช้ข้อมูล 2 ชุด"}</p>
              {errors.materialType && <p id="materialType-error" className="text-xs text-danger" role="alert">{errors.materialType.message}</p>}
            </div>
            {!hasMaterialType && <div className="py-10 text-center"><p className="text-sm font-medium text-fg">เริ่มจากเลือกชนิดเหล็ก</p><p className="mt-2 text-xs text-fg-muted">จากนั้นจึงกรอกรหัส ชื่อ และรายละเอียดวัสดุ</p></div>}
            </div>
            {hasMaterialType && <fieldset hidden={step !== 1} disabled={busy} className="min-w-0">
            <legend className="sr-only">ข้อมูล Material ต้นทาง</legend>
            {!isRawMaterial && materialImagePicker}
            {isRawMaterial && <div className="mb-4 space-y-1 border-b border-border pb-3"><h3 className="text-sm font-semibold text-fg">Material 1 · วัตถุดิบก่อนแปรรูป</h3><p className="text-xs text-fg-muted">กรอกข้อมูลวัตถุดิบก่อนแปรรูป · รับเข้าและเก็บสต็อกตามหน่วยเส้น / แผ่น / ม้วน</p></div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">รหัส</Label>
                <Input
                  id="code"
                  placeholder="MAT-0231"
                  aria-invalid={!!errors.code || sourceCodeCheck.status === "duplicate"}
                  aria-describedby={`code-check${errors.code ? " code-error" : ""}`}
                  {...register("code")}
                />
                <MaterialCodeFeedback id="code-check" check={errors.code ? { status: "idle" } : sourceCodeCheck} />
                {errors.code && (
                  <p id="code-error" className="text-xs text-danger" role="alert">
                    {errors.code.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">ชื่อ</Label>
                <Input
                  id="name"
                  placeholder={isRawMaterial ? "เช่น ท่อเหล็ก 6 เมตร" : "Hex Bolt M8x40"}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  {...register("name")}
                />
                {errors.name && (
                  <p id="name-error" className="text-xs text-danger" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="materialTypeId">ประเภทวัสดุ</Label>
                {lookups.materialTypes.length === 0 ? (
                  <MasterDataEmptyLink href="/master-data/material-types" resourceLabel="ประเภทวัสดุ" />
                ) : (
                  <Select value={watch("materialTypeId")} onValueChange={(v) => setValue("materialTypeId", v, { shouldValidate: true })}>
                    <SelectTrigger id="materialTypeId"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                      {lookups.materialTypes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="locationType">Location Type <span className="text-danger">*</span></Label>
                <Select value={watch("locationType")} onValueChange={(value) => { if (value === "internal" || value === "external") setValue("locationType", value, { shouldValidate: true, shouldDirty: true }); }}>
                  <SelectTrigger id="locationType" aria-required="true" aria-invalid={!!errors.locationType} aria-describedby={errors.locationType ? "locationType-error" : undefined}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="internal">Internal (ภายใน)</SelectItem><SelectItem value="external">External (ภายนอก)</SelectItem></SelectContent>
                </Select>
                {errors.locationType && <p id="locationType-error" role="alert" className="text-xs text-danger">{errors.locationType.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="unitId">หน่วย</Label>
                {lookups.units.length === 0 ? (
                  <MasterDataEmptyLink href="/master-data/units" resourceLabel="หน่วยนับ" />
                ) : (
                  <Select value={watch("unitId")} onValueChange={(v) => setValue("unitId", v, { shouldValidate: true })}>
                    <SelectTrigger id="unitId" aria-invalid={errors.unitId ? true : undefined} aria-describedby={errors.unitId ? "unitId-error" : undefined}>
                      <SelectValue placeholder="เลือกหน่วย" />
                    </SelectTrigger>
                    <SelectContent>
                      {lookups.units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.nameEn ?? unit.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.unitId && (
                  <p id="unitId-error" className="text-xs text-danger" role="alert">
                    {errors.unitId.message}
                  </p>
                )}
              </div>
              {!isRawMaterial && <div className="flex flex-col gap-1.5">
                <Label htmlFor="packingQuantity">จำนวนต่อแพ็ก</Label>
                <Input id="packingQuantity" type="number" min="1" {...register("packingQuantity")} aria-invalid={!!errors.packingQuantity} aria-describedby={errors.packingQuantity ? "packingQuantity-error" : undefined} />
                {errors.packingQuantity && <p id="packingQuantity-error" role="alert" className="text-xs text-danger">{errors.packingQuantity.message}</p>}
              </div>}

              {!isRawMaterial && <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="minimumStock">สต็อกขั้นต่ำ</Label>
                  <Input id="minimumStock" type="number" min="0" step="0.0001" aria-invalid={errors.minimumStock ? true : undefined} {...register("minimumStock")} />
                  {errors.minimumStock && <p className="text-xs text-danger" role="alert">{errors.minimumStock.message}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="deliveryTypeId">ประเภทการจัดส่ง</Label>
                  {lookups.deliveryTypes.length === 0 ? (
                    <MasterDataEmptyLink href="/master-data/delivery-types" resourceLabel="ประเภทการจัดส่ง" />
                  ) : (
                    <Select value={watch("deliveryTypeId")} onValueChange={(v) => setValue("deliveryTypeId", v, { shouldValidate: true })}>
                      <SelectTrigger id="deliveryTypeId"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                        {lookups.deliveryTypes.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="modelId">รุ่น</Label>
                  {lookups.models.length === 0 ? (
                    <MasterDataEmptyLink href="/master-data/material-models" resourceLabel="รุ่นวัสดุ" />
                  ) : (
                    <Select value={watch("modelId")} onValueChange={(v) => setValue("modelId", v, { shouldValidate: true })}>
                      <SelectTrigger id="modelId"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                        {lookups.models.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="loadingPointId">จุดขึ้นสินค้า</Label>
                  {lookups.loadingPoints.length === 0 ? (
                    <MasterDataEmptyLink href="/master-data/loading-points" resourceLabel="จุดขึ้นสินค้า" />
                  ) : (
                    <Select value={watch("loadingPointId")} onValueChange={(v) => setValue("loadingPointId", v, { shouldValidate: true })}>
                      <SelectTrigger id="loadingPointId"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>ไม่ระบุ</SelectItem>
                        {lookups.loadingPoints.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="processLineName">สายการผลิต</Label>
                  <Input id="processLineName" placeholder="Cutting Line 1" {...register("processLineName")} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="scale">มาตราส่วน</Label>
                  <Input id="scale" placeholder="1:4" {...register("scale")} />
                </div>
              </>}
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="addSupplierId">ซัพพลายเออร์</Label>
              {lookups.suppliers.length === 0 ? (
                <MasterDataEmptyLink href="/master-data/suppliers" resourceLabel="ซัพพลายเออร์" />
              ) : (
                <>
                  {/* Picking an option adds it straight away — there is no separate
                      "add" button to forget. The select always returns to its placeholder. */}
                  <Select
                    value=""
                    onValueChange={(id) => {
                      if (id) setSupplierIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                    }}
                    disabled={availableSuppliers.length === 0}
                  >
                    <SelectTrigger id="addSupplierId" aria-describedby="supplier-hint">
                      <SelectValue
                        placeholder={availableSuppliers.length === 0 ? "เลือกครบทุกรายแล้ว" : "เลือกซัพพลายเออร์เพื่อเพิ่มเข้ารายการ..."}
                      />
                    </SelectTrigger>
                    <SelectContent searchPlaceholder="ค้นหาซัพพลายเออร์...">
                      {availableSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nameEn ?? s.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="supplier-hint" className="text-xs text-fg-muted">
                    เลือกแล้วระบบจะเพิ่มเข้ารายการด้านล่างทันที เลือกได้หลายราย
                  </p>
                  <div
                    className={cn(
                      "rounded-md border p-3",
                      selectedSuppliers.length > 0 ? "border-border bg-surface-2/50" : "border-dashed border-warning/60 bg-warning-soft",
                    )}
                    aria-live="polite"
                  >
                    {selectedSuppliers.length === 0 ? (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-warning-fg">
                        <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                        ยังไม่มีซัพพลายเออร์ในรายการ — ต้องมีอย่างน้อย 1 รายจึงจะรับเข้าวัตถุดิบนี้ได้
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fg-secondary">
                          <Check className="h-3.5 w-3.5 text-success" />
                          ซัพพลายเออร์ที่เลือกแล้ว ({selectedSuppliers.length})
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {selectedSuppliers.map((s) => (
                            <li
                              key={s.id}
                              className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary-soft px-2.5 py-1 text-sm text-primary"
                            >
                              {s.nameEn ?? s.code}
                              <button
                                type="button"
                                aria-label={`ลบ ${s.nameEn ?? s.code}`}
                                title="นำออกจากรายการ"
                                onClick={() => setSupplierIds((prev) => prev.filter((id) => id !== s.id))}
                                className="rounded-sm text-primary/70 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="specification">{isRawMaterial ? "ขนาด / ข้อมูลจำเพาะก่อนแปรรูป" : "ข้อมูลจำเพาะ"}</Label>
                <Textarea id="specification" rows={3} {...register("specification")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">รายละเอียด</Label>
                <Textarea id="description" rows={3} {...register("description")} />
              </div>
            </div>
            {isRawMaterial && <div className="mt-5 border-t border-border pt-4">{materialImagePicker}</div>}
            </fieldset>}
            {isRawMaterial && (
              <fieldset hidden={step !== 2} disabled={busy} className="min-w-0">
              <legend className="sr-only">ข้อมูล Material หลังแปรรูป</legend>
              <section className="space-y-4 rounded-xl border border-border bg-surface-2 p-4 sm:p-5" aria-labelledby="material-output-heading">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Scissors className="size-4" aria-hidden="true" /></span>
                  <div><h3 id="material-output-heading" className="text-sm font-semibold text-fg">Material 2 · ชิ้นงานหลังแปรรูป</h3><p className="mt-1 text-xs leading-relaxed text-fg-muted">บันทึกเป็น Material ชนิด PCS รหัสแยกจากต้นทาง และใช้เป็นค่าเริ่มต้นตอนแปรรูป</p></div>
                </div>
                {material?.processingMaterial && !material.processingMaterial.isActive && <p role="alert" className="text-xs text-danger">วัสดุปลายทางถูกปิดใช้งาน กรุณาเปิดใช้งานก่อนบันทึก</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="outputCode">รหัสหลังแปรรูป <span className="text-danger">*</span></Label><Input id="outputCode" placeholder="เช่น MAT-0231-CUT" {...register("outputCode")} aria-required="true" aria-invalid={!!errors.outputCode || outputCodeCheck.status === "duplicate"} aria-describedby={`outputCode-check${errors.outputCode ? " outputCode-error" : ""}`} /><MaterialCodeFeedback id="outputCode-check" check={errors.outputCode ? { status: "idle" } : outputCodeCheck} />{errors.outputCode && <p id="outputCode-error" role="alert" className="text-xs text-danger">{errors.outputCode.message}</p>}</div>
                  <div className="space-y-1.5"><Label htmlFor="outputName">ชื่อหลังแปรรูป <span className="text-danger">*</span></Label><Input id="outputName" placeholder="ชื่อชิ้นงานที่ตัดแล้ว" {...register("outputName")} aria-required="true" aria-invalid={!!errors.outputName} aria-describedby={errors.outputName ? "outputName-error" : undefined} />{errors.outputName && <p id="outputName-error" role="alert" className="text-xs text-danger">{errors.outputName.message}</p>}</div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputLocationType">Location Type <span className="text-danger">*</span></Label>
                    <Select value={watch("outputLocationType")} onValueChange={(value) => { if (value === "internal" || value === "external") setValue("outputLocationType", value, { shouldValidate: true, shouldDirty: true }); }}>
                      <SelectTrigger id="outputLocationType" aria-required="true" aria-invalid={!!errors.outputLocationType} aria-describedby={errors.outputLocationType ? "outputLocationType-error" : undefined}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="internal">Internal (ภายใน)</SelectItem><SelectItem value="external">External (ภายนอก)</SelectItem></SelectContent>
                    </Select>
                    {errors.outputLocationType && <p id="outputLocationType-error" role="alert" className="text-xs text-danger">{errors.outputLocationType.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputUnitId">หน่วยหลังแปรรูป <span className="text-danger">*</span></Label>
                    {lookups.units.length === 0 ? <MasterDataEmptyLink href="/master-data/units" resourceLabel="หน่วยนับ" /> : <Select value={watch("outputUnitId")} onValueChange={(value) => setValue("outputUnitId", value, { shouldValidate: true })}><SelectTrigger id="outputUnitId" aria-required="true" aria-invalid={!!errors.outputUnitId} aria-describedby={errors.outputUnitId ? "outputUnitId-error" : undefined}><SelectValue placeholder="เลือกหน่วยชิ้นงาน" /></SelectTrigger><SelectContent>{lookups.units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.nameTh || unit.nameEn || unit.code}</SelectItem>)}</SelectContent></Select>}
                    {errors.outputUnitId && <p id="outputUnitId-error" role="alert" className="text-xs text-danger">{errors.outputUnitId.message}</p>}
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="ratio">ตัดได้กี่ชิ้นต่อ 1 หน่วยต้นทาง <span className="text-danger">*</span></Label><Input id="ratio" type="number" inputMode="numeric" min="1" step="1" {...register("ratio")} aria-required="true" aria-invalid={!!errors.ratio} aria-describedby="ratio-hint ratio-error" /><p id="ratio-hint" className="text-xs text-fg-muted">ตัวอย่าง: ท่อ 1 เส้น ตัดได้ 100 ชิ้น</p>{errors.ratio && <p id="ratio-error" role="alert" className="text-xs text-danger">{errors.ratio.message}</p>}</div>
                  <div className="space-y-1.5"><Label htmlFor="outputPackingQuantity">จำนวนชิ้นต่อกล่อง <span className="text-danger">*</span></Label><Input id="outputPackingQuantity" type="number" inputMode="numeric" min="1" max="1000000" step="1" {...register("outputPackingQuantity")} aria-required="true" aria-invalid={!!errors.outputPackingQuantity} aria-describedby={errors.outputPackingQuantity ? "outputPackingQuantity-error" : undefined} />{errors.outputPackingQuantity && <p id="outputPackingQuantity-error" role="alert" className="text-xs text-danger">{errors.outputPackingQuantity.message}</p>}</div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputModelId">รุ่น</Label>
                    {lookups.models.length === 0 ? <MasterDataEmptyLink href="/master-data/material-models" resourceLabel="รุ่นวัสดุ" /> : <Select value={watch("outputModelId")} onValueChange={(value) => setValue("outputModelId", value, { shouldValidate: true, shouldDirty: true })}>
                      <SelectTrigger id="outputModelId" aria-invalid={!!errors.outputModelId} aria-describedby={errors.outputModelId ? "outputModelId-error" : undefined}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>ไม่ระบุ</SelectItem>{lookups.models.map((item) => <SelectItem key={item.id} value={item.id}>{item.nameTh || item.nameEn || item.code}</SelectItem>)}</SelectContent>
                    </Select>}
                    {errors.outputModelId && <p id="outputModelId-error" role="alert" className="text-xs text-danger">{errors.outputModelId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputLoadingPointId">จุดขึ้นสินค้า</Label>
                    {lookups.loadingPoints.length === 0 ? <MasterDataEmptyLink href="/master-data/loading-points" resourceLabel="จุดขึ้นสินค้า" /> : <Select value={watch("outputLoadingPointId")} onValueChange={(value) => setValue("outputLoadingPointId", value, { shouldValidate: true, shouldDirty: true })}>
                      <SelectTrigger id="outputLoadingPointId" aria-invalid={!!errors.outputLoadingPointId} aria-describedby={errors.outputLoadingPointId ? "outputLoadingPointId-error" : undefined}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value={NONE}>ไม่ระบุ</SelectItem>{lookups.loadingPoints.map((item) => <SelectItem key={item.id} value={item.id}>{item.nameTh || item.nameEn || item.code}</SelectItem>)}</SelectContent>
                    </Select>}
                    {errors.outputLoadingPointId && <p id="outputLoadingPointId-error" role="alert" className="text-xs text-danger">{errors.outputLoadingPointId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputProcessLineName">สายการผลิต</Label>
                    <Input id="outputProcessLineName" maxLength={255} {...register("outputProcessLineName")} aria-invalid={!!errors.outputProcessLineName} aria-describedby={errors.outputProcessLineName ? "outputProcessLineName-error" : undefined} />
                    {errors.outputProcessLineName && <p id="outputProcessLineName-error" role="alert" className="text-xs text-danger">{errors.outputProcessLineName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outputScale">มาตราส่วน</Label>
                    <Input id="outputScale" maxLength={255} {...register("outputScale")} aria-invalid={!!errors.outputScale} aria-describedby={errors.outputScale ? "outputScale-error" : undefined} />
                    {errors.outputScale && <p id="outputScale-error" role="alert" className="text-xs text-danger">{errors.outputScale.message}</p>}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="outputSpecification">ขนาด / ข้อมูลจำเพาะหลังแปรรูป</Label><Textarea id="outputSpecification" rows={3} placeholder="เช่น ความยาวชิ้นงานหลังตัด 60 มม." {...register("outputSpecification")} /></div>
                </div>
                <div className="border-t border-border pt-4">
                  <MaterialImagePicker
                    id="output-material-image"
                    label="รูปภาพ Material หลังแปรรูป"
                    required={false}
                    file={outputImageFile}
                    previewUrl={outputImagePreview}
                    error={outputImageError}
                    hasExistingImage={!!(draftOutputImagePath || material?.processingMaterial?.imagePath) && !outputImageFile}
                    inputRef={outputImageInputRef}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0] ?? null;
                      const error = validateMaterialImage(file, false);
                      setOutputImageError(error);
                      setOutputImageFile(error ? null : file);
                      setOutputImagePreview((current) => {
                        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                        return !error && file ? URL.createObjectURL(file) : draftOutputImagePath ?? material?.processingMaterial?.imagePath ?? null;
                      });
                      if (error) event.currentTarget.value = "";
                    }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-fg-muted">การบันทึกข้อมูลวัสดุยังไม่เพิ่มสต็อกชิ้นงาน สต็อกปลายทางจะเพิ่มเมื่อยืนยันแปรรูปเท่านั้น</p>
              </section>
              </fieldset>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-wrap bg-surface">
            <Button type="button" variant="ghost" className="mr-auto" disabled={busy} onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void saveDraft()}><Save className="size-4" aria-hidden="true" />{savingDraft ? "กำลังบันทึกร่าง…" : "บันทึกร่าง"}</Button>
            {step > 0 && <Button type="button" variant="outline" disabled={busy} onClick={() => goToStep(step - 1)}><ArrowLeft className="size-4" aria-hidden="true" />ย้อนกลับ</Button>}
            <Button key={step === lastStep ? "save" : "next"} type="submit" disabled={busy}>
              {isSubmitting ? "กำลังบันทึก…" : advancing ? "กำลังตรวจข้อมูล…" : step < lastStep ? "ถัดไป" : isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มวัสดุ"}
              {step < lastStep && <ArrowRight className="size-4" aria-hidden="true" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
