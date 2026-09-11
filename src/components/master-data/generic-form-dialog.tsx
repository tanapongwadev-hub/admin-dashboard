"use client";

import * as React from "react";
import { Controller, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Palette } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getEntityFromResult } from "@/lib/master-data/utils";
import type { MasterDataResourceConfig, BaseMasterEntity, MasterDataFieldDef } from "@/lib/master-data/types";

// Generic create/edit dialog, shared by every simple-master resource. The
// zod schema and default values are built at render time from
// `resource.fields` — see AGENTS.md § Master-data generic CRUD page for the
// full writeup of why this is safe. Status items extend the original field
// primitives with a constrained select and a boolean switch; both remain
// descriptor-driven and use the same validation/submission path.

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

// Only reads the field-shape properties, never the TEntity-typed callback
// props (tableRender/heroBadge/detailValue) — typed structurally rather
// than generically so it never trips generic variance checks at call
// sites (a callback-bearing `MasterDataFieldDef<TEntity>` object still
// structurally satisfies this narrower shape).
interface FieldShape {
  type: MasterDataFieldDef["type"];
  label: string;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
}

function buildFieldSchema(field: FieldShape): z.ZodTypeAny {
  switch (field.type) {
    case "number": {
      let schema = z.coerce.number().int(`${field.label}ต้องเป็นจำนวนเต็ม`);
      if (field.min !== undefined) schema = schema.min(field.min, `${field.label}ต้องไม่น้อยกว่า ${field.min}`);
      if (field.max !== undefined) schema = schema.max(field.max, `${field.label}ต้องไม่เกิน ${field.max}`);
      return schema;
    }
    case "boolean":
      return z.boolean();
    case "select": {
      let schema = z.string();
      if (field.required) schema = schema.min(1, `กรุณาเลือก${field.label}`);
      if (field.options?.length) {
        const allowed = new Set(field.options.map((option) => option.value));
        return schema.refine((value) => allowed.has(value), { message: `กรุณาเลือก${field.label}ที่ถูกต้อง` });
      }
      return schema;
    }
    case "color":
      return z
        .string()
        .max(field.maxLength ?? 20, `ค่าสีต้องไม่เกิน ${field.maxLength ?? 20} ตัวอักษร`)
        .refine((v) => v === "" || HEX_COLOR_PATTERN.test(v), {
          message: "รูปแบบสีไม่ถูกต้อง (ใช้ #RGB, #RRGGBB หรือ #RRGGBBAA)",
        })
        .optional();
    case "email":
      return z
        .string()
        .max(field.maxLength ?? 255, `อีเมลต้องไม่เกิน ${field.maxLength ?? 255} ตัวอักษร`)
        .optional()
        .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: "รูปแบบอีเมลไม่ถูกต้อง" });
    default: {
      let schema = z.string();
      if (field.maxLength) schema = schema.max(field.maxLength, `${field.label}ต้องไม่เกิน ${field.maxLength} ตัวอักษร`);
      if (field.required) {
        return schema.min(1, `กรุณากรอก${field.label}`);
      }
      return schema.optional();
    }
  }
}

function buildSchema<TEntity extends BaseMasterEntity>(resource: MasterDataResourceConfig<TEntity>) {
  const shape: Record<string, z.ZodTypeAny> = {
    code: z.string().min(1, "กรุณากรอกรหัส").max(50, "รหัสต้องไม่เกิน 50 ตัวอักษร"),
    nameTh: z
      .string()
      .min(1, "กรุณากรอกชื่อภาษาไทย")
      .max(resource.nameMaxLength ?? 100, `ชื่อต้องไม่เกิน ${resource.nameMaxLength ?? 100} ตัวอักษร`),
    nameEn: z
      .string()
      .max(resource.nameMaxLength ?? 100, `ชื่อต้องไม่เกิน ${resource.nameMaxLength ?? 100} ตัวอักษร`)
      .optional(),
  };
  if (resource.hasDescription !== false) {
    shape.description = z.string().optional();
  }
  for (const field of resource.fields) {
    shape[field.name] = buildFieldSchema(field);
  }
  return z.object(shape);
}

