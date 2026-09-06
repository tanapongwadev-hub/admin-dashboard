"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  createBomAction,
  activateBomAction,
} from "@/app/(dashboard)/products/actions";
import {
  productSchema,
  toProductDefaultValues,
  validateProductImage,
  ProductImagePicker,
  type ProductFormInput,
  type ProductFormValues,
} from "@/components/products/products-form-dialog";
import type { Product, ProductLookupItem, ProductLookups } from "@/lib/api/products";
import type { Material } from "@/lib/api/materials";
import type { Bom, CreateBomItemPayload } from "@/lib/api/boms";
import { cn } from "@/lib/utils";

// The single "add/edit a product" flow (see AGENTS.md § Products) — same
// schema, same Server Actions, same ProductImagePicker as
// ProductsFormDialog's single-page form (which is kept around only for
// those shared exports; its own dialog is no longer rendered anywhere).
// Used for both create and edit — pass `product` to edit an existing one.

type StepId = "identity" | "classification" | "logistics" | "stock" | "review";

interface StepDef {
  id: StepId;
  label: string;
  fields: (keyof ProductFormInput)[];
}

const STEPS: StepDef[] = [
  { id: "identity", label: "ข้อมูลพื้นฐาน", fields: ["code", "name"] },
  { id: "classification", label: "การจำแนกประเภท", fields: ["productTypeId", "modelId", "customerId", "unitId"] },
  { id: "logistics", label: "การจัดส่งและสถานที่", fields: ["locationId", "deliveryTypeId", "loadingPointId", "processLineId"] },
  { id: "stock", label: "สต็อกและมาตราส่วน", fields: ["packing", "lotSize", "safetyStock", "minStock", "scale"] },
  { id: "review", label: "ตรวจสอบและยืนยัน", fields: [] },
];

function nameOf(items: ProductLookupItem[], id: string | undefined): string {
  if (!id) return "—";
  const item = items.find((i) => i.id === id);
  return item ? item.nameTh || item.nameEn || item.code : "—";
}

// Draft row for the post-create BOM step — kept as plain component state
// (not a second react-hook-form instance) since it's a short-lived,
// dialog-local repeatable list with no field-level validation rules as
// elaborate as the product form's zod schema; a row only needs "is this
// complete enough to submit" (see isCompleteBomItem below).
let bomRowKeySeed = 0;

// Cycled per BOM row (by index) purely so adjacent rows are visually distinct
// at a glance — see the comment at its one call site in the "bom" phase JSX.
const BOM_ROW_ACCENTS = [
  { badge: "bg-primary-soft text-primary", band: "bg-primary-soft/60", strip: "border-l-primary" },
  { badge: "bg-success-soft text-success", band: "bg-success-soft/60", strip: "border-l-success" },
  { badge: "bg-warning-soft text-warning", band: "bg-warning-soft/60", strip: "border-l-warning" },
  { badge: "bg-info-soft text-info", band: "bg-info-soft/60", strip: "border-l-info" },
] as const;

interface BomItemDraft {
  key: number;
  materialId: string;
  unitId: string;
  quantity: string;
  wastagePercent: string;
  remark: string;
}

function newBomItemDraft(): BomItemDraft {
  bomRowKeySeed += 1;
  return { key: bomRowKeySeed, materialId: "", unitId: "", quantity: "", wastagePercent: "", remark: "" };
}

function isCompleteBomItem(item: BomItemDraft): boolean {
  return item.materialId !== "" && item.unitId !== "" && Number(item.quantity) > 0;
}

