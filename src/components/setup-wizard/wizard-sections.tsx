"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ImagePlus, FolderOpen, Loader2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MasterDataSelect, type MasterDataSelectOption } from "@/components/ui/master-data-select";
import Image from "next/image";
import { uploadMaterialPcImageAction } from "@/app/(dashboard)/materials/catalog/actions";
import { checkMaterialCodeAction } from "@/app/(dashboard)/materials/catalog/actions";
import type { Material } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";
import { materialFieldErrors } from "@/lib/setup-wizard";
import { useCodeAvailability } from "@/hooks/use-code-availability";
import type { BomOverview } from "@/lib/api/bom-overview";
import type { SetupDraftSummary } from "@/lib/api/setup-wizard";
import { SETUP_STEPS, type SetupMode, type SetupBomRow, type SetupMaterialData, type SetupWorkflowRow } from "@/lib/setup-wizard";
import { cn } from "@/lib/utils";
import { Field, SourceSwitch, CodeFeedback, StepHeading, Notice, blankBomRow, blankStepRow, type CatalogMaterial, MATERIAL_SOURCE_OPTIONS, IMAGE_TYPES } from "./wizard-ui";
import { BomWorkList } from "./bom-work-list";
import type { ManageCan } from "./setup-wizard-client";

const IMAGE_MAX = 5 * 1024 * 1024;

type UploadResult = { status: "success"; image: { imagePath: string } } | { status: "error"; message: string };