function toDefaultValues<TEntity extends BaseMasterEntity>(
  resource: MasterDataResourceConfig<TEntity>,
  entity?: TEntity | null
): Record<string, unknown> {
  const values: Record<string, unknown> = {
    code: entity?.code ?? "",
    nameTh: entity?.nameTh ?? "",
    nameEn: entity?.nameEn ?? "",
  };
  if (resource.hasDescription !== false) {
    values.description = entity?.description ?? "";
  }
  for (const field of resource.fields) {
    const raw = entity ? (entity as unknown as Record<string, unknown>)[field.name] : undefined;
    if (field.type === "number") {
      values[field.name] = typeof raw === "number" ? raw : (field.defaultNumber ?? 0);
    } else if (field.type === "boolean") {
      values[field.name] = typeof raw === "boolean" ? raw : (field.defaultValue ?? false);
    } else {
      values[field.name] = typeof raw === "string" ? raw : (field.defaultValue ?? "");
    }
  }
  return values;
}

export function GenericMasterDataFormDialog<TEntity extends BaseMasterEntity>({
  resource,
  open,
  onOpenChange,
  entity,
  onSaved,
}: {
  resource: MasterDataResourceConfig<TEntity>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity?: TEntity | null;
  onSaved: () => void;
}) {
  const isEdit = !!entity;
  const schema = React.useMemo(() => buildSchema(resource), [resource]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: toDefaultValues(resource, entity),
    // Validate on every change so an error shown after a failed submit
    // clears the instant a field becomes valid — consistent with every
    // other form dialog in this app (see AGENTS.md § Materials PC).
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      reset(toDefaultValues(resource, entity));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity, reset]);

  async function onSubmit(input: Record<string, unknown>) {
    const values = schema.parse(input) as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      code: String(values.code).trim(),
      nameTh: String(values.nameTh).trim(),
      nameEn: typeof values.nameEn === "string" && values.nameEn.trim() ? values.nameEn.trim() : null,
    };
    if (resource.hasDescription !== false) {
      payload.description =
        typeof values.description === "string" && values.description.trim() ? values.description.trim() : null;
    }
    for (const field of resource.fields) {
      const raw = values[field.name];
      if (field.type === "number" || field.type === "boolean") {
        payload[field.name] = raw;
      } else {
        const str = typeof raw === "string" ? raw.trim() : "";
        payload[field.name] = str ? str : null;
      }
    }

    const result = isEdit
      ? await resource.actions.update(entity!.id, { ...payload, updatedAt: entity!.updatedAt })
      : await resource.actions.create(payload);

    if (result.status === "success") {
      const saved = getEntityFromResult<TEntity>(result, resource.resultKey);
      toast.success(isEdit ? `อัปเดต${resource.entityLabel}แล้ว` : `สร้าง${resource.entityLabel}แล้ว`, {
        description: `บันทึก ${saved?.nameTh ?? String(values.nameTh)} เรียบร้อยแล้ว`,
      });
      onOpenChange(false);
      onSaved();
      return;
    }
    toast.error(result.message);
  }

  const errorsRecord = errors as Record<string, { message?: string } | undefined>;

  function renderField(field: MasterDataFieldDef<TEntity>) {
    const err = errorsRecord[field.name];
    const wrapperClass = cn("flex flex-col gap-1.5", field.fullWidth && "sm:col-span-2");
    const path = field.name as Path<Record<string, unknown>>;

    if (field.type === "select") {
      return (
        <div key={field.name} className={wrapperClass}>
          <Label htmlFor={field.name}>
            {field.label} {field.required && <span className="text-danger">*</span>}
          </Label>
          <Controller
            name={path}
            control={control}
            render={({ field: controllerField }) => (
              <Select value={String(controllerField.value ?? "")} onValueChange={controllerField.onChange}>
                <SelectTrigger
                  id={field.name}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
                >
                  <SelectValue placeholder={field.placeholder ?? `เลือก${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {err ? (
            <p id={`${field.name}-error`} className="text-xs text-danger" role="alert">
              {err.message}
            </p>
          ) : (
            field.hint && <p id={`${field.name}-hint`} className="text-xs text-fg-muted">{field.hint}</p>
          )}
        </div>
      );
    }

    if (field.type === "boolean") {
      return (
        <div key={field.name} className={wrapperClass}>
          <div className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-border-strong bg-surface px-3 py-2">
            <div>
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.hint && <p id={`${field.name}-hint`} className="mt-0.5 text-xs text-fg-muted">{field.hint}</p>}
            </div>
            <Controller
              name={path}
              control={control}
              render={({ field: controllerField }) => (
                <Switch
                  id={field.name}
                  checked={Boolean(controllerField.value)}
                  onCheckedChange={controllerField.onChange}
                  aria-describedby={field.hint ? `${field.name}-hint` : undefined}
                />
              )}
            />
          </div>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.name} className={wrapperClass}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <Textarea id={field.name} rows={3} placeholder={field.placeholder} {...register(path)} />
        </div>
      );
    }

    if (field.type === "color") {
      const value = watch(path);
      return (
        <div key={field.name} className={wrapperClass}>
          <Label htmlFor={field.name}>{field.label}</Label>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border border-border",
                isHexColor(value) ? "" : "bg-surface-2 text-fg-muted"
              )}
              style={isHexColor(value) ? { backgroundColor: value } : undefined}
              aria-hidden="true"
            >
              {!isHexColor(value) && <Palette className="size-4" />}
            </span>
            <Input
              id={field.name}
              placeholder={field.placeholder}
              aria-invalid={err ? true : undefined}
              aria-describedby={err ? `${field.name}-error` : `${field.name}-hint`}
              {...register(path)}
            />
          </div>
          {err ? (
            <p id={`${field.name}-error`} className="text-xs text-danger" role="alert">
              {err.message}
            </p>
          ) : (
            field.hint && (
              <p id={`${field.name}-hint`} className="text-xs text-fg-muted">
                {field.hint}
              </p>
            )
          )}
        </div>
      );
    }

    return (
      <div key={field.name} className={wrapperClass}>
        <Label htmlFor={field.name}>
          {field.label} {field.required && <span className="text-danger">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type === "number" ? "number" : field.type === "email" ? "email" : "text"}
          min={field.type === "number" ? field.min : undefined}
          max={field.type === "number" ? field.max : undefined}
          maxLength={field.type !== "number" ? field.maxLength : undefined}
          placeholder={field.placeholder}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? `${field.name}-error` : field.hint ? `${field.name}-hint` : undefined}
          {...register(path)}
        />
        {err ? (
          <p id={`${field.name}-error`} className="text-xs text-danger" role="alert">
            {err.message}
          </p>
        ) : (
          field.hint && (
            <p id={`${field.name}-hint`} className="text-xs text-fg-muted">
              {field.hint}
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size={resource.dialogSize} className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
          <DialogHeader>
            <DialogTitle>{isEdit ? `แก้ไข${resource.entityLabel}` : `เพิ่ม${resource.entityLabel}`}</DialogTitle>
            <DialogDescription>
              {isEdit ? `แก้ไขข้อมูล${resource.entityLabel}นี้` : `เพิ่ม${resource.entityLabel}ใหม่เข้าสู่ระบบ`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="code">
                  รหัส <span className="text-danger">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder={resource.codePlaceholder}
                  aria-invalid={errorsRecord.code ? true : undefined}
                  aria-describedby={errorsRecord.code ? "code-error" : undefined}
                  {...register("code")}
                />
                {errorsRecord.code && (
                  <p id="code-error" className="text-xs text-danger" role="alert">
                    {errorsRecord.code.message}
                  </p>
                )}
                <p className="text-xs text-fg-muted">ระบบจะปรับเป็นตัวพิมพ์ใหญ่ให้อัตโนมัติ</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameTh">
                  ชื่อ (ไทย) <span className="text-danger">*</span>
                </Label>
                <Input
                  id="nameTh"
                  placeholder={resource.nameThPlaceholder}
                  aria-invalid={errorsRecord.nameTh ? true : undefined}
                  aria-describedby={errorsRecord.nameTh ? "nameTh-error" : undefined}
                  {...register("nameTh")}
                />
                {errorsRecord.nameTh && (
                  <p id="nameTh-error" className="text-xs text-danger" role="alert">
                    {errorsRecord.nameTh.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nameEn">ชื่อ (อังกฤษ)</Label>
                <Input
                  id="nameEn"
                  placeholder={resource.nameEnPlaceholder}
                  aria-invalid={errorsRecord.nameEn ? true : undefined}
                  aria-describedby={errorsRecord.nameEn ? "nameEn-error" : undefined}
                  {...register("nameEn")}
                />
                {errorsRecord.nameEn && (
                  <p id="nameEn-error" className="text-xs text-danger" role="alert">
                    {errorsRecord.nameEn.message}
                  </p>
                )}
              </div>

              {resource.fields.map((field) => renderField(field))}

              {resource.hasDescription !== false && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea id="description" rows={3} placeholder={resource.descriptionPlaceholder} {...register("description")} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : `สร้าง${resource.entityLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
