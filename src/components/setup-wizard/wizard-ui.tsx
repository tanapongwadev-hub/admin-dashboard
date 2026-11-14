"use client";

import * as React from "react";
import { nextRowKey, type SetupBomRow, type SetupWorkflowRow } from "@/lib/setup-wizard";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { type CodeAvailability } from "@/hooks/use-code-availability";
import { cn } from "@/lib/utils";

export function Field({ label, htmlFor, required, children, hint, error }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** "สร้างใหม่ / เลือกจากที่มีอยู่" choice — the same radio cards for the product step and every material card. */
export function SourceSwitch<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; title: string; desc: string }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "border-primary bg-primary-soft/50" : "border-border-strong hover:border-primary/60"
            )}
          >
            <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-fg" : "border-border-strong")}>
              {selected && <Check className="size-3" aria-hidden="true" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-fg">{opt.title}</span>
              <span className="block text-xs text-fg-muted">{opt.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Live feedback under a code input (uses role=status so screen readers hear changes). */
export function CodeFeedback({ id, state, label }: { id: string; state: CodeAvailability; label: string }) {
  if (state.status === "idle") return null;
  const map = {
    checking: { text: "กำลังตรวจสอบรหัส…", cls: "text-fg-muted" },
    available: { text: `ใช้${label}นี้ได้`, cls: "text-success" },
    duplicate: { text: `${label}นี้มีอยู่ในระบบแล้ว กรุณาเปลี่ยน`, cls: "text-danger" },
    "duplicate-local": { text: `${label}นี้ซ้ำกับรายการอื่นในฟอร์มนี้`, cls: "text-danger" },
    error: { text: state.message ?? "ตรวจสอบรหัสไม่สำเร็จ", cls: "text-warning" },
  } as const;
  const m = map[state.status];
  return (
    <p id={id} role="status" aria-live="polite" className={cn("mt-1 flex items-center gap-1 text-xs", m.cls)}>
      {state.status === "checking" && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
      {state.status === "available" && <CheckCircle2 className="size-3" aria-hidden="true" />}
      {m.text}
    </p>
  );
}

export function StepHeading({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <p className="text-sm text-fg-muted">{desc}</p>
    </div>
  );
}

export function Notice({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "success" | "danger" }) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "warning" && "border-warning/40 bg-warning-soft text-warning-fg",
        tone === "success" && "border-success/40 bg-success-soft text-success-fg",
        tone === "danger" && "border-danger/40 bg-danger-soft text-danger-fg"
      )}
    >
      {children}
    </p>
  );
}

export function ReviewRow({ label, value, status }: { label: string; value: string; status: "created" | "todo" | "skip" }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
      <dt className="w-24 shrink-0 font-medium text-fg-secondary">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-fg">{value}</dd>
      <Badge variant={status === "created" ? "success" : status === "todo" ? "primary" : "neutral"}>
        {status === "created" ? "สร้างแล้ว" : status === "todo" ? "รอสร้าง" : "ข้าม"}
      </Badge>
    </div>
  );
}

export interface CatalogMaterial {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export const MATERIAL_SOURCE_OPTIONS = [
  { value: "new", title: "สร้างวัสดุใหม่", desc: "กรอกข้อมูลวัสดุใหม่" },
  { value: "existing", title: "เลือกจากวัสดุภายในที่มีอยู่", desc: "ใช้วัสดุเดิม ไม่ต้องสร้างวัสดุ / BOM / Workflow ซ้ำ" },
] as const;

export const blankBomRow = (): SetupBomRow => ({ key: nextRowKey(), materialId: "", unitId: "", quantity: "", wastagePercent: "" });
export const blankStepRow = (): SetupWorkflowRow => ({ key: nextRowKey(), processStepId: "", description: "" });

export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);