export function StepRail({ current, done, visible, labels, onSelect }: { current: number; done: boolean[]; visible: number[]; labels: string[]; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="ขั้นตอนการสร้างครบชุด" className="rounded-lg border border-border bg-surface px-3 py-3 sm:px-5">
      <ol className="flex items-center">
        {visible.map((index, pos) => {
          const state = index === current ? "active" : done[index] ? "done" : "upcoming";
          return (
            <li key={SETUP_STEPS[index].id} className={cn("flex items-center", pos < visible.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={state === "active" ? "step" : undefined}
                className="flex shrink-0 items-center gap-2 rounded-md py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    state === "done" && "bg-success text-white",
                    state === "active" && "bg-primary text-primary-fg",
                    state === "upcoming" && "bg-surface-2 text-fg-muted"
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : pos + 1}
                </span>
                <span className={cn("text-sm font-medium", state === "active" ? "text-fg" : "hidden text-fg-secondary sm:block")}>{labels[index]}</span>
              </button>
              {pos < visible.length - 1 && <span className={cn("mx-2 h-px flex-1 sm:mx-3", state === "done" ? "bg-success" : "bg-border")} aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ExistingMaterialList({
  materials,
  usedIds,
  unitLabel,
  onAdd,
}: {
  materials: CatalogMaterial[];
  usedIds: string[];
  unitLabel: (unitId: string) => string;
  onAdd: (material: CatalogMaterial) => void;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const shown = materials.filter((m) => !q || m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  return (
    <section className="rounded-lg border border-border" aria-label="รายการวัสดุที่มีอยู่">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <p className="text-sm font-medium text-fg">วัสดุที่มีอยู่แล้ว ({shown.length}/{materials.length})</p>
        <Input aria-label="ค้นหาวัสดุ" placeholder="ค้นหารหัสหรือชื่อ" className="h-8 w-full sm:w-56" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {shown.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-fg-muted">
          {materials.length === 0 ? (
            <>
              ยังไม่มีวัสดุที่เปิดใช้งาน —{" "}
              <Link href="/materials/catalog" className="text-primary underline">ไปที่ทะเบียนวัสดุ</Link>
            </>
          ) : (
            "ไม่พบวัสดุ"
          )}
        </p>
      ) : (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {shown.map((m) => {
            const used = usedIds.includes(m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{m.code}</p>
                  <p className="truncate text-xs text-fg-muted">{m.name}{unitLabel(m.unitId) ? ` · ${unitLabel(m.unitId)}` : ""}</p>
                </div>
                <Button type="button" size="sm" variant={used ? "ghost" : "outline"} disabled={used} onClick={() => onAdd(m)}>
                  {used ? "อยู่ใน BOM แล้ว" : "เพิ่มใน BOM"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function MaterialCard({
  m,
  index,
  onPatch,
  onRemove,
  unitOptions,
  supplierOptions,
  materialTypeOptions,
  stepOptions,
  componentOptions,
  catalog,
  canEngineer,
  otherCodes,
  showErrors,
  ownerMode,
}: {
  m: SetupMaterialData;
  index: number;
  onPatch: (patch: Partial<SetupMaterialData>) => void;
  onRemove?: () => void;
  unitOptions: MasterDataSelectOption[];
  supplierOptions: MasterDataSelectOption[];
  materialTypeOptions: MasterDataSelectOption[];
  stepOptions: MasterDataSelectOption[];
  componentOptions: MasterDataSelectOption[];
  catalog: CatalogMaterial[];
  canEngineer: boolean;
  otherCodes: string[];
  showErrors: boolean;
  /** Material mode step 1: the typed-in owner — always internal, no source switch, no BOM / Workflow here (steps 3 and 4). */
  ownerMode?: boolean;
}) {
  const fe = showErrors ? materialFieldErrors(m) : {};
  const id = (name: string) => `sw-m-${name}-${m.key}`;
  const codeState = useCodeAvailability(m.code, checkMaterialCodeAction, otherCodes);
  return (
    <section className="rounded-lg border border-border" aria-label={`วัสดุใหม่ที่ ${index + 1}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-soft/50 px-3 py-2">
        <p className="text-sm font-semibold text-fg">
          {ownerMode ? "วัสดุภายในใหม่" : `วัสดุใหม่ที่ ${index + 1}`}
          {m.code.trim() && <span className="ml-2 font-normal text-fg-muted">{m.code.trim()}</span>}
        </p>
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" aria-label={`ลบวัสดุใหม่ที่ ${index + 1}`} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <Field label="รหัสวัสดุ" htmlFor={id("code")} required error={fe.code}>
          <Input id={id("code")} maxLength={50} value={m.code} aria-invalid={codeState.status === "duplicate" || codeState.status === "duplicate-local"} aria-describedby={codeState.status === "idle" ? undefined : id("code-status")} onChange={(e) => onPatch({ code: e.target.value })} />
          <CodeFeedback id={id("code-status")} state={codeState} label="รหัสวัสดุ" />
        </Field>
        <Field label="ชื่อวัสดุ" htmlFor={id("name")} required error={fe.name}>
          <Input id={id("name")} maxLength={255} value={m.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </Field>
        <Field label="หน่วย" required error={fe.unitId}>
          <MasterDataSelect options={unitOptions} value={m.unitId} onValueChange={(v) => onPatch({ unitId: v })} placeholder="เลือกหน่วย" href="/master-data/units" resourceLabel="หน่วย" />
        </Field>
        <Field label="ประเภทวัสดุ" required error={fe.materialTypeId}>
          <MasterDataSelect options={materialTypeOptions} value={m.materialTypeId} onValueChange={(v) => onPatch({ materialTypeId: v })} placeholder="เลือกประเภท" href="/master-data/material-types" resourceLabel="ประเภทวัสดุ" />
        </Field>
        {!ownerMode && (
        <Field label="Location Type">
          <MasterDataSelect
            options={[{ id: "external", label: "ภายนอก (External)" }, { id: "internal", label: "ภายใน (Internal)" }]}
            value={m.locationType}
            onValueChange={(v) => {
              const internal = v === "internal";
              onPatch({
                locationType: internal ? "internal" : "external",
                // In-house materials need a BOM + Workflow — open one blank row of each.
                ...(internal && m.bomRows.length === 0 ? { bomRows: [blankBomRow()] } : {}),
                ...(internal && m.workflowRows.length === 0 ? { workflowRows: [blankStepRow()] } : {}),
              });
            }}
            placeholder="เลือก" href="/materials/catalog" resourceLabel="Location Type"
          />
        </Field>
        )}
        <Field label="จำนวนต่อแพ็ก" htmlFor={id("pack")} required error={fe.packingQuantity}>
          <Input id={id("pack")} type="number" min={1} max={1000000} step={1} inputMode="numeric" aria-invalid={!!fe.packingQuantity} value={m.packingQuantity} onChange={(e) => onPatch({ packingQuantity: e.target.value })} />
        </Field>
        <Field label="สต็อกขั้นต่ำ" htmlFor={id("min")} error={fe.minimumStock}>
          <Input id={id("min")} type="number" min={0} value={m.minimumStock} onChange={(e) => onPatch({ minimumStock: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ซัพพลายเออร์" required error={fe.suppliers} hint="เพิ่มได้หลายราย — ต้องมีอย่างน้อย 1 รายจึงจะรับเข้าได้">
            <MasterDataSelect
              options={supplierOptions.filter((o) => !m.supplierIds.includes(o.id))}
              value=""
              onValueChange={(v) => onPatch({ supplierIds: [...m.supplierIds, v] })}
              placeholder="เลือกเพื่อเพิ่มซัพพลายเออร์" href="/master-data/suppliers" resourceLabel="ซัพพลายเออร์"
            />
            <div className="mt-1 flex flex-wrap gap-1.5">
              {m.supplierIds.map((sid) => (
                <Badge key={sid} variant="neutral" className="gap-1">
                  {supplierOptions.find((o) => o.id === sid)?.label ?? sid}
                  <button type="button" aria-label="เอาออก" onClick={() => onPatch({ supplierIds: m.supplierIds.filter((x) => x !== sid) })}>
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ImageField
            id={id("image")}
            label="รูปภาพวัสดุ"
            required
            errorText={fe.image}
            path={m.imagePath}
            onChange={(imagePath) => onPatch({ imagePath })}
            upload={uploadMaterialPcImageAction}
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="ข้อกำหนดเฉพาะ (ไม่บังคับ)" htmlFor={id("spec")}>
            <Textarea id={id("spec")} rows={2} value={m.specification} onChange={(e) => onPatch({ specification: e.target.value })} />
          </Field>
        </div>
        {m.locationType === "internal" && !ownerMode && (
          <InternalProcess m={m} onPatch={onPatch} unitOptions={unitOptions} stepOptions={stepOptions} componentOptions={componentOptions} catalog={catalog} canEngineer={canEngineer} />
        )}
      </div>
    </section>
  );
}

/** Picks an in-house material that already exists (select box). Nothing is created for it: it already has its BOM / Workflow. */
export function ExistingInternalCard({
  m,
  index,
  onPatch,
  onRemove,
  candidates,
}: {
  m: SetupMaterialData;
  index: number;
  onPatch: (patch: Partial<SetupMaterialData>) => void;
  onRemove?: () => void;
  candidates: Material[];
}) {
  return (
    <section className="rounded-lg border border-border" aria-label={`วัสดุภายในที่มีอยู่ที่ ${index + 1}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-success-soft/50 px-3 py-2">
        <p className="text-sm font-semibold text-fg">
          วัสดุภายในที่มีอยู่ที่ {index + 1}
          {m.code.trim() && <span className="ml-2 font-normal text-fg-muted">{m.code.trim()}</span>}
        </p>
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" aria-label={`ลบวัสดุที่ ${index + 1}`} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SourceSwitch
            label="แหล่งที่มาของวัสดุ"
            value="existing"
            options={MATERIAL_SOURCE_OPTIONS}
            onChange={() => onPatch({ source: "new", existingId: undefined, code: "", name: "", unitId: "", locationType: "external" })}
          />
        </div>
        <div className="sm:col-span-2">
          <Field label="วัสดุ" required hint="เลือกจากวัสดุที่มีอยู่ทุกประเภท ค้นหาด้วยรหัสหรือชื่อ — วัสดุที่เลือกจะนำไปใช้เป็นส่วนประกอบใน BOM ได้">
            {candidates.length === 0 && !m.existingId ? (
              <Notice>ไม่มีวัสดุภายในที่เลือกได้ — เพิ่มที่ทะเบียนวัสดุ หรือใช้ “เพิ่มวัสดุใหม่” แทน</Notice>
            ) : (
              <MasterDataSelect
                options={candidates.map((x) => ({ id: x.id, label: `${x.code} · ${x.name}` }))}
                value={m.existingId ?? ""}
                onValueChange={(id) => {
                  const picked = candidates.find((x) => x.id === id);
                  onPatch({ existingId: id, code: picked?.code ?? "", name: picked?.name ?? "", unitId: picked?.unitId ?? m.unitId, locationType: "internal" });
                }}
                placeholder="เลือกวัสดุภายใน" href="/materials/catalog" resourceLabel="วัสดุภายใน"
              />
            )}
          </Field>
        </div>
      </div>
    </section>
  );
}

/** BOM + Workflow of an in-house (Location Type = ภายใน) material. */
export function InternalProcess({
  m,
  onPatch,
  unitOptions,
  stepOptions,
  componentOptions,
  catalog,
  canEngineer,
}: {
  m: SetupMaterialData;
  onPatch: (patch: Partial<SetupMaterialData>) => void;
  unitOptions: MasterDataSelectOption[];
  stepOptions: MasterDataSelectOption[];
  componentOptions: MasterDataSelectOption[];
  catalog: CatalogMaterial[];
  canEngineer: boolean;
}) {
  const updateBom = (key: number, patch: Partial<SetupBomRow>) =>
    onPatch({ bomRows: m.bomRows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const updateStep = (key: number, patch: Partial<SetupWorkflowRow>) =>
    onPatch({ workflowRows: m.workflowRows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  const moveStep = (index: number, delta: number) => {
    const rows = [...m.workflowRows];
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    onPatch({ workflowRows: rows });
  };
  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <Notice tone={canEngineer ? "warning" : "danger"}>
        {canEngineer
          ? "วัสดุภายใน (ผลิตเอง) ต้องมี BOM และ Workflow ของวัสดุนี้ — ระบบจะสร้างให้พร้อมกับวัสดุ"
          : "วัสดุภายในต้องมี BOM และ Workflow แต่บัญชีของคุณไม่มีสิทธิ์สร้าง — เปลี่ยน Location Type เป็นภายนอก หรือขอสิทธิ์เพิ่ม"}
      </Notice>

      <div className="flex flex-col gap-3">
        <StepHeading title="BOM ของวัสดุนี้" desc="รายการวัตถุดิบที่ใช้ต่อวัสดุ 1 หน่วย" />
        {m.bomRows.map((row, index) => {
          const options = componentOptions.filter((o) => o.id === row.materialId || !m.bomRows.some((r) => r.materialId === o.id));
          return (
            <div key={row.key} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_7rem_7rem_auto] sm:items-end">
              <Field label={`รายการที่ ${index + 1} · วัตถุดิบ`}>
                <MasterDataSelect
                  options={options}
                  value={row.materialId}
                  onValueChange={(v) => {
                    const picked = catalog.find((c) => c.id === v);
                    updateBom(row.key, { materialId: v, unitId: picked?.unitId ?? (row.unitId || m.unitId) });
                  }}
                  placeholder="เลือกวัตถุดิบ" href="/materials/catalog" resourceLabel="วัตถุดิบ"
                />
              </Field>
              <Field label="หน่วย">
                <MasterDataSelect options={unitOptions} value={row.unitId} onValueChange={(v) => updateBom(row.key, { unitId: v })} placeholder="หน่วย" href="/master-data/units" resourceLabel="หน่วย" />
              </Field>
              <Field label="จำนวน" htmlFor={`sw-mb-q-${row.key}`}>
                <Input id={`sw-mb-q-${row.key}`} type="number" min={0} step="any" value={row.quantity} onChange={(e) => updateBom(row.key, { quantity: e.target.value })} />
              </Field>
              <Field label="สูญเสีย %" htmlFor={`sw-mb-w-${row.key}`}>
                <Input id={`sw-mb-w-${row.key}`} type="number" min={0} max={100} step="any" value={row.wastagePercent} onChange={(e) => updateBom(row.key, { wastagePercent: e.target.value })} />
              </Field>
              <Button type="button" size="icon" variant="ghost" aria-label="ลบรายการ" onClick={() => onPatch({ bomRows: m.bomRows.filter((r) => r.key !== row.key) })}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" className="self-start" onClick={() => onPatch({ bomRows: [...m.bomRows, blankBomRow()] })}>
          <Plus className="size-4" aria-hidden="true" /> เพิ่มรายการ
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <StepHeading title="Workflow ของวัสดุนี้" desc="ลำดับขั้นตอนการผลิตของวัสดุ" />
        {stepOptions.length === 0 && <Notice>ยังไม่มีข้อมูลกระบวนการผลิต หรือคุณไม่มีสิทธิ์ดู — ต้องมีที่ ข้อมูลพื้นฐาน › กระบวนการผลิต ก่อน</Notice>}
        {m.workflowRows.map((row, index) => {
          const options = stepOptions.filter((o) => o.id === row.processStepId || !m.workflowRows.some((r) => r.processStepId === o.id));
          return (
            <div key={row.key} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[2.5rem_1fr_1fr_auto] sm:items-end">
              <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success-fg">{index + 1}</span>
              <Field label="กระบวนการ">
                <MasterDataSelect options={options} value={row.processStepId} onValueChange={(v) => updateStep(row.key, { processStepId: v })} placeholder="เลือกกระบวนการ" href="/master-data/process-steps" resourceLabel="กระบวนการผลิต" />
              </Field>
              <Field label="รายละเอียด (ไม่บังคับ)" htmlFor={`sw-mw-d-${row.key}`}>
                <Input id={`sw-mw-d-${row.key}`} value={row.description} onChange={(e) => updateStep(row.key, { description: e.target.value })} />
              </Field>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => moveStep(index, -1)}>↑</Button>
                <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนลง" disabled={index === m.workflowRows.length - 1} onClick={() => moveStep(index, 1)}>↓</Button>
                <Button type="button" size="icon" variant="ghost" aria-label="ลบขั้นตอน" onClick={() => onPatch({ workflowRows: m.workflowRows.filter((r) => r.key !== row.key) })}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" className="self-start" onClick={() => onPatch({ workflowRows: [...m.workflowRows, blankStepRow()] })}>
          <Plus className="size-4" aria-hidden="true" /> เพิ่มขั้นตอน
        </Button>
      </div>
    </div>
  );
}

/** Picks an image, stages it on the server right away, and keeps only the staged path in the form. */
export function ImageField({
  id,
  label,
  path,
  onChange,
  upload,
  required,
  errorText,
}: {
  id: string;
  label: string;
  required?: boolean;
  errorText?: string;
  path: string | null;
  onChange: (path: string | null) => void;
  upload: (formData: FormData) => Promise<UploadResult>;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) return setError("รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP");
    if (file.size > IMAGE_MAX) return setError("รูปภาพต้องมีขนาดไม่เกิน 5 MiB");
    setError(null);
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await upload(formData);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (result.status === "error") return setError(result.message);
    onChange(result.image.imagePath);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3", errorText ? "border-danger" : "border-border-strong")}>
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2">
          {busy ? (
            <Loader2 className="size-5 animate-spin text-fg-muted" aria-hidden="true" />
          ) : path ? (
            <Image src={path} alt="ตัวอย่างรูปภาพที่เลือก" fill unoptimized loading="eager" sizes="80px" className="object-contain p-1" />
          ) : (
            <ImagePlus className="size-6 text-fg-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              {path ? "เปลี่ยนรูป" : "เลือกรูปภาพ"}
            </Button>
            {path && (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange(null)}>
                เอารูปออก
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-muted">JPEG, PNG หรือ WebP · สูงสุด 5 MiB</p>
          {(error ?? errorText) && (
            <p role="alert" className="text-xs text-danger">
              {error ?? errorText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Landing of the work page: spot what is incomplete, open one item, create something new. */
export function ModeChooser({
  onPick,
  drafts,
  details,
  products,
  materials,
  processSteps,
  manage,
  onDeleteDraft,
}: {
  onPick: (mode: SetupMode) => void;
  onDeleteDraft: (draft: SetupDraftSummary) => void;
  drafts: SetupDraftSummary[];
  details: BomOverview;
  products: Array<{ id: string; code: string; name: string }>;
  materials: Material[];
  processSteps: ProcessStep[];
  manage: ManageCan;
}) {
  return (
    <div className="flex flex-col gap-4">
      {drafts.length > 0 && (
        <details className="group rounded-xl border border-warning/40 bg-warning-soft/40">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
            <FolderOpen className="size-4 text-warning-fg" aria-hidden="true" />
            มีร่างที่ยังทำไม่เสร็จ {drafts.length} รายการ
            <span className="ml-auto text-xs font-normal text-fg-secondary group-open:hidden">กดเพื่อดู</span>
          </summary>
          <DraftList drafts={drafts} onDelete={onDeleteDraft} className="rounded-t-none border-0 border-t border-border bg-transparent" />
        </details>
      )}
      <BomWorkList onCreate={onPick} details={details} products={products} materials={materials} processSteps={processSteps} manage={manage} />
    </div>
  );
}

/** Saved drafts with resume / delete (landing page and next to the wizard). */
export function DraftList({
  drafts,
  activeId,
  onDelete,
  className,
}: {
  drafts: SetupDraftSummary[];
  activeId?: string;
  onDelete: (draft: SetupDraftSummary) => void;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface", className)} aria-label="ร่างของฉัน">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-lg font-semibold text-fg">
        <FolderOpen className="size-4 text-primary" aria-hidden="true" /> ร่างของฉัน
        <Badge variant="neutral" className="ml-auto">{drafts.length}</Badge>
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {drafts.map((draft) => (
          <li key={draft.id} className={cn("flex items-start gap-2 px-4 py-2.5", activeId === draft.id && "bg-primary-soft/50")}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{draft.title || "ร่างที่ยังไม่ตั้งชื่อ"}</p>
              <p className="text-xs text-fg-muted">
                {SETUP_STEPS[draft.step]?.label} ·{" "}
                {new Date(draft.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
            {activeId === draft.id ? (
              <Badge variant="primary" className="shrink-0">กำลังแก้ไข</Badge>
            ) : (
              <Button size="sm" variant="outline" className="shrink-0" asChild>
                <Link href={`/engineering/setup?draft=${draft.id}`}>ทำต่อ</Link>
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              aria-label={`ลบร่าง ${draft.title || "ที่ยังไม่ตั้งชื่อ"}`}
              onClick={() => onDelete(draft)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
