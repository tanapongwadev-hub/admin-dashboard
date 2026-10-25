"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Package, Check, ImagePlus, ChevronLeft, ChevronRight, CheckCircle2, FolderOpen, Loader2, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MasterDataSelect, type MasterDataSelectOption } from "@/components/ui/master-data-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { uploadMaterialPcImageAction } from "@/app/(dashboard)/materials/catalog/actions";
import { uploadProductImageAction } from "@/app/(dashboard)/engineering/products/actions";
import { checkMaterialCodeAction } from "@/app/(dashboard)/materials/catalog/actions";
import {
  deleteSetupDraftAction,
  runSetupAction,
  saveSetupDraftAction,
  checkProductCodeAction,
} from "@/app/(dashboard)/engineering/setup/actions";
import type { Material, MaterialLookups } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";
import type { EngineeringKind, EngineeringScope, EngineeringVersion } from "@/lib/api/engineering";
import { deleteEngineeringAction, engineeringHistoryAction } from "@/app/(dashboard)/engineering/bom/actions";
import { materialFieldErrors } from "@/lib/setup-wizard";
import { useCodeAvailability, type CodeAvailability } from "@/hooks/use-code-availability";
import { OwnerDetail } from "@/components/bom-overview/bom-overview-client";
import type { BomOverview } from "@/lib/api/bom-overview";
import { EngineeringFormDialog } from "@/components/engineering/engineering-form-dialog";
import type { ProductLookupItem, ProductLookups } from "@/lib/api/products";
import type { SetupDraftRecord, SetupDraftSummary, SetupOverview } from "@/lib/api/setup-wizard";
import {
  emptyMaterial,
  emptyOwnerMaterial,
  ownerInfo,
  isNewMaterialRef,
  newMaterialKey,
  newMaterialRef,
  SETUP_STEPS,
  stepLabels,
  visibleSteps,
  type SetupMode,
  emptySetupData,
  nextRowKey,
  resetRowKeys,
  setupDraftTitle,
  validateSetupStep,
  type SetupData,
  type SetupBomRow,
  type SetupMaterialData,
  type SetupWorkflowRow,
} from "@/lib/setup-wizard";
import { cn } from "@/lib/utils";