function toBomItemPayload(item: BomItemDraft): CreateBomItemPayload {
  return {
    materialId: item.materialId,
    unitId: item.unitId,
    quantity: Number(item.quantity),
    wastagePercent: item.wastagePercent === "" ? null : Number(item.wastagePercent),
    remark: item.remark.trim() || null,
  };
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5 px-6 pb-1 pt-4" aria-label="ขั้นตอนการเพิ่มสินค้า">
      {STEPS.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "upcoming";
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1.5 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={state === "active" ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-primary text-primary-fg",
                  state === "active" && "bg-primary-soft text-primary ring-2 ring-primary",
                  state === "upcoming" && "bg-surface-2 text-fg-muted"
                )}
              >
                {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden max-w-20 truncate text-center text-[10px] font-medium sm:block",
                  state === "upcoming" ? "text-fg-muted" : "text-fg-secondary"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={cn("h-px flex-1", index < current ? "bg-primary" : "bg-border")} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// Inner view — extracted from ProductsWizardDialog so SSR tests can render
// it directly. Radix Dialog renders through a Portal which
// `renderToStaticMarkup` can't capture (same limitation documented in
// AGENTS.md § Row actions and in material-pc-details-dialog.tsx).
export function ProductsWizardView({
  open,
  onOpenChange,
  product,
  lookups,
  materials,
  canCreateBom,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Omitted/null = create mode; passed = edit mode (mirrors
  // ProductsFormDialog's own `product` prop shape).
  product?: Product | null;
  lookups: ProductLookups;
  materials: Material[];
  canCreateBom: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  // "form" = the 5-step product form; "bom" = the post-save BOM step this
  // flow always continues into once the product is confirmed and
  // created/updated (see AGENTS.md § Products) — never entered if the
  // viewer lacks BOMS_CREATE, since there'd be nothing they could do there.
  // "bom-done" = a status screen confirming the BOM save actually
  // succeeded, shown instead of closing the dialog immediately.
  const [phase, setPhase] = React.useState<"form" | "bom" | "bom-done">("form");
  const [savedProduct, setSavedProduct] = React.useState<Product | null>(null);
  const [bomDoneResult, setBomDoneResult] = React.useState<{ bom: Bom; activated: boolean } | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [bomItems, setBomItems] = React.useState<BomItemDraft[]>([newBomItemDraft()]);
  const [bomSpecification, setBomSpecification] = React.useState("");
  const [isSavingBom, setIsSavingBom] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productSchema),
    defaultValues: toProductDefaultValues(product),
    // Per-step validation runs via explicit trigger(step.fields) on "ถัดไป",
    // not handleSubmit — react-hook-form's default reValidateMode:"onChange"
    // only takes effect once handleSubmit has run once (isSubmitted), which
    // in this wizard doesn't happen until the very last step is confirmed.
    // Without this, an error shown by trigger() on step 1 stays on screen
    // as the user types a fix, only clearing once they click "ถัดไป" again.
    // mode: "onChange" validates on every keystroke from the start, so a
    // field's error clears the moment its value becomes valid.
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      setPhase("form");
      setSavedProduct(null);
      setBomDoneResult(null);
      setConfirmOpen(false);
      setBomItems([newBomItemDraft()]);
      setBomSpecification("");
      setStepIndex(0);
      reset(toProductDefaultValues(product));
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

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const values = watch();

  async function goNext() {
    const valid = step.fields.length === 0 || (await trigger(step.fields));
    if (valid) setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function onSubmit(input: ProductFormInput) {
    const parsed: ProductFormValues = productSchema.parse(input);
    const payload = {
      code: parsed.code,
      name: parsed.name,
      unitId: parsed.unitId,
      modelId: parsed.modelId,
      customerId: parsed.customerId,
      locationId: parsed.locationId,
      productTypeId: parsed.productTypeId,
      deliveryTypeId: parsed.deliveryTypeId,
      loadingPointId: parsed.loadingPointId,
      processLineId: parsed.processLineId,
      packing: parsed.packing === "" ? undefined : Number(parsed.packing),
      lotSize: parsed.lotSize === "" ? undefined : Number(parsed.lotSize),
      safetyStock: parsed.safetyStock === "" ? null : Number(parsed.safetyStock),
      minStock: parsed.minStock === "" ? null : Number(parsed.minStock),
      scale: parsed.scale || null,
    };

    let productImagePath: string | undefined;
    if (imageFile) {
      const imageFormData = new FormData();
      imageFormData.set("file", imageFile);
      const uploadResult = await uploadProductImageAction(imageFormData);
      if (uploadResult.status === "error") {
        setImageError(uploadResult.message);
        toast.error(uploadResult.message);
        setStepIndex(0);
        return;
      }
      productImagePath = uploadResult.image.imagePath;
    }

    const result = isEdit
      ? await updateProductAction(product!.id, {
          ...payload,
          // Omit entirely (not `null`) unless a replacement was actually
          // staged, same distinction ProductsFormDialog's own edit path
          // makes — an edit with no new file must leave the existing image
          // untouched.
          ...(productImagePath ? { productImagePath } : {}),
          updatedAt: product!.updatedAt,
        })
      : await createProductAction({ ...payload, productImagePath });

    if (result.status === "success") {
      toast.success(isEdit ? "บันทึกการเปลี่ยนแปลงแล้ว" : "สร้างสินค้าแล้ว", {
        description: `บันทึก ${result.product.name} เรียบร้อยแล้ว`,
      });
      // Refresh the products list immediately — the save is real regardless
      // of what happens in the BOM step next (skipped, drafted, or
      // abandoned via Esc), so don't wait on that to show it.
      onSaved();
      if (canCreateBom) {
        setSavedProduct(result.product);
        setPhase("bom");
      } else {
        onOpenChange(false);
      }
      return;
    }
    toast.error(result.message);
  }

  function updateBomItem(key: number, patch: Partial<BomItemDraft>) {
    setBomItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function handleBomMaterialChange(key: number, materialId: string) {
    const material = materials.find((m) => m.id === materialId);
    setBomItems((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, materialId, unitId: item.unitId || material?.unitId || "" }
          : item
      )
    );
  }

  function removeBomItem(key: number) {
    setBomItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  // A material already chosen on another row is excluded from that row's
  // own dropdown — the user can't add a duplicate in the first place,
  // rather than being allowed to pick one and told afterward. Row count
  // itself stays unbounded (see AGENTS.md § Products); it's only the same
  // material appearing twice that's disallowed.
  function materialOptionsFor(rowKey: number): Material[] {
    const usedByOtherRows = new Set(
      bomItems.filter((i) => i.key !== rowKey && i.materialId !== "").map((i) => i.materialId)
    );
    return materials.filter((m) => !usedByOtherRows.has(m.id));
  }

  function collectValidBomItems(): CreateBomItemPayload[] | null {
    const complete = bomItems.filter(isCompleteBomItem);
    if (complete.length === 0) {
      toast.error("กรุณาเพิ่มรายการวัตถุดิบอย่างน้อย 1 รายการ (เลือกวัตถุดิบ หน่วย และจำนวน)");
      return null;
    }
    // Defense in depth — the material <Select> already excludes materials
    // used by other rows (see the `materials.filter` at its render site
    // below), so this should never actually trigger, but a submit-time
    // guard costs nothing and catches any future gap in that exclusion.
    const materialIds = complete.map((item) => item.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      toast.error("มีวัตถุดิบซ้ำกันใน BOM — วัตถุดิบแต่ละรายการต้องไม่ซ้ำกัน");
      return null;
    }
    return complete.map(toBomItemPayload);
  }

  async function handleSaveBomDraft() {
    if (!savedProduct) return;
    const items = collectValidBomItems();
    if (!items) return;

    setIsSavingBom(true);
    const result = await createBomAction({
      productId: savedProduct.id,
      specification: bomSpecification.trim() || null,
      items,
    });
    setIsSavingBom(false);

    if (result.status === "success") {
      toast.success("บันทึกร่าง BOM สำเร็จ", { description: `${savedProduct.name} · ${result.bom.version} (ร่าง)` });
      // A dedicated status screen, not just a toast — the operation just
      // completed a real backend write (a new BOM row now exists), which
      // deserves a persistent confirmation the user can read at their own
      // pace, not one that can be missed if the toast disappears first.
      setBomDoneResult({ bom: result.bom, activated: false });
      setPhase("bom-done");
      return;
    }
    toast.error(result.message);
  }

  async function handleSaveAndActivateBom() {
    if (!savedProduct) return;
    const items = collectValidBomItems();
    if (!items) return;

    setIsSavingBom(true);
    const createResult = await createBomAction({
      productId: savedProduct.id,
      specification: bomSpecification.trim() || null,
      items,
    });
    if (createResult.status === "error") {
      setIsSavingBom(false);
      toast.error(createResult.message);
      return;
    }

    const activateResult = await activateBomAction(createResult.bom.id);
    setIsSavingBom(false);

    if (activateResult.status === "success") {
      toast.success("สร้างและเปิดใช้งาน BOM สำเร็จ", {
        description: `${savedProduct.name} · ${activateResult.bom.version}`,
      });
      setBomDoneResult({ bom: activateResult.bom, activated: true });
      setPhase("bom-done");
      return;
    }
    // BOM was created (as DRAFT) but activation failed — the status screen
    // still shows, just truthfully as "saved as draft" rather than implying
    // activation succeeded when it didn't.
    toast.error(`สร้าง BOM แล้วแต่เปิดใช้งานไม่สำเร็จ: ${activateResult.message}`);
    setBomDoneResult({ bom: createResult.bom, activated: false });
    setPhase("bom-done");
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
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
  }

  if (phase === "bom-done" && savedProduct && bomDoneResult) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-full",
              bomDoneResult.activated ? "bg-success-soft text-success" : "bg-primary-soft text-primary"
            )}
          >
            <CheckCircle2 className="size-8" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold text-fg">
              {bomDoneResult.activated ? "บันทึกและเปิดใช้งาน BOM สำเร็จ" : "บันทึกร่าง BOM สำเร็จ"}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {savedProduct.name} ({savedProduct.code}) · {bomDoneResult.bom.version}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
              bomDoneResult.activated ? "border-transparent bg-success-soft text-success" : "border-border-strong bg-transparent text-fg-secondary"
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            สถานะ: {bomDoneResult.activated ? "เปิดใช้งานแล้ว" : "ร่าง"}
          </span>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (phase === "bom" && savedProduct) {
    return (
      <div className="flex h-full flex-col">
        <DialogHeader className="pb-0">
          <DialogTitle>เพิ่ม BOM สำหรับ {savedProduct.name}</DialogTitle>
          <DialogDescription>
            {isEdit ? "บันทึกการเปลี่ยนแปลงสินค้า" : "สร้างสินค้า"} &quot;{savedProduct.code}&quot;
            แล้ว — ระบุรายการวัตถุดิบที่ใช้ประกอบสินค้านี้ (BOM ใหม่จะถูกบันทึกเป็นร่างเสมอจนกว่าจะเปิดใช้งาน)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border-t border-border px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wizard-bom-spec">ข้อกำหนด BOM (ไม่บังคับ)</Label>
            <Input
              id="wizard-bom-spec"
              placeholder="เช่น สเปคการประกอบ, revision"
              value={bomSpecification}
              onChange={(e) => setBomSpecification(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {bomItems.map((item, index) => {
              const selectedMaterial = materials.find((m) => m.id === item.materialId);
              // Each row cycles through a distinct soft accent color (badge +
              // header band + left border strip) purely so adjacent rows are
              // told apart at a glance, on top of the number + material name
              // already added — a color-only cue would fail for color-blind
              // users, so it's always paired with those text cues, never used
              // alone.
              const accent = BOM_ROW_ACCENTS[index % BOM_ROW_ACCENTS.length];
              return (
              <div
                key={item.key}
                className={cn("overflow-hidden rounded-lg border border-l-4 border-border-strong", accent.strip)}
              >
                <div className={cn("flex items-center justify-between gap-2 border-b border-border px-3 py-2", accent.band)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", accent.badge)}>
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "truncate text-sm font-semibold",
                        selectedMaterial ? "text-fg" : "italic text-fg-muted"
                      )}
                    >
                      {selectedMaterial ? `${selectedMaterial.code} · ${selectedMaterial.name}` : "ยังไม่ได้เลือกวัตถุดิบ"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBomItem(item.key)}
                    disabled={bomItems.length === 1}
                    aria-label={`ลบรายการที่ ${index + 1}`}
                    className="shrink-0 rounded-md p-1 text-fg-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label>วัตถุดิบ</Label>
                    <Select value={item.materialId} onValueChange={(v) => handleBomMaterialChange(item.key, v)}>
                      <SelectTrigger><SelectValue placeholder="เลือกวัตถุดิบ" /></SelectTrigger>
                      <SelectContent>
                        {materialOptionsFor(item.key).map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.code} · {material.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-fg-muted">วัตถุดิบที่เลือกในรายการอื่นแล้วจะไม่แสดงซ้ำที่นี่</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>จำนวน</Label>
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={item.quantity}
                      onChange={(e) => updateBomItem(item.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>หน่วย</Label>
                    <Select value={item.unitId} onValueChange={(v) => updateBomItem(item.key, { unitId: v })}>
                      <SelectTrigger><SelectValue placeholder="เลือกหน่วย" /></SelectTrigger>
                      <SelectContent>
                        {lookups.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>{unit.nameTh || unit.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>เปอร์เซ็นต์สูญเสีย (ไม่บังคับ)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={item.wastagePercent}
                      onChange={(e) => updateBomItem(item.key, { wastagePercent: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <Label>หมายเหตุ (ไม่บังคับ)</Label>
                    <Input
                      value={item.remark}
                      onChange={(e) => updateBomItem(item.key, { remark: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setBomItems((prev) => [...prev, newBomItemDraft()])}
            >
              <Plus className="h-3.5 w-3.5" /> เพิ่มรายการวัตถุดิบ
            </Button>
          </div>
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ข้ามขั้นตอนนี้
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSaveBomDraft} disabled={isSavingBom}>
              บันทึกร่าง
            </Button>
            <Button type="button" onClick={handleSaveAndActivateBom} disabled={isSavingBom}>
              บันทึกและเปิดใช้งาน
            </Button>
          </div>
        </DialogFooter>
      </div>
    );
  }

  return (
    <>
        <form
          onSubmit={(e) => {
            // Nothing in this form should submit natively anymore — the
            // last step's action opens the confirm dialog instead (see the
            // "เพิ่มสินค้า" button below), and confirming it is what
            // actually calls handleSubmit(onSubmit)() programmatically.
            // This only guards against Enter-to-submit on the last step.
            e.preventDefault();
            if (isLastStep) setConfirmOpen(true);
          }}
          className="flex h-full flex-col"
        >
          <DialogHeader className="pb-0">
            <DialogTitle>{isEdit ? "แก้ไขสินค้าแบบขั้นตอน" : "เพิ่มสินค้าแบบขั้นตอน"}</DialogTitle>
            <DialogDescription>
              ขั้นตอนที่ {stepIndex + 1} จาก {STEPS.length} · {step.label}
            </DialogDescription>
          </DialogHeader>

          <Stepper current={stepIndex} />

          <div className="flex-1 overflow-y-auto border-t border-border px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {step.id === "identity" && (
              <div className="flex flex-col gap-4">
                <ProductImagePicker
                  file={imageFile}
                  previewUrl={imagePreview}
                  error={imageError}
                  hasExistingImage={isEdit && !!product?.productImagePath && !imageFile}
                  inputRef={imageInputRef}
                  onChange={handleImageChange}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wizard-code">รหัส</Label>
                    <Input id="wizard-code" placeholder="PRD-0231" {...register("code")} />
                    {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wizard-name">ชื่อสินค้า</Label>
                    <Input id="wizard-name" placeholder="Rear Seat Frame Assembly" {...register("name")} />
                    {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {step.id === "classification" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>ประเภทสินค้า</Label>
                  <Select value={watch("productTypeId")} onValueChange={(v) => setValue("productTypeId", v, { shouldValidate: true })}>
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
                  <Label>รุ่น</Label>
                  <Select value={watch("modelId")} onValueChange={(v) => setValue("modelId", v, { shouldValidate: true })}>
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
                  <Select value={watch("customerId")} onValueChange={(v) => setValue("customerId", v, { shouldValidate: true })}>
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
                  <Label>หน่วย</Label>
                  <Select value={watch("unitId")} onValueChange={(v) => setValue("unitId", v, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="เลือกหน่วย" /></SelectTrigger>
                    <SelectContent>
                      {lookups.units.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.unitId && <p className="text-xs text-danger">{errors.unitId.message}</p>}
                </div>
              </div>
            )}

            {step.id === "logistics" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>สถานที่</Label>
                  <Select value={watch("locationId")} onValueChange={(v) => setValue("locationId", v, { shouldValidate: true })}>
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
                  <Label>ประเภทการจัดส่ง</Label>
                  <Select value={watch("deliveryTypeId")} onValueChange={(v) => setValue("deliveryTypeId", v, { shouldValidate: true })}>
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
                  <Select value={watch("loadingPointId")} onValueChange={(v) => setValue("loadingPointId", v, { shouldValidate: true })}>
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
                  <Select value={watch("processLineId")} onValueChange={(v) => setValue("processLineId", v, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue placeholder="เลือกสายการผลิต" /></SelectTrigger>
                    <SelectContent>
                      {lookups.processLines.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.nameTh || item.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.processLineId && <p className="text-xs text-danger">{errors.processLineId.message}</p>}
                </div>
              </div>
            )}

            {step.id === "stock" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-packing">จำนวนต่อแพ็ก</Label>
                  <Input id="wizard-packing" type="number" min="1" placeholder="1" {...register("packing")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-lotSize">ขนาดล็อต</Label>
                  <Input id="wizard-lotSize" type="number" min="1" placeholder="1" {...register("lotSize")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-safetyStock">สต็อกปลอดภัย</Label>
                  <Input id="wizard-safetyStock" type="number" min="0" placeholder="อัตโนมัติจากขนาดล็อต" {...register("safetyStock")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-minStock">สต็อกขั้นต่ำ</Label>
                  <Input id="wizard-minStock" type="number" min="0" placeholder="อัตโนมัติจากจำนวนต่อแพ็ก" {...register("minStock")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="wizard-scale">มาตราส่วน</Label>
                  <Input id="wizard-scale" placeholder="1:4" {...register("scale")} />
                </div>
              </div>
            )}

            {step.id === "review" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-fg-muted">ตรวจสอบข้อมูลก่อนบันทึก — กด &quot;ย้อนกลับ&quot; หากต้องการแก้ไข</p>
                <dl className="grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2 [&>*]:border-border [&>*:not(:nth-last-child(-n+2))]:border-b sm:[&>*:nth-child(odd)]:border-r">
                  {[
                    ["รหัส", values.code || "—"],
                    ["ชื่อสินค้า", values.name || "—"],
                    ["ประเภทสินค้า", nameOf(lookups.productTypes, values.productTypeId)],
                    ["รุ่น", nameOf(lookups.productModels, values.modelId)],
                    ["ลูกค้า", nameOf(lookups.customers, values.customerId)],
                    ["หน่วย", nameOf(lookups.units, values.unitId)],
                    ["สถานที่", nameOf(lookups.locations, values.locationId)],
                    ["ประเภทการจัดส่ง", nameOf(lookups.deliveryTypes, values.deliveryTypeId)],
                    ["จุดขึ้นสินค้า", nameOf(lookups.loadingPoints, values.loadingPointId)],
                    ["สายการผลิต", nameOf(lookups.processLines, values.processLineId)],
                    ["จำนวนต่อแพ็ก", values.packing === "" || values.packing == null ? "—" : String(values.packing)],
                    ["ขนาดล็อต", values.lotSize === "" || values.lotSize == null ? "—" : String(values.lotSize)],
                    ["สต็อกปลอดภัย", values.safetyStock === "" || values.safetyStock == null ? "อัตโนมัติ" : String(values.safetyStock)],
                    ["สต็อกขั้นต่ำ", values.minStock === "" || values.minStock == null ? "อัตโนมัติ" : String(values.minStock)],
                    ["มาตราส่วน", values.scale || "—"],
                    ["รูปภาพ", imageFile ? imageFile.name : isEdit && product?.productImagePath ? "ใช้รูปเดิม" : "ไม่มีรูปภาพ"],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 p-3">
                      <dt className="text-xs text-fg-muted">{label}</dt>
                      <dd className="mt-0.5 break-words text-sm font-medium text-fg">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
            >
              {stepIndex === 0 ? "ยกเลิก" : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" /> ย้อนกลับ
                </>
              )}
            </Button>
            {isLastStep ? (
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={isSubmitting}>
                {isEdit ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มสินค้า"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                ถัดไป <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </DialogFooter>
        </form>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        variant="default"
        title={isEdit ? "ยืนยันการบันทึกการเปลี่ยนแปลง?" : "ยืนยันการสร้างสินค้า?"}
        description={
          isEdit
            ? `ตรวจสอบข้อมูลด้านบนแล้ว — เมื่อยืนยัน ระบบจะบันทึกการเปลี่ยนแปลงของ "${values.name || values.code || "สินค้านี้"}" และให้คุณจัดการ BOM ต่อในขั้นตอนถัดไป`
            : `ตรวจสอบข้อมูลด้านบนแล้ว — เมื่อยืนยัน ระบบจะสร้างสินค้า "${values.name || values.code || "นี้"}" และให้คุณเพิ่มข้อมูล BOM ต่อในขั้นตอนถัดไป`
        }
        confirmLabel={isEdit ? "ยืนยันและบันทึก" : "ยืนยันและสร้าง"}
        onConfirm={() => handleSubmit(onSubmit)()}
      />
    </>
  );
}

export function ProductsWizardDialog({
  open,
  onOpenChange,
  product,
  lookups,
  materials,
  canCreateBom,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  lookups: ProductLookups;
  materials: Material[];
  canCreateBom: boolean;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <ProductsWizardView
          open={open}
          onOpenChange={onOpenChange}
          product={product}
          lookups={lookups}
          materials={materials}
          canCreateBom={canCreateBom}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
