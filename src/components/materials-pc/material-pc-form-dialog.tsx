"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { createMaterialPcAction, updateMaterialPcAction } from "@/app/(dashboard)/materials/pc/actions";
import type { Material, MaterialLookups, MaterialShape } from "@/lib/api/materials";

const NONE = "__none__";
const shapes: MaterialShape[] = ["PCS", "PIPE", "SHEET", "COIL"];

const schema = z
  .object({
    code: z.string().min(1, "Code is required").max(50),
    name: z.string().min(1, "Name is required").max(255),
    materialType: z.enum(["PCS", "PIPE", "SHEET", "COIL"]),
    ratio: z.coerce.number().int().min(1).optional().or(z.literal("")),
    unitId: z.string().min(1, "Unit is required"),
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
        message: "Ratio is required for PIPE, SHEET and COIL materials",
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
    }
  }, [open, material, reset]);

  const materialType = watch("materialType");
  const availableSuppliers = lookups.suppliers.filter((s) => !supplierIds.includes(s.id));
  const selectedSuppliers = supplierIds
    .map((id) => lookups.suppliers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s);

  async function onSubmit(input: FormInput) {
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

    const result = isEdit
      ? await updateMaterialPcAction(material!.id, { ...payload, updatedAt: material!.updatedAt })
      : await createMaterialPcAction(payload);

    if (result.status === "success") {
      toast.success(isEdit ? "Material updated" : "Material created", {
        description: `${result.material.name} was saved successfully.`,
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
            <DialogTitle>{isEdit ? "Edit PC material" : "Add PC material"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Update this purchased-component material." : "Add a new purchased-component material."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" placeholder="MAT-0231" {...register("code")} />
                {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Hex Bolt M8x40" {...register("name")} />
                {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Shape</Label>
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
                  Ratio {materialType !== "PCS" && <span className="text-danger">*</span>}
                </Label>
                <Input id="ratio" type="number" min="1" disabled={materialType === "PCS"} {...register("ratio")} />
                {errors.ratio && <p className="text-xs text-danger">{errors.ratio.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Unit</Label>
                <Select value={watch("unitId")} onValueChange={(v) => setValue("unitId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                  <SelectContent>
                    {lookups.units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.nameEn ?? unit.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unitId && <p className="text-xs text-danger">{errors.unitId.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="packingQuantity">Packing quantity</Label>
                <Input id="packingQuantity" type="number" min="1" {...register("packingQuantity")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Delivery type</Label>
                <Select value={watch("deliveryTypeId")} onValueChange={(v) => setValue("deliveryTypeId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {lookups.deliveryTypes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Model</Label>
                <Select value={watch("modelId")} onValueChange={(v) => setValue("modelId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {lookups.models.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Loading point</Label>
                <Select value={watch("loadingPointId")} onValueChange={(v) => setValue("loadingPointId", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {lookups.loadingPoints.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.nameEn ?? item.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="processLineName">Process line</Label>
                <Input id="processLineName" placeholder="Cutting Line 1" {...register("processLineName")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scale">Scale</Label>
                <Input id="scale" placeholder="1:4" {...register("scale")} />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label>Suppliers</Label>
              <div className="flex gap-2">
                <Select value={addSupplierId} onValueChange={setAddSupplierId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Add a supplier..." /></SelectTrigger>
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
                  Add
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
                        aria-label={`Remove ${s.nameEn ?? s.code}`}
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
                <Label htmlFor="specification">Specification</Label>
                <Textarea id="specification" rows={3} {...register("specification")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...register("description")} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save changes" : "Add material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