interface CatalogMaterial {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export type ManageCan = Record<"products" | "materials", { bom: boolean; workflow: boolean }>;

interface Props {
  materialLookups: MaterialLookups;
  productLookups: ProductLookups;
  /** Active products that can be picked instead of creating a new one. */
  products: Array<{ id: string; code: string; name: string }>;
  materials: Material[];
  processSteps: ProcessStep[];
  manage: ManageCan;
  drafts: SetupDraftSummary[];
  overview: SetupOverview;
  details: BomOverview;
  initialDraft: SetupDraftRecord | null;
  can: {
    material: boolean;
    product: boolean;
    bom: boolean;
    workflow: boolean;
    materialBom: boolean;
    materialWorkflow: boolean;
    activateBom: boolean;
    activateWorkflow: boolean;
  };
}

function toOptions(items: Array<{ id: string; code: string; nameTh?: string; nameEn?: string | null }>): MasterDataSelectOption[] {
  return items.map((item) => ({ id: item.id, label: `${item.code} · ${item.nameTh || item.nameEn || ""}`.replace(/ · $/, "") }));
}
const productOptions = (items: ProductLookupItem[]) => toOptions(items);

function hydrateMaterials(raw: Record<string, unknown>, base: SetupData): SetupMaterialData[] {
  const list = raw.materials as Partial<SetupMaterialData>[] | undefined;
  if (Array.isArray(list) && list.length) return list.map((m) => ({ ...emptyMaterial(), ...m, key: m.key ?? nextRowKey() }));
  const legacy = raw.material as Partial<SetupMaterialData> | undefined;
  if (legacy) return [{ ...emptyMaterial(), ...legacy }];
  return base.materials;
}

function migrateCreated(raw: Record<string, unknown>): SetupData["created"] {
  const created = (raw.created ?? {}) as SetupData["created"] & { materialId?: string };
  if (created.materialId && !created.materialIds) {
    const key = hydrateMaterials(raw, emptySetupData())[0]?.key ?? 0;
    return { ...created, materialIds: { [String(key)]: created.materialId } };
  }
  return created;
}

/** Restores a saved draft on top of the defaults so missing/older fields never crash the form. */
function maxKey(raw: Record<string, unknown> | undefined): number {
  if (!raw) return 0;
  const keys: number[] = [];
  for (const list of [raw.materials, raw.bomRows, raw.workflowRows]) {
    if (Array.isArray(list)) for (const item of list) if (typeof item?.key === "number") keys.push(item.key);
  }
  const ownerKey = (raw.ownerNew as { key?: unknown } | undefined)?.key;
  if (typeof ownerKey === "number") keys.push(ownerKey);
  return Math.max(0, ...keys);
}

function hydrate(raw: Record<string, unknown> | undefined): SetupData {
  resetRowKeys(maxKey(raw));
  const base = emptySetupData();
  if (!raw) return base;
  const r = raw as Partial<SetupData>;
  return {
    ...base,
    ...r,
    materials: hydrateMaterials(raw, base),
    product: { ...base.product, ...(r.product ?? {}) },
    bomRows: r.bomRows?.length ? r.bomRows : base.bomRows,
    workflowRows: r.workflowRows?.length ? r.workflowRows : base.workflowRows,
    materialsEnabled:
      typeof r.materialsEnabled === "boolean"
        ? r.materialsEnabled
        : (raw.material as { enabled?: boolean } | undefined)?.enabled !== false,
    mode: r.mode ?? "product",
    created: migrateCreated(raw),
  };
}

function Field({ label, htmlFor, required, children, hint, error }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode; hint?: string; error?: string }) {
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
function SourceSwitch<T extends string>({
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

const MATERIAL_SOURCE_OPTIONS = [
  { value: "new", title: "สร้างวัสดุใหม่", desc: "กรอกข้อมูลวัสดุใหม่" },
  { value: "existing", title: "เลือกจากวัสดุภายในที่มีอยู่", desc: "ใช้วัสดุเดิม ไม่ต้องสร้างวัสดุ / BOM / Workflow ซ้ำ" },
] as const;

function StepRail({ current, done, visible, labels, onSelect }: { current: number; done: boolean[]; visible: number[]; labels: string[]; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="ขั้นตอนการสร้างครบชุด" className="rounded-xl border border-border bg-surface px-3 py-3 sm:px-5">
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

export function SetupWizardClient({ materialLookups, productLookups, products, materials, processSteps, drafts, details, initialDraft, can, manage }: Props) {
  const router = useRouter();
  const [data, setData] = React.useState<SetupData>(() => hydrate(initialDraft?.data));
  const [step, setStep] = React.useState(initialDraft?.step ?? 0);
  const [draftRef, setDraftRef] = React.useState<{ id: string; updatedAt: string } | null>(
    initialDraft ? { id: initialDraft.id, updatedAt: initialDraft.updatedAt } : null
  );
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<SetupDraftSummary | null>(null);

  const patchMaterial = (key: number, patch: Partial<SetupMaterialData>) =>
    setData((d) => ({ ...d, materials: d.materials.map((m) => (m.key === key ? { ...m, ...patch } : m)) }));
  const patchProduct = (patch: Partial<SetupData["product"]>) => setData((d) => ({ ...d, product: { ...d.product, ...patch } }));

  const mode = data.mode;
  const visible = visibleSteps(mode);
  const labels = stepLabels(mode);
  const materialMode = mode === "material";
  const ownerSourceValue = data.ownerSource ?? "existing";
  const canBom = materialMode ? can.materialBom : can.bom;
  const canWorkflow = materialMode ? can.materialWorkflow : can.workflow;
  const hasInternalMaterial = data.materialsEnabled && data.materials.some((m) => m.locationType === "internal");
  const materialCan = { materialBom: can.materialBom, materialWorkflow: can.materialWorkflow };
  const stepErrors = SETUP_STEPS.map((_, i) => (i < 4 ? validateSetupStep(i, data, materialCan) : null));
  const done = SETUP_STEPS.map((_, i) => i < 4 && visible.indexOf(i) !== -1 && visible.indexOf(i) < visible.indexOf(step) && stepErrors[i] === null);

  const unitOptions = toOptions(materialLookups.units);
  const supplierOptions = toOptions(materialLookups.suppliers);
  const materialTypeOptions = toOptions(materialLookups.materialTypes);
  const stepOptions: MasterDataSelectOption[] = processSteps.map((s) => ({ id: s.id, label: `${s.code} · ${s.nameTh}` }));
  const productUnitOptions = productOptions(productLookups.units);

  const newMaterialOptions: MasterDataSelectOption[] = data.materialsEnabled
    ? data.materials
        .filter((m) => m.code.trim())
        .map((m) => ({ id: newMaterialRef(m.key), label: `${m.code.trim()} · ${m.name.trim()} (ใหม่)` }))
    : [];
  const createdMaterialCount = Object.keys(data.created.materialIds ?? {}).length;
  const existingMaterialCount = data.materials.filter((m) => m.source === "existing" && data.created.materialIds?.[m.key]).length;
  /** In-house materials already in the system that can get a BOM + Workflow here. */
  const internalCatalog = materials.filter((x) => x.locationType === "internal" && !["PIPE", "SHEET", "COIL"].includes(x.materialType));

  const persistDraft = React.useCallback(
    async (nextData: SetupData, nextStep: number, silent = false) => {
      setSavingDraft(true);
      const result = await saveSetupDraftAction({
        id: draftRef?.id,
        updatedAt: draftRef?.updatedAt,
        title: setupDraftTitle(nextData),
        step: nextStep,
        data: nextData as unknown as Record<string, unknown>,
      });
      setSavingDraft(false);
      if (result.status === "error") {
        toast.error(result.message);
        return false;
      }
      setDraftRef({ id: result.draft.id, updatedAt: result.draft.updatedAt });
      if (!silent) toast.success("บันทึกร่างแล้ว — กลับมาทำต่อได้จากรายการร่างด้านบน");
      return true;
    },
    [draftRef]
  );

  /** Message when a new material code is already used in the system (checked before creating). */
  async function findTakenMaterialCode(): Promise<string | null> {
    const list = data.materialsEnabled ? [...data.materials] : [];
    if (data.mode === "material" && data.ownerSource === "new" && data.ownerNew) list.unshift(data.ownerNew);
    if (list.length === 0) return null;
    const seen = new Set<string>();
    for (const m of list) {
      if (data.created.materialIds?.[m.key] || m.source === "existing" || !m.code.trim()) continue;
      const lower = m.code.trim().toLowerCase();
      if (seen.has(lower)) return `รหัสวัสดุ "${m.code.trim()}" ซ้ำกันในฟอร์มนี้ กรุณาเปลี่ยนรหัส`;
      seen.add(lower);
      const result = await checkMaterialCodeAction(m.code);
      if (result.status === "error") return result.message;
      if (!result.available) return `รหัสวัสดุ "${m.code.trim()}" มีอยู่ในระบบแล้ว กรุณาเปลี่ยนรหัส`;
    }
    return null;
  }

  /** Message when the product code is already used (checked before moving on / creating). */
  async function findTakenProductCode(): Promise<string | null> {
    if (data.mode === "material" || data.created.productId || data.product.source === "existing" || !data.product.code.trim()) return null;
    const result = await checkProductCodeAction(data.product.code);
    if (result.status === "error") return result.message;
    return result.available ? null : `รหัสสินค้า "${data.product.code.trim()}" มีอยู่ในระบบแล้ว กรุณาเปลี่ยนรหัส`;
  }

  const [checking, setChecking] = React.useState(false);
  /** Show per-field errors under the material inputs once the user has tried to continue. */
  const [attempted, setAttempted] = React.useState(false);
  const productCodeState = useCodeAvailability(
    data.product.code,
    checkProductCodeAction,
    [],
    data.mode !== "material" && !data.created.productId && data.product.source !== "existing"
  );

  /** Entering the BOM step: pre-fill rows with the new materials from step 1 (once each). */
  function seedBomRows() {
    setData((d) => {
      if (!d.bomEnabled || d.created.bomId || !d.materialsEnabled) return d;
      const seeded = new Set(d.bomSeededKeys ?? []);
      const fresh = d.materials.filter((m) => m.code.trim() && !seeded.has(m.key));
      if (fresh.length === 0) return d;
      const kept = d.bomRows.filter((r) => r.materialId);
      const added = fresh
        .filter((m) => !kept.some((r) => r.materialId === newMaterialRef(m.key)))
        .map((m) => ({ key: nextRowKey(), materialId: newMaterialRef(m.key), unitId: m.unitId, quantity: "1", wastagePercent: "" }));
      const rows = [...kept, ...added];
      return {
        ...d,
        bomRows: rows.length ? rows : d.bomRows,
        bomSeededKeys: [...seeded, ...fresh.map((m) => m.key)],
      };
    });
  }

  function goToStep(next: number) {
    if (next === 2) seedBomRows();
    setStep(next);
  }

  async function goNext() {
    const error = validateSetupStep(step, data, materialCan);
    if (error) {
      setAttempted(true);
      toast.error(error);
      return;
    }
    if (step === 0 || step === 1) {
      setChecking(true);
      const taken = step === 0 || (step === 1 && data.mode === "material") ? await findTakenMaterialCode() : await findTakenProductCode();
      setChecking(false);
      if (taken) {
        toast.error(taken);
        return;
      }
    }
    goToStep(visible[Math.min(visible.indexOf(step) + 1, visible.length - 1)]);
  }

  async function handleRun() {
    for (const i of visible.filter((x) => x < 4)) {
      const error = validateSetupStep(i, data, materialCan);
      if (error) {
        setAttempted(true);
        toast.error(`ขั้นตอน ${labels[i]}: ${error}`);
        setStep(i);
        return;
      }
    }
    setRunning(true);
    setProblem(null);
    const taken = (await findTakenMaterialCode()) ?? (await findTakenProductCode());
    if (taken) {
      setProblem(taken);
      setStep(taken.startsWith("รหัสสินค้า") ? 1 : 0);
      toast.error(taken);
      setRunning(false);
      return;
    }
    const result = await runSetupAction(data);
    const nextData = { ...data, created: result.created };
    setData(nextData);
    if (result.status === "success") {
      if (draftRef) await deleteSetupDraftAction(draftRef.id);
      setDraftRef(null);
      setFinished(true);
      toast.success("สร้างข้อมูลครบชุดเรียบร้อย");
    } else {
      setProblem(`${result.failedAt}ไม่สำเร็จ: ${result.message}`);
      // Keep what was already created in the draft so a retry resumes after it.
      await persistDraft(nextData, step, true);
      toast.error(`${result.failedAt}ไม่สำเร็จ — ส่วนที่สร้างแล้วถูกบันทึกในร่าง กดสร้างอีกครั้งเพื่อทำต่อ`);
    }
    setRunning(false);
  }

  async function confirmDeleteDraft() {
    if (!deleteTarget) return;
    const result = await deleteSetupDraftAction(deleteTarget.id);
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success("ลบร่างแล้ว");
      if (draftRef?.id === deleteTarget.id) router.push("/engineering/setup");
      else router.refresh();
    }
    setDeleteTarget(null);
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-14 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-fg">{data.mode === "material" ? "สร้าง BOM + Workflow ของวัสดุเรียบร้อย" : "สร้างครบชุดเรียบร้อย"}</h2>
        <ul className="text-sm text-fg-secondary">
          {createdMaterialCount - existingMaterialCount > 0 && <li>วัสดุใหม่ {createdMaterialCount - existingMaterialCount} รายการถูกสร้างแล้ว</li>}
          {existingMaterialCount > 0 && <li>ใช้วัสดุภายในที่มีอยู่แล้ว {existingMaterialCount} รายการ</li>}
          {data.mode === "material" && ownerInfo(data) && (
            <li>{ownerInfo(data)!.isNew ? `สร้างวัสดุภายใน ${ownerInfo(data)!.code} แล้ว` : `วัสดุภายใน ${ownerInfo(data)!.code}`}</li>
          )}
          {data.mode !== "material" && (
            <li>{data.product.source === "existing" ? `ใช้สินค้า ${data.product.code} ที่มีอยู่แล้ว` : `สินค้า ${data.product.code} ถูกสร้างแล้ว`}</li>
          )}
          {data.created.bomId && <li>BOM {data.activate ? "(เปิดใช้งานแล้ว)" : "(ฉบับร่าง)"}</li>}
          {data.created.workflowId && <li>Workflow {data.activate ? "(เปิดใช้งานแล้ว)" : "(ฉบับร่าง)"}</li>}
        </ul>
        <div className="flex flex-wrap justify-center gap-2">
          {data.mode === "material" ? (
            <>
              <Button asChild><Link href="/materials/catalog">ไปที่ทะเบียนวัสดุ</Link></Button>
              <Button asChild variant="outline"><Link href="/engineering/bom">ไปที่ภาพรวม BOM</Link></Button>
            </>
          ) : (
            <>
              <Button asChild><Link href="/engineering/products">ไปที่รายการสินค้า</Link></Button>
              <Button asChild variant="outline"><Link href="/engineering/bom">ไปที่ภาพรวม BOM</Link></Button>
            </>
          )}
          <Button variant="outline" onClick={() => router.push("/engineering/setup")}>เริ่มชุดใหม่</Button>
        </div>
      </div>
    );
  }

  if (!data.mode) {
    return (
      <ModeChooser
        drafts={drafts}
        products={products}
        details={details}
        materials={materials}
        processSteps={processSteps}
        manage={manage}
        onDeleteDraft={setDeleteTarget}
        onPick={(picked) => {
          setData((d) => ({ ...d, mode: picked }));
          setStep(visibleSteps(picked)[0]);
        }}
      />
    );
  }

  const locked = running;
  const isLast = step === SETUP_STEPS.length - 1;

  const position = visible.indexOf(step) + 1;
  return (
    <div className="flex flex-col gap-4">
      <StepRail current={step} done={done} visible={visible} labels={labels} onSelect={goToStep} />
      <div className="grid items-start gap-4">

      <div className="min-w-0 rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              {mode === "material" ? <Boxes className="size-5" aria-hidden="true" /> : <Package className="size-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                {mode === "material" ? "BOM + Workflow ของวัสดุ" : "สร้างสินค้าครบชุด"}
                {draftRef && <Badge variant="primary">ร่าง</Badge>}
              </p>
              <p className="text-xs text-fg-muted">ขั้นตอนที่ {position} จาก {visible.length}</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="ghost" disabled={locked} onClick={() => setData((d) => ({ ...d, mode: undefined }))}>
            <RefreshCw className="size-3.5" aria-hidden="true" /> เปลี่ยนประเภท
          </Button>
        </div>

        <fieldset disabled={locked} className="min-w-0 border-0 p-5">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <StepHeading
                title={materialMode ? "วัสดุส่วนประกอบ" : "วัสดุ"}
                desc="ส่วนใหญ่ข้ามได้ — สร้างเฉพาะวัสดุใหม่ที่จะใช้เป็นส่วนประกอบ"
              />
              {!can.material ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้างวัสดุ (MATERIAL_CREATE) — ข้ามขั้นตอนนี้และเลือกวัสดุที่มีอยู่ใน BOM แทน</Notice>
              ) : (
                <>
                  <SourceSwitch
                    label="ต้องสร้างวัสดุใหม่ไหม"
                    value={data.materialsEnabled ? "new" : "skip"}
                    onChange={(v) => setData((d) => ({ ...d, materialsEnabled: v === "new" }))}
                    options={[
                      { value: "skip", title: "ไม่ต้อง ใช้วัสดุที่มีอยู่แล้ว", desc: "ข้ามไปขั้นตอนถัดไปได้เลย" },
                      { value: "new", title: "ต้องสร้างวัสดุใหม่", desc: "กรอกข้อมูลวัสดุที่ยังไม่มีในระบบ" },
                    ]}
                  />
                  {!data.materialsEnabled && (
                    <ExistingMaterialList
                      materials={materials}
                      usedIds={data.bomRows.map((r) => r.materialId)}
                      unitLabel={(id) => unitOptions.find((o) => o.id === id)?.label ?? ""}
                      onAdd={(m) =>
                        setData((d) => {
                          const blank = d.bomRows.find((r) => !r.materialId);
                          const rows = blank
                            ? d.bomRows.map((r) => (r === blank ? { ...r, materialId: m.id, unitId: m.unitId } : r))
                            : [...d.bomRows, { key: nextRowKey(), materialId: m.id, unitId: m.unitId, quantity: "", wastagePercent: "" }];
                          return { ...d, bomEnabled: true, bomRows: rows };
                        })
                      }
                    />
                  )}
                  {data.materialsEnabled && (
                    <>
                      {data.materials.map((m, index) =>
                        data.created.materialIds?.[m.key] ? (
                          <Notice key={m.key} tone="success">
                            {m.source === "existing" ? `ใช้วัสดุ ${m.code} ที่มีอยู่แล้ว` : `สร้างวัสดุ ${m.code} ไปแล้ว ไม่ต้องกรอกซ้ำ`}
                          </Notice>
                        ) : m.source === "existing" ? (
                          <ExistingInternalCard
                            key={m.key}
                            m={m}
                            index={index}
                            onPatch={(patch) => patchMaterial(m.key, patch)}
                            onRemove={
                              data.materials.length > 1
                                ? () => setData((d) => ({ ...d, materials: d.materials.filter((x) => x.key !== m.key) }))
                                : undefined
                            }
                            candidates={materials.filter((x) => x.id === m.existingId || !data.materials.some((o) => o.existingId === x.id))}
                          />
                        ) : (
                          <MaterialCard
                            key={m.key}
                            m={m}
                            index={index}
                            onPatch={(patch) => patchMaterial(m.key, patch)}
                            onRemove={
                              data.materials.length > 1
                                ? () => setData((d) => ({ ...d, materials: d.materials.filter((x) => x.key !== m.key) }))
                                : undefined
                            }
                            unitOptions={unitOptions}
                            supplierOptions={supplierOptions}
                            materialTypeOptions={materialTypeOptions}
                            stepOptions={stepOptions}
                            componentOptions={[
                              ...newMaterialOptions.filter((o) => o.id !== newMaterialRef(m.key)),
                              ...materials.map((x) => ({ id: x.id, label: `${x.code} · ${x.name}` })),
                            ]}
                            catalog={materials}
                            otherCodes={data.materials.filter((x) => x.key !== m.key).map((x) => x.code)}
                            showErrors={attempted}
                            canEngineer={can.materialBom && can.materialWorkflow}
                          />
                        )
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="self-start"
                        onClick={() => setData((d) => ({ ...d, materials: [...d.materials, emptyMaterial()] }))}
                      >
                        <Plus className="size-4" aria-hidden="true" /> เพิ่มวัสดุอีกรายการ
                      </Button>
                      <p className="text-xs text-fg-muted">วัสดุแบบ Pipe/Sheet/Coil เพิ่มได้ภายหลังที่หน้าทะเบียนวัสดุ</p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 1 && materialMode && (
            <div className="flex flex-col gap-4">
              <StepHeading title="วัสดุภายใน" desc="เลือกวัสดุภายในที่จะสร้าง BOM และ Workflow" />
              {!can.materialBom && !can.materialWorkflow ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้าง BOM / Workflow ของวัสดุ (MATERIAL_BOMS_CREATE / MATERIAL_WORKFLOWS_CREATE)</Notice>
              ) : data.created.bomId || data.created.workflowId ? (
                <Notice tone="success">
                  สร้าง BOM / Workflow ของวัสดุ {ownerInfo(data)?.code} บางส่วนหรือทั้งหมดไปแล้ว — ไม่ต้องเลือกใหม่
                </Notice>
              ) : (
                <SourceSwitch
                  label="แหล่งที่มาของวัสดุภายใน"
                  value={ownerSourceValue}
                  onChange={(source) => setData((d) => ({ ...d, ownerSource: source, ownerNew: source === "new" ? d.ownerNew ?? emptyOwnerMaterial() : d.ownerNew }))}
                  options={[
                    { value: "existing", title: "เลือกจากวัสดุภายในที่มีอยู่", desc: "ใช้วัสดุเดิม แล้วเพิ่ม BOM / Workflow ให้" },
                    { value: "new", title: "สร้างวัสดุภายในใหม่", desc: "กรอกข้อมูลวัสดุใหม่ (Location Type ภายใน)" },
                  ]}
                />
              )}
              {data.created.bomId || data.created.workflowId ? null : ownerSourceValue === "new" ? (
                data.created.materialIds?.[data.ownerNew?.key ?? -1] ? (
                  <Notice tone="success">สร้างวัสดุ {data.ownerNew?.code} ไปแล้ว ไม่ต้องกรอกซ้ำ</Notice>
                ) : (
                  <MaterialCard
                    m={data.ownerNew ?? emptyOwnerMaterial()}
                    index={0}
                    ownerMode
                    onPatch={(patch) => setData((d) => ({ ...d, ownerNew: { ...(d.ownerNew ?? emptyOwnerMaterial()), ...patch } }))}
                    unitOptions={unitOptions}
                    supplierOptions={supplierOptions}
                    materialTypeOptions={materialTypeOptions}
                    stepOptions={stepOptions}
                    componentOptions={[]}
                    catalog={materials}
                    otherCodes={data.materials.filter((x) => x.source !== "existing").map((x) => x.code)}
                    showErrors={attempted}
                    canEngineer={can.materialBom && can.materialWorkflow}
                  />
                )
              ) : internalCatalog.length === 0 ? (
                <Notice>ยังไม่มีวัสดุที่ Location Type เป็นภายใน — เลือก “สร้างวัสดุภายในใหม่” หรือเพิ่ม/แก้ไขที่ทะเบียนวัสดุก่อน</Notice>
              ) : (
                <div className="flex flex-col gap-3">
                  <Field label="วัสดุภายใน" htmlFor="sw-owner" required hint="ค้นหาด้วยรหัสหรือชื่อ (ไม่รวม Pipe/Sheet/Coil)">
                    <MasterDataSelect
                      options={internalCatalog.map((x) => ({ id: x.id, label: `${x.code} · ${x.name}` }))}
                      value={data.ownerMaterial?.id ?? ""}
                      onValueChange={(id) => {
                        const picked = internalCatalog.find((x) => x.id === id);
                        setData((d) => ({ ...d, ownerMaterial: picked ? { id: picked.id, code: picked.code, name: picked.name } : undefined }));
                      }}
                      placeholder="เลือกวัสดุภายใน" href="/materials/catalog" resourceLabel="วัสดุภายใน"
                    />
                  </Field>
                  <Notice tone="success">
                    ขั้นตอนถัดไปจะสร้าง BOM / Workflow เป็นเวอร์ชันใหม่ของวัสดุนี้ (ไม่ทับของเดิม)
                  </Notice>
                </div>
              )}
            </div>
          )}

          {step === 1 && !materialMode && (
            <div className="flex flex-col gap-4">
              <StepHeading title="สินค้า" desc="ข้อมูลหลักของสินค้า" />
              {data.created.productId ? (
                <Notice tone="success">
                  {data.product.source === "existing" ? `ใช้สินค้า ${data.product.code} ที่มีอยู่แล้ว` : `สร้างสินค้า ${data.product.code} ไปแล้ว ไม่ต้องกรอกซ้ำ`}
                </Notice>
              ) : (
                <SourceSwitch
                  label="แหล่งที่มาของสินค้า"
                  value={data.product.source ?? "new"}
                  onChange={(source) => patchProduct({ source })}
                  options={[
                    { value: "new", title: "สร้างสินค้าใหม่", desc: "กรอกข้อมูลสินค้าใหม่" },
                    { value: "existing", title: "เลือกจากสินค้าที่มีอยู่", desc: "ใช้สินค้าเดิม แล้วเพิ่ม BOM / Workflow ให้" },
                  ]}
                />
              )}
              {data.created.productId ? null : data.product.source === "existing" ? (
                products.length === 0 ? (
                  <Notice>ยังไม่มีสินค้าในระบบ — เลือก “สร้างสินค้าใหม่” หรือเพิ่มสินค้าที่ทะเบียนสินค้าก่อน</Notice>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Field label="สินค้า" htmlFor="sw-p-existing" required hint="ค้นหาด้วยรหัสหรือชื่อสินค้า">
                      <MasterDataSelect
                        options={products.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))}
                        value={data.product.existingId ?? ""}
                        onValueChange={(id) => {
                          const picked = products.find((p) => p.id === id);
                          patchProduct({ existingId: id, code: picked?.code ?? "", name: picked?.name ?? "" });
                        }}
                        placeholder="เลือกสินค้า"
                        href="/engineering/products"
                        resourceLabel="สินค้า"
                      />
                    </Field>
                    <Notice tone="success">
                      ไม่ต้องกรอกข้อมูลสินค้า — ขั้นตอนถัดไปจะสร้าง BOM / Workflow เป็นเวอร์ชันใหม่ของสินค้านี้ (ไม่ทับของเดิม)
                    </Notice>
                  </div>
                )
              ) : !can.product ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้างสินค้า (PRODUCTS_CREATE)</Notice>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="รหัสสินค้า" htmlFor="sw-p-code" required>
                    <Input id="sw-p-code" maxLength={50} value={data.product.code} aria-invalid={productCodeState.status === "duplicate"} aria-describedby={productCodeState.status === "idle" ? undefined : "sw-p-code-status"} onChange={(e) => patchProduct({ code: e.target.value })} />
                    <CodeFeedback id="sw-p-code-status" state={productCodeState} label="รหัสสินค้า" />
                  </Field>
                  <Field label="ชื่อสินค้า" htmlFor="sw-p-name" required>
                    <Input id="sw-p-name" maxLength={255} value={data.product.name} onChange={(e) => patchProduct({ name: e.target.value })} />
                  </Field>
                  <Field label="หน่วย" required>
                    <MasterDataSelect options={productUnitOptions} value={data.product.unitId} onValueChange={(v) => patchProduct({ unitId: v })} placeholder="เลือกหน่วย" href="/master-data/units" resourceLabel="หน่วย" />
                  </Field>
                  <Field label="ประเภทสินค้า" required>
                    <MasterDataSelect options={productOptions(productLookups.productTypes)} value={data.product.productTypeId} onValueChange={(v) => patchProduct({ productTypeId: v })} placeholder="เลือกประเภท" href="/master-data/product-types" resourceLabel="ประเภทสินค้า" />
                  </Field>
                  <Field label="รุ่น" required>
                    <MasterDataSelect options={productOptions(productLookups.productModels)} value={data.product.modelId} onValueChange={(v) => patchProduct({ modelId: v })} placeholder="เลือกรุ่น" href="/master-data/product-models" resourceLabel="รุ่น" />
                  </Field>
                  <Field label="ลูกค้า" required>
                    <MasterDataSelect options={productOptions(productLookups.customers)} value={data.product.customerId} onValueChange={(v) => patchProduct({ customerId: v })} placeholder="เลือกลูกค้า" href="/master-data/customers" resourceLabel="ลูกค้า" />
                  </Field>
                  <Field label="สถานที่" required>
                    <MasterDataSelect options={productOptions(productLookups.locations)} value={data.product.locationId} onValueChange={(v) => patchProduct({ locationId: v })} placeholder="เลือกสถานที่" href="/master-data/locations" resourceLabel="สถานที่" />
                  </Field>
                  <Field label="ประเภทการจัดส่ง" required>
                    <MasterDataSelect options={productOptions(productLookups.deliveryTypes)} value={data.product.deliveryTypeId} onValueChange={(v) => patchProduct({ deliveryTypeId: v })} placeholder="เลือกประเภทการจัดส่ง" href="/master-data/delivery-types" resourceLabel="ประเภทการจัดส่ง" />
                  </Field>
                  <Field label="จุดขึ้นสินค้า" required>
                    <MasterDataSelect options={productOptions(productLookups.loadingPoints)} value={data.product.loadingPointId} onValueChange={(v) => patchProduct({ loadingPointId: v })} placeholder="เลือกจุดขึ้นสินค้า" href="/master-data/loading-points" resourceLabel="จุดขึ้นสินค้า" />
                  </Field>
                  <Field label="สายการผลิต" required>
                    <MasterDataSelect options={productOptions(productLookups.processLines)} value={data.product.processLineId} onValueChange={(v) => patchProduct({ processLineId: v })} placeholder="เลือกสายการผลิต" href="/master-data/process-lines" resourceLabel="สายการผลิต" />
                  </Field>
                  <Field label="จำนวนต่อแพ็ก" htmlFor="sw-p-pack">
                    <Input id="sw-p-pack" type="number" min={1} value={data.product.packing} onChange={(e) => patchProduct({ packing: e.target.value })} />
                  </Field>
                  <Field label="ขนาดล็อต" htmlFor="sw-p-lot">
                    <Input id="sw-p-lot" type="number" min={1} value={data.product.lotSize} onChange={(e) => patchProduct({ lotSize: e.target.value })} />
                  </Field>
                  <Field label="มาตราส่วน" htmlFor="sw-p-scale">
                    <Input id="sw-p-scale" maxLength={50} value={data.product.scale} onChange={(e) => patchProduct({ scale: e.target.value })} />
                  </Field>
                  <div className="sm:col-span-2">
                    <ImageField
                      id="sw-p-image"
                      label="รูปภาพสินค้า (ไม่บังคับ)"
                      path={data.product.imagePath}
                      onChange={(imagePath) => patchProduct({ imagePath })}
                      upload={uploadProductImageAction}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="BOM" desc={materialMode ? "วัตถุดิบที่ใช้ต่อวัสดุ 1 หน่วย" : "วัตถุดิบที่ใช้ต่อสินค้า 1 หน่วย"} />
              {!canBom ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้าง BOM ({materialMode ? "MATERIAL_BOMS_CREATE" : "BOMS_CREATE"})</Notice>
              ) : data.created.bomId ? (
                <Notice tone="success">สร้าง BOM ไปแล้ว ไม่ต้องกรอกซ้ำ</Notice>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox checked={!data.bomEnabled} onCheckedChange={(v) => setData((d) => ({ ...d, bomEnabled: v !== true }))} />
                    ข้าม BOM (ทำภายหลัง)
                  </label>
                  {data.bomEnabled && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[44rem] text-sm">
                          <thead className="bg-surface-2">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-10">#</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary">วัตถุดิบ</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-40">หน่วย</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-28">จำนวน</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-28">สูญเสีย %</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-12"><span className="sr-only">ลบ</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {data.bomRows.map((row, index) => {
                              const options: MasterDataSelectOption[] = [
                                ...newMaterialOptions,
                                ...materials.map((m) => ({ id: m.id, label: `${m.code} · ${m.name}` })),
                              ].filter(
                                (o) => o.id !== data.ownerMaterial?.id && (o.id === row.materialId || !data.bomRows.some((r) => r.materialId === o.id))
                              );
                              const update = (patch: Partial<typeof row>) =>
                                setData((d) => ({ ...d, bomRows: d.bomRows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) }));
                              return (
                                <tr key={row.key} className="align-middle">
                                  <td className="px-3 py-2 font-semibold text-fg-muted">{index + 1}</td>
                                  <td className="min-w-[14rem] px-3 py-2">
                                    <MasterDataSelect
                                      options={options}
                                      value={row.materialId}
                                      onValueChange={(v) => {
                                        const material = materials.find((m) => m.id === v);
                                        const unitId = isNewMaterialRef(v)
                                          ? data.materials.find((m) => m.key === newMaterialKey(v))?.unitId
                                          : material?.unitId ?? row.unitId;
                                        update({ materialId: v, unitId: unitId || row.unitId });
                                      }}
                                      placeholder="เลือกวัตถุดิบ" href="/materials/catalog" resourceLabel="วัตถุดิบ"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <MasterDataSelect options={unitOptions} value={row.unitId} onValueChange={(v) => update({ unitId: v })} placeholder="หน่วย" href="/master-data/units" resourceLabel="หน่วย" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`จำนวน รายการที่ ${index + 1}`} type="number" min={0} step="any" value={row.quantity} onChange={(e) => update({ quantity: e.target.value })} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`สูญเสีย % รายการที่ ${index + 1}`} type="number" min={0} max={100} step="any" value={row.wastagePercent} onChange={(e) => update({ wastagePercent: e.target.value })} />
                                  </td>
                                  <td className="px-2 py-2">
                                    <Button type="button" size="icon" variant="ghost" aria-label="ลบรายการ" onClick={() => setData((d) => ({ ...d, bomRows: d.bomRows.filter((r) => r.key !== row.key) }))}>
                                      <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Button type="button" variant="outline" className="self-start" onClick={() => setData((d) => ({ ...d, bomRows: [...d.bomRows, { key: nextRowKey(), materialId: "", unitId: "", quantity: "", wastagePercent: "" }] }))}>
                        <Plus className="size-4" aria-hidden="true" /> เพิ่มรายการ
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="Workflow" desc="เรียงขั้นตอนการผลิตตามลำดับ" />
              {!canWorkflow ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้าง Workflow ({materialMode ? "MATERIAL_WORKFLOWS_CREATE" : "PRODUCT_WORKFLOWS_CREATE"})</Notice>
              ) : data.created.workflowId ? (
                <Notice tone="success">สร้าง Workflow ไปแล้ว ไม่ต้องกรอกซ้ำ</Notice>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox checked={!data.workflowEnabled} onCheckedChange={(v) => setData((d) => ({ ...d, workflowEnabled: v !== true }))} />
                    ข้าม Workflow (ทำภายหลัง)
                  </label>
                  {data.workflowEnabled && (
                    <>
                      {stepOptions.length === 0 && <Notice>ยังไม่มีข้อมูลกระบวนการผลิต หรือคุณไม่มีสิทธิ์ดู — ต้องมีที่ ข้อมูลพื้นฐาน › กระบวนการผลิต ก่อน</Notice>}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full min-w-[40rem] text-sm">
                          <thead className="bg-surface-2">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-12">ลำดับ</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary">กระบวนการ</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary">รายละเอียด (ไม่บังคับ)</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-fg-secondary w-32"><span className="sr-only">จัดการ</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {data.workflowRows.map((row, index) => {
                              const options = stepOptions.filter((o) => o.id === row.processStepId || !data.workflowRows.some((r) => r.processStepId === o.id));
                              const update = (patch: Partial<typeof row>) =>
                                setData((d) => ({ ...d, workflowRows: d.workflowRows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) }));
                              const move = (delta: number) =>
                                setData((d) => {
                                  const rows = [...d.workflowRows];
                                  const target = index + delta;
                                  if (target < 0 || target >= rows.length) return d;
                                  [rows[index], rows[target]] = [rows[target], rows[index]];
                                  return { ...d, workflowRows: rows };
                                });
                              return (
                                <tr key={row.key} className="align-middle">
                                  <td className="px-3 py-2">
                                    <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-xs font-semibold text-success">{index + 1}</span>
                                  </td>
                                  <td className="min-w-[14rem] px-3 py-2">
                                    <MasterDataSelect options={options} value={row.processStepId} onValueChange={(v) => update({ processStepId: v })} placeholder="เลือกกระบวนการ" href="/master-data/process-steps" resourceLabel="กระบวนการผลิต" />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`รายละเอียด ขั้นตอนที่ ${index + 1}`} value={row.description} onChange={(e) => update({ description: e.target.value })} />
                                  </td>
                                  <td className="px-2 py-2">
                                    <div className="flex justify-end gap-1">
                                      <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => move(-1)}>↑</Button>
                                      <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนลง" disabled={index === data.workflowRows.length - 1} onClick={() => move(1)}>↓</Button>
                                      <Button type="button" size="icon" variant="ghost" aria-label="ลบขั้นตอน" onClick={() => setData((d) => ({ ...d, workflowRows: d.workflowRows.filter((r) => r.key !== row.key) }))}>
                                        <Trash2 className="size-4" aria-hidden="true" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Button type="button" variant="outline" className="self-start" onClick={() => setData((d) => ({ ...d, workflowRows: [...d.workflowRows, { key: nextRowKey(), processStepId: "", description: "" }] }))}>
                        <Plus className="size-4" aria-hidden="true" /> เพิ่มขั้นตอน
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="ตรวจสอบและสร้าง" desc="ดูสรุปแล้วกดสร้าง — ถ้ามีขั้นใดล้มเหลว ส่วนที่สร้างแล้วจะเก็บไว้ในร่างให้ทำต่อ" />
              <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border text-sm">
                <ReviewRow
                  label="วัสดุ"
                  status={!data.materialsEnabled ? "skip" : createdMaterialCount === data.materials.length ? "created" : "todo"}
                  value={data.materialsEnabled ? data.materials.map((m) => (m.code.trim() || "—") + (m.source === "existing" ? " (ที่มีอยู่)" : "")).join(", ") : "ไม่สร้างใหม่"}
                />
                {materialMode && (
                  <ReviewRow
                    label="วัสดุภายใน"
                    status={data.created.bomId || data.created.workflowId ? "created" : "todo"}
                    value={ownerInfo(data) ? `${ownerInfo(data)!.code} · ${ownerInfo(data)!.name}${ownerInfo(data)!.isNew ? " (สร้างใหม่)" : ""}` : "—"}
                  />
                )}
                {mode !== "material" && (
                  <ReviewRow
                    label="สินค้า"
                    status={data.created.productId ? "created" : data.product.source === "existing" ? "skip" : "todo"}
                    value={`${data.product.code} · ${data.product.name}${data.product.source === "existing" ? " (ใช้ที่มีอยู่)" : ""}`}
                  />
                )}
                <ReviewRow label="BOM" status={data.created.bomId ? "created" : data.bomEnabled ? "todo" : "skip"} value={data.bomEnabled ? `${data.bomRows.length} รายการ` : "ข้าม"} />
                <ReviewRow label="Workflow" status={data.created.workflowId ? "created" : data.workflowEnabled ? "todo" : "skip"} value={data.workflowEnabled ? `${data.workflowRows.length} ขั้นตอน` : "ข้าม"} />
              </dl>
              {(data.bomEnabled || data.workflowEnabled || hasInternalMaterial) && (
                <label className="flex items-center gap-2 text-sm text-fg">
                  <Checkbox
                    checked={data.activate && can.activateBom && can.activateWorkflow}
                    disabled={!can.activateBom || !can.activateWorkflow}
                    onCheckedChange={(v) => setData((d) => ({ ...d, activate: v === true }))}
                  />
                  เปิดใช้งาน BOM และ Workflow ทันที (ไม่เลือก = เก็บเป็นฉบับร่าง)
                </label>
              )}
              {problem && <Notice tone="danger">{problem}</Notice>}
            </div>
          )}
        </fieldset>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-border bg-surface-2 px-5 py-4 shadow-[0_-4px_12px_-8px_rgb(0_0_0/0.25)]">
          <Button type="button" variant="outline" disabled={step === visible[0] || locked} onClick={() => goToStep(visible[Math.max(0, visible.indexOf(step) - 1)])}>
            <ChevronLeft className="size-4" aria-hidden="true" /> ย้อนกลับ
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" disabled={savingDraft || locked} onClick={() => void persistDraft(data, step)}>
              {savingDraft ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />} บันทึกร่าง
            </Button>
            {!isLast && (step === 2 || step === 3) && (
              <Button type="button" variant="outline" disabled={locked} onClick={() => void handleRun()}>
                {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} บันทึกทันที
              </Button>
            )}
            {isLast ? (
              <Button type="button" disabled={locked} onClick={() => void handleRun()}>
                {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                {Object.keys(data.created).length > 0 ? "สร้างส่วนที่เหลือ" : "สร้างทั้งหมด"}
              </Button>
            ) : (
              <Button type="button" disabled={checking} onClick={() => void goNext()}>
                ถัดไป <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบร่างนี้หรือไม่?"
        description={`ร่าง "${deleteTarget?.title ?? ""}" จะถูกลบถาวร (ข้อมูลที่สร้างจริงไปแล้วจะไม่ถูกลบ)`}
        confirmLabel="ลบร่าง"
        onConfirm={confirmDeleteDraft}
      />
    </div>
  );
}

/** Live feedback under a code input (uses role=status so screen readers hear changes). */
function CodeFeedback({ id, state, label }: { id: string; state: CodeAvailability; label: string }) {
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

function StepHeading({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <p className="text-sm text-fg-muted">{desc}</p>
    </div>
  );
}

function Notice({ children, tone = "warning" }: { children: React.ReactNode; tone?: "warning" | "success" | "danger" }) {
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

function ReviewRow({ label, value, status }: { label: string; value: string; status: "created" | "todo" | "skip" }) {
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

function ExistingMaterialList({
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

function MaterialCard({
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
    <section className="rounded-lg border border-border border-l-4 border-l-primary" aria-label={`วัสดุใหม่ที่ ${index + 1}`}>
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

const blankBomRow = (): SetupBomRow => ({ key: nextRowKey(), materialId: "", unitId: "", quantity: "", wastagePercent: "" });
const blankStepRow = (): SetupWorkflowRow => ({ key: nextRowKey(), processStepId: "", description: "" });

/** Picks an in-house material that already exists (select box). Nothing is created for it: it already has its BOM / Workflow. */
function ExistingInternalCard({
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
    <section className="rounded-lg border border-border border-l-4 border-l-success" aria-label={`วัสดุภายในที่มีอยู่ที่ ${index + 1}`}>
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
function InternalProcess({
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
            <div key={row.key} className="grid gap-3 rounded-lg border border-border border-l-4 border-l-primary p-3 sm:grid-cols-[1fr_9rem_7rem_7rem_auto] sm:items-end">
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
            <div key={row.key} className="grid gap-3 rounded-lg border border-border border-l-4 border-l-success p-3 sm:grid-cols-[2.5rem_1fr_1fr_auto] sm:items-end">
              <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success">{index + 1}</span>
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

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_MAX = 5 * 1024 * 1024;

type UploadResult = { status: "success"; image: { imagePath: string } } | { status: "error"; message: string };

/** Picks an image, stages it on the server right away, and keeps only the staged path in the form. */
function ImageField({
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
function ModeChooser({
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
function DraftList({
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
    <section className={cn("rounded-xl border border-border bg-surface", className)} aria-label="ร่างของฉัน">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-fg">
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

type PartState = "active" | "draft" | "none";
type WorkRow = { id: string; code: string; name: string; bom: PartState; workflow: PartState };

function partState(versions: Array<{ status: string }> | undefined): PartState {
  if (!versions || versions.length === 0) return "none";
  return versions.some((v) => v.status === "ACTIVE") ? "active" : "draft";
}

const PART_CHIP: Record<PartState, { label: (name: string) => string; cls: string; Icon: typeof Check }> = {
  active: { label: (n) => `${n} พร้อมใช้`, cls: "bg-success-soft text-success-fg", Icon: CheckCircle2 },
  draft: { label: (n) => `${n} เป็นร่าง`, cls: "bg-warning-soft text-warning-fg", Icon: RefreshCw },
  none: { label: (n) => `ยังไม่มี ${n}`, cls: "bg-danger-soft text-danger-fg", Icon: X },
};

function PartChip({ name, state }: { name: string; state: PartState }) {
  const chip = PART_CHIP[state];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", chip.cls)}>
      <chip.Icon className="size-3.5" aria-hidden="true" />
      {chip.label(name)}
    </span>
  );
}

/**
 * Every active product / internal material in one list: incomplete first, one status chip for BOM and one
 * for Workflow, and ONE "open" action that shows the diagram and manages versions in the same dialog.
 */
function BomWorkList({
  onCreate,
  details,
  products,
  materials,
  processSteps,
  manage,
}: {
  onCreate: (mode: SetupMode) => void;
  details: BomOverview;
  products: Array<{ id: string; code: string; name: string }>;
  materials: Material[];
  processSteps: ProcessStep[];
  manage: ManageCan;
}) {
  const router = useRouter();
  const [scope, setScope] = React.useState<"products" | "materials">("products");
  const [filter, setFilter] = React.useState<"all" | "incomplete" | "complete">("incomplete");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"diagram" | "versions">("versions");
  const PAGE_SIZE = 10;

  const rowsByScope = React.useMemo(() => {
    const build = (base: Array<{ id: string; code: string; name: string }>, owners: BomOverview["products"]): WorkRow[] => {
      const byId = new Map(owners.map((o) => [o.id, o]));
      const merged = new Map<string, { id: string; code: string; name: string }>();
      base.forEach((b) => merged.set(b.id, b));
      owners.filter((o) => o.isActive).forEach((o) => merged.set(o.id, { id: o.id, code: o.code, name: o.name }));
      return [...merged.values()]
        .map((o) => ({ ...o, bom: partState(byId.get(o.id)?.boms), workflow: partState(byId.get(o.id)?.workflows) }))
        .sort((a, b) => a.code.localeCompare(b.code));
    };
    const internal = materials
      .filter((m) => m.locationType === "internal" && !["PIPE", "SHEET", "COIL"].includes(m.materialType))
      .map((m) => ({ id: m.id, code: m.code, name: m.name }));
    return { products: build(products, details.products), materials: build(internal, details.materials) };
  }, [details, products, materials]);

  const isComplete = (r: WorkRow) => r.bom === "active" && r.workflow === "active";
  const all = rowsByScope[scope];
  const counts = { all: all.length, incomplete: all.filter((r) => !isComplete(r)).length, complete: all.filter(isComplete).length };
  const q = query.trim().toLowerCase();
  const filtered = all
    .filter((r) => (filter === "all" ? true : filter === "complete" ? isComplete(r) : !isComplete(r)))
    .filter((r) => !q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
    .sort((a, b) => Number(isComplete(a)) - Number(isComplete(b)) || a.code.localeCompare(b.code));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const shown = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const openRow = openId ? all.find((r) => r.id === openId) ?? null : null;
  const openOwner = openRow ? details[scope].find((o) => o.id === openRow.id) ?? null : null;

  const scopes: Array<{ id: "products" | "materials"; label: string; incomplete: number }> = [
    { id: "products", label: "สินค้า", incomplete: rowsByScope.products.filter((r) => !isComplete(r)).length },
    { id: "materials", label: "วัตถุดิบภายใน", incomplete: rowsByScope.materials.filter((r) => !isComplete(r)).length },
  ];
  const filters: Array<{ id: typeof filter; label: string; count: number }> = [
    { id: "incomplete", label: "ยังไม่ครบ", count: counts.incomplete },
    { id: "complete", label: "พร้อมผลิต", count: counts.complete },
    { id: "all", label: "ทั้งหมด", count: counts.all },
  ];

  function open(row: WorkRow) {
    setTab(isComplete(row) ? "diagram" : "versions");
    setOpenId(row.id);
  }

  return (
    <section className="rounded-xl border border-border bg-surface" aria-label="รายการ BOM และ Workflow">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="ประเภท" className="inline-flex rounded-lg bg-surface-2 p-1">
            {scopes.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={scope === s.id}
                onClick={() => {
                  setScope(s.id);
                  setPage(1);
                  setFilter(s.incomplete > 0 ? "incomplete" : "all");
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  scope === s.id ? "bg-surface text-fg shadow-sm" : "text-fg-secondary hover:text-fg"
                )}
              >
                {s.label}
                {s.incomplete > 0 && <span className="rounded-full bg-danger-soft px-1.5 text-xs font-semibold text-danger-fg">{s.incomplete}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => onCreate("product")}>
              <Plus className="size-4" aria-hidden="true" /> สร้างสินค้า
            </Button>
            <Button type="button" variant="outline" onClick={() => onCreate("material")}>
              <Plus className="size-4" aria-hidden="true" /> สร้างวัตถุดิบภายใน
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="กรองตามความครบถ้วน" className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  filter === f.id ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-fg-secondary hover:bg-surface-2"
                )}
              >
                {f.label} <span className="tabular-nums">{f.count}</span>
              </button>
            ))}
          </div>
          <Input
            aria-label="ค้นหารายการ"
            placeholder="ค้นหารหัสหรือชื่อ"
            className="h-9 w-full sm:w-64"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-fg-muted">
          {filter === "incomplete" && !q ? "ทุกรายการครบแล้ว 🎉" : "ไม่พบรายการ"}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((row) => {
            const complete = isComplete(row);
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-2/50">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="truncate text-sm font-semibold text-fg">{row.code}</p>
                  <p className="truncate text-xs text-fg-muted">{row.name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PartChip name="BOM" state={row.bom} />
                  <PartChip name="Workflow" state={row.workflow} />
                </div>
                <Button type="button" size="sm" variant={complete ? "outline" : "primary"} className="w-24" onClick={() => open(row)}>
                  {complete ? "เปิดดู" : "ทำให้ครบ"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-fg-muted">
          <span>
            {(currentPage - 1) * PAGE_SIZE + 1}–{(currentPage - 1) * PAGE_SIZE + shown.length} จาก {filtered.length} รายการ
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" aria-label="หน้าก่อนหน้า" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <span className="tabular-nums text-fg-secondary">
              {currentPage} / {totalPages}
            </span>
            <Button type="button" size="sm" variant="outline" aria-label="หน้าถัดไป" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={openRow !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent size="xl" fullScreenOnMobile className="flex max-h-[90dvh] flex-col gap-0 p-0">
          {openRow && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
                <DialogTitle>{openRow.code}</DialogTitle>
                <DialogDescription>{openRow.name}</DialogDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  <PartChip name="BOM" state={openRow.bom} />
                  <PartChip name="Workflow" state={openRow.workflow} />
                </div>
              </DialogHeader>
              <div role="tablist" className="flex shrink-0 gap-1 border-b border-border px-4 pt-2">
                {(
                  [
                    { id: "versions", label: "BOM / Workflow ของรายการนี้" },
                    { id: "diagram", label: "แผนภาพองค์ประกอบ" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                      tab === t.id ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {tab === "diagram" ? (
                  openOwner ? <OwnerDetail owner={openOwner} /> : <p className="py-8 text-center text-sm text-fg-muted">ยังไม่มี BOM หรือ Workflow ให้แสดงแผนภาพ — ไปที่แท็บ “BOM / Workflow” เพื่อสร้าง</p>
                ) : (
                  <OwnerVersions
                    scope={scope}
                    owner={{ id: openRow.id, code: openRow.code, name: openRow.name, isActive: true }}
                    materials={materials}
                    processSteps={processSteps}
                    can={manage[scope]}
                    onChanged={() => router.refresh()}
                  />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

type VersionState = { key: string; bom: EngineeringVersion[]; workflow: EngineeringVersion[]; error: string | null } | null;

const STATUS_LABEL: Record<EngineeringVersion["status"], string> = { ACTIVE: "ใช้งาน", DRAFT: "ร่าง", INACTIVE: "ปิดใช้งาน" };

/** Versions of one owner's BOM + workflow, with edit and permanent delete. */
function OwnerVersions({
  scope,
  owner,
  materials,
  processSteps,
  can,
  onChanged,
}: {
  scope: EngineeringScope;
  owner: { id: string; code: string; name: string; isActive: boolean };
  materials: Material[];
  processSteps: ProcessStep[];
  can: { bom: boolean; workflow: boolean };
  onChanged: () => void;
}) {
  const [reload, setReload] = React.useState(0);
  const [state, setState] = React.useState<VersionState>(null);
  const [editor, setEditor] = React.useState<{ kind: EngineeringKind; base?: EngineeringVersion; editing: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ kind: EngineeringKind; version: EngineeringVersion } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const key = `${owner.id}:${reload}`;
  const loading = state?.key !== key;

  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([engineeringHistoryAction(scope, "bom", owner.id), engineeringHistoryAction(scope, "workflow", owner.id)]).then(([bom, workflow]) => {
      if (cancelled) return;
      setState({
        key,
        bom: bom.status === "success" ? bom.versions : [],
        workflow: workflow.status === "success" ? workflow.versions : [],
        error: bom.status === "error" ? bom.message : workflow.status === "error" ? workflow.message : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [scope, owner.id, key]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteEngineeringAction(scope, deleteTarget.kind, deleteTarget.version.id);
    setBusy(false);
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success(`ลบ ${deleteTarget.version.version} แล้ว`);
      setReload((n) => n + 1);
      onChanged();
    }
    setDeleteTarget(null);
  }

  const groups: Array<{ kind: EngineeringKind; label: string; versions: EngineeringVersion[]; allowed: boolean }> = [
    { kind: "bom", label: "BOM", versions: state?.bom ?? [], allowed: can.bom },
    { kind: "workflow", label: "Workflow", versions: state?.workflow ?? [], allowed: can.workflow },
  ];

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-surface-2/50 p-3">
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> กำลังโหลดเวอร์ชัน…
        </p>
      ) : (
        <>
          {state?.error && <Notice tone="danger">{state.error}</Notice>}
          {groups.map((g) => (
            <div key={g.kind}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-fg">{g.label}</h4>
                {g.allowed && g.versions.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditor({ kind: g.kind, editing: false })}>
                    <Plus className="size-3.5" aria-hidden="true" /> เวอร์ชันใหม่
                  </Button>
                )}
              </div>
              {g.versions.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-danger/40 bg-danger-soft/40 px-3 py-3">
                  <p className="text-sm text-danger-fg">ยังไม่มี {g.label}</p>
                  {g.allowed ? (
                    <Button type="button" size="sm" onClick={() => setEditor({ kind: g.kind, editing: false })}>
                      <Plus className="size-3.5" aria-hidden="true" /> สร้าง {g.label}
                    </Button>
                  ) : (
                    <span className="text-xs text-fg-muted">ไม่มีสิทธิ์สร้าง</span>
                  )}
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
                  {g.versions.map((v) => {
                    const count = g.kind === "bom" ? v.items?.length ?? 0 : v.steps?.length ?? 0;
                    return (
                      <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-fg">{v.version}</span>
                          <Badge variant={v.status === "ACTIVE" ? "success" : v.status === "DRAFT" ? "warning" : "neutral"}>{STATUS_LABEL[v.status]}</Badge>
                          <span className="text-xs text-fg-muted">{count} {g.kind === "bom" ? "รายการ" : "ขั้นตอน"}</span>
                        </div>
                        {g.allowed && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              title={v.status === "ACTIVE" ? "เวอร์ชันที่ใช้งานแก้ตรงไม่ได้ — จะบันทึกเป็นเวอร์ชันใหม่" : undefined}
                              onClick={() => setEditor({ kind: g.kind, base: v, editing: v.status !== "ACTIVE" })}
                            >
                              {v.status === "ACTIVE" ? "แก้ไข (เวอร์ชันใหม่)" : "แก้ไข"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={v.status === "ACTIVE"}
                              title={v.status === "ACTIVE" ? "ลบเวอร์ชันที่ใช้งานอยู่ไม่ได้" : undefined}
                              aria-label={`ลบ ${g.label} ${v.version}`}
                              onClick={() => setDeleteTarget({ kind: g.kind, version: v })}
                            >
                              <Trash2 className="size-4 text-danger" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {editor && (
        <EngineeringFormDialog
          scope={scope}
          kind={editor.kind}
          owner={owner}
          materials={materials}
          processSteps={processSteps}
          base={editor.base}
          editing={editor.editing}
          canActivate
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setReload((n) => n + 1);
            onChanged();
          }}
        />
      )}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteTarget(null);
        }}
        title={`ลบ ${deleteTarget?.version.version ?? ""} ถาวร?`}
        description={`${deleteTarget?.kind === "bom" ? "BOM" : "Workflow"} เวอร์ชันนี้และรายการข้างในจะถูกลบถาวร กู้คืนไม่ได้`}
        confirmLabel="ลบถาวร"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
