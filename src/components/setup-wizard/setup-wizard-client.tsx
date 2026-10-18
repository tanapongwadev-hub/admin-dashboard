"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, CheckCircle2, FolderOpen, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MasterDataSelect, type MasterDataSelectOption } from "@/components/ui/master-data-select";
import {
  deleteSetupDraftAction,
  runSetupAction,
  saveSetupDraftAction,
} from "@/app/(dashboard)/engineering/setup/actions";
import type { MaterialLookups } from "@/lib/api/materials";
import type { ProductLookupItem, ProductLookups } from "@/lib/api/products";
import type { SetupDraftRecord, SetupDraftSummary } from "@/lib/api/setup-wizard";
import {
  emptyMaterial,
  isNewMaterialRef,
  newMaterialKey,
  newMaterialRef,
  SETUP_STEPS,
  emptySetupData,
  nextRowKey,
  resetRowKeys,
  setupDraftTitle,
  validateSetupStep,
  type SetupData,
  type SetupMaterialData,
} from "@/lib/setup-wizard";
import { cn } from "@/lib/utils";

interface CatalogMaterial {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

interface Props {
  materialLookups: MaterialLookups;
  productLookups: ProductLookups;
  materials: CatalogMaterial[];
  processSteps: Array<{ id: string; code: string; nameTh: string }>;
  drafts: SetupDraftSummary[];
  initialDraft: SetupDraftRecord | null;
  can: {
    material: boolean;
    product: boolean;
    bom: boolean;
    workflow: boolean;
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
    created: migrateCreated(raw),
  };
}

function Field({ label, htmlFor, required, children, hint }: { label: string; htmlFor?: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

function StepRail({ current, done, summaries, onSelect }: { current: number; done: boolean[]; summaries: string[]; onSelect: (index: number) => void }) {
  return (
    <nav aria-label="ขั้นตอนการสร้างครบชุด" className="rounded-xl border border-border bg-surface p-2">
      <ol className="flex gap-1 overflow-x-auto">
        {SETUP_STEPS.map((step, index) => {
          const state = index === current ? "active" : done[index] ? "done" : "upcoming";
          return (
            <li key={step.id} className="min-w-40 flex-1">
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={state === "active" ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-l-4 px-3 py-2.5 text-left transition-colors",
                  state === "active" ? "border-l-primary bg-primary-soft" : "border-l-transparent hover:bg-surface-2"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    state === "done" && "bg-success text-white",
                    state === "active" && "bg-primary text-primary-fg",
                    state === "upcoming" && "bg-surface-2 text-fg-muted"
                  )}
                >
                  {state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold", state === "upcoming" ? "text-fg-secondary" : "text-fg")}>{step.label}</span>
                  <span className="block truncate text-xs text-fg-muted">{summaries[index]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SetupWizardClient({ materialLookups, productLookups, materials, processSteps, drafts, initialDraft, can }: Props) {
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

  const stepErrors = SETUP_STEPS.map((_, i) => (i < 4 ? validateSetupStep(i, data) : null));
  const done = SETUP_STEPS.map((_, i) => i < 4 && i < step && stepErrors[i] === null);

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

  function goNext() {
    const error = validateSetupStep(step, data);
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(s + 1, SETUP_STEPS.length - 1));
  }

  async function handleRun() {
    for (let i = 0; i < 4; i += 1) {
      const error = validateSetupStep(i, data);
      if (error) {
        toast.error(`ขั้นตอน ${SETUP_STEPS[i].label}: ${error}`);
        setStep(i);
        return;
      }
    }
    setRunning(true);
    setProblem(null);
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
        <h2 className="text-lg font-semibold text-fg">สร้างครบชุดเรียบร้อย</h2>
        <ul className="text-sm text-fg-secondary">
          {createdMaterialCount > 0 && <li>วัสดุใหม่ {createdMaterialCount} รายการถูกสร้างแล้ว</li>}
          <li>สินค้า {data.product.code} ถูกสร้างแล้ว</li>
          {data.created.bomId && <li>BOM {data.activate ? "(เปิดใช้งานแล้ว)" : "(ฉบับร่าง)"}</li>}
          {data.created.workflowId && <li>Workflow {data.activate ? "(เปิดใช้งานแล้ว)" : "(ฉบับร่าง)"}</li>}
        </ul>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild><Link href="/engineering/products">ไปที่รายการสินค้า</Link></Button>
          <Button asChild variant="outline"><Link href="/engineering/bom/products">ไปที่ BOM / Workflow</Link></Button>
          <Button variant="outline" onClick={() => router.push("/engineering/setup")}>เริ่มชุดใหม่</Button>
        </div>
      </div>
    );
  }

  const locked = running;
  const isLast = step === SETUP_STEPS.length - 1;
  const summaries = [
    !data.materialsEnabled ? "ข้าม" : createdMaterialCount > 0 ? `สร้างแล้ว ${createdMaterialCount}/${data.materials.length}` : `${data.materials.length} รายการ`,
    data.created.productId ? `สร้างแล้ว · ${data.product.code}` : data.product.code.trim() || "ยังไม่กรอก",
    data.created.bomId ? "สร้างแล้ว" : data.bomEnabled ? `${data.bomRows.length} รายการ` : "ข้าม",
    data.created.workflowId ? "สร้างแล้ว" : data.workflowEnabled ? `${data.workflowRows.length} ขั้นตอน` : "ข้าม",
    "ตรวจทานแล้วสร้าง",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
      <div className="contents">
      {drafts.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4" aria-label="ร่างของฉัน">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <FolderOpen className="size-4 text-primary" aria-hidden="true" /> ร่างของฉัน ({drafts.length})
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {drafts.map((draft) => (
              <li key={draft.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {draft.title || "ร่างที่ยังไม่ตั้งชื่อ"}
                    {draftRef?.id === draft.id && <Badge variant="primary" className="ml-2">กำลังแก้ไข</Badge>}
                  </p>
                  <p className="text-xs text-fg-muted">
                    ขั้นตอนที่ {draft.step + 1} · {SETUP_STEPS[draft.step]?.label} · บันทึกเมื่อ{" "}
                    {new Date(draft.updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" asChild><Link href={`/engineering/setup?draft=${draft.id}`}>ทำต่อ</Link></Button>
                  <Button size="icon" variant="ghost" aria-label={`ลบร่าง ${draft.title}`} onClick={() => setDeleteTarget(draft)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <StepRail current={step} done={done} summaries={summaries} onSelect={setStep} />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="rounded-t-xl border-b border-border bg-surface-2 px-5 py-2.5 text-xs font-medium text-fg-muted">
          ขั้นตอนที่ {step + 1} จาก {SETUP_STEPS.length}
          {draftRef && <span className="ml-2 text-primary">· กำลังแก้ไขร่าง</span>}
        </div>

        <fieldset disabled={locked} className="min-w-0 border-0 p-5">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="วัสดุ" desc="สร้างวัสดุใหม่ (ชิ้นงาน PCS) ที่จะใช้เป็นส่วนประกอบ หรือข้ามไปถ้าใช้วัสดุที่มีอยู่แล้ว" />
              {!can.material ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้างวัสดุ (MATERIAL_CREATE) — ข้ามขั้นตอนนี้และเลือกวัสดุที่มีอยู่ใน BOM แทน</Notice>
              ) : (
                <>
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox
                      checked={!data.materialsEnabled}
                      onCheckedChange={(v) => setData((d) => ({ ...d, materialsEnabled: v !== true }))}
                    />
                    ไม่สร้างวัสดุใหม่ (ใช้วัสดุที่มีอยู่แล้วใน BOM)
                  </label>
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
                          <Notice key={m.key} tone="success">สร้างวัสดุ {m.code} ไปแล้ว ไม่ต้องกรอกซ้ำ</Notice>
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
                          />
                        )
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="self-start"
                        onClick={() => setData((d) => ({ ...d, materials: [...d.materials, emptyMaterial()] }))}
                      >
                        <Plus className="size-4" aria-hidden="true" /> เพิ่มวัสดุใหม่อีกรายการ
                      </Button>
                      <p className="text-xs text-fg-muted">รูปภาพวัสดุและวัสดุแบบ Pipe/Sheet/Coil เพิ่มได้ภายหลังที่หน้าทะเบียนวัสดุ</p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="สินค้า" desc="ข้อมูลหลักของสินค้า" />
              {!can.product ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้างสินค้า (PRODUCTS_CREATE)</Notice>
              ) : data.created.productId ? (
                <Notice tone="success">สร้างสินค้า {data.product.code} ไปแล้ว ไม่ต้องกรอกซ้ำ</Notice>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="รหัสสินค้า" htmlFor="sw-p-code" required>
                    <Input id="sw-p-code" maxLength={50} value={data.product.code} onChange={(e) => patchProduct({ code: e.target.value })} />
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
                  <p className="text-xs text-fg-muted sm:col-span-2">รูปภาพสินค้าเพิ่มได้ภายหลังที่หน้ารายการสินค้า</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <StepHeading title="BOM" desc="รายการวัตถุดิบที่ใช้ต่อสินค้า 1 หน่วย" />
              {!can.bom ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้าง BOM (BOMS_CREATE)</Notice>
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
                      {data.bomRows.map((row, index) => {
                        const options: MasterDataSelectOption[] = [
                          ...newMaterialOptions,
                          ...materials.map((m) => ({ id: m.id, label: `${m.code} · ${m.name}` })),
                        ].filter((o) => o.id === row.materialId || !data.bomRows.some((r) => r.materialId === o.id));
                        const update = (patch: Partial<typeof row>) =>
                          setData((d) => ({ ...d, bomRows: d.bomRows.map((r) => (r.key === row.key ? { ...r, ...patch } : r)) }));
                        return (
                          <div key={row.key} className="grid gap-3 rounded-lg border border-border border-l-4 border-l-primary p-3 sm:grid-cols-[1fr_9rem_7rem_7rem_auto] sm:items-end">
                            <Field label={`รายการที่ ${index + 1} · วัตถุดิบ`}>
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
                            </Field>
                            <Field label="หน่วย">
                              <MasterDataSelect options={unitOptions} value={row.unitId} onValueChange={(v) => update({ unitId: v })} placeholder="หน่วย" href="/master-data/units" resourceLabel="หน่วย" />
                            </Field>
                            <Field label="จำนวน" htmlFor={`sw-b-q-${row.key}`}>
                              <Input id={`sw-b-q-${row.key}`} type="number" min={0} step="any" value={row.quantity} onChange={(e) => update({ quantity: e.target.value })} />
                            </Field>
                            <Field label="สูญเสีย %" htmlFor={`sw-b-w-${row.key}`}>
                              <Input id={`sw-b-w-${row.key}`} type="number" min={0} max={100} step="any" value={row.wastagePercent} onChange={(e) => update({ wastagePercent: e.target.value })} />
                            </Field>
                            <Button type="button" size="icon" variant="ghost" aria-label="ลบรายการ" onClick={() => setData((d) => ({ ...d, bomRows: d.bomRows.filter((r) => r.key !== row.key) }))}>
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </div>
                        );
                      })}
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
              <StepHeading title="Workflow" desc="ลำดับขั้นตอนการผลิตของสินค้า" />
              {!can.workflow ? (
                <Notice>บัญชีของคุณไม่มีสิทธิ์สร้าง Workflow (PRODUCT_WORKFLOWS_CREATE)</Notice>
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
                          <div key={row.key} className="grid gap-3 rounded-lg border border-border border-l-4 border-l-success p-3 sm:grid-cols-[2.5rem_1fr_1fr_auto] sm:items-end">
                            <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success">{index + 1}</span>
                            <Field label="กระบวนการ">
                              <MasterDataSelect options={options} value={row.processStepId} onValueChange={(v) => update({ processStepId: v })} placeholder="เลือกกระบวนการ" href="/master-data/process-steps" resourceLabel="กระบวนการผลิต" />
                            </Field>
                            <Field label="รายละเอียด (ไม่บังคับ)" htmlFor={`sw-w-d-${row.key}`}>
                              <Input id={`sw-w-d-${row.key}`} value={row.description} onChange={(e) => update({ description: e.target.value })} />
                            </Field>
                            <div className="flex gap-1">
                              <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนขึ้น" disabled={index === 0} onClick={() => move(-1)}>↑</Button>
                              <Button type="button" size="icon" variant="ghost" aria-label="เลื่อนลง" disabled={index === data.workflowRows.length - 1} onClick={() => move(1)}>↓</Button>
                              <Button type="button" size="icon" variant="ghost" aria-label="ลบขั้นตอน" onClick={() => setData((d) => ({ ...d, workflowRows: d.workflowRows.filter((r) => r.key !== row.key) }))}>
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
              <StepHeading title="ตรวจสอบและสร้าง" desc="ระบบจะสร้างตามลำดับ วัสดุ → สินค้า → BOM → Workflow ถ้าขั้นใดล้มเหลว ส่วนที่สร้างแล้วจะถูกเก็บไว้ในร่างและทำต่อได้" />
              <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border text-sm">
                <ReviewRow
                  label="วัสดุ"
                  status={!data.materialsEnabled ? "skip" : createdMaterialCount === data.materials.length ? "created" : "todo"}
                  value={data.materialsEnabled ? data.materials.map((m) => m.code.trim() || "—").join(", ") : "ไม่สร้างใหม่"}
                />
                <ReviewRow label="สินค้า" status={data.created.productId ? "created" : "todo"} value={`${data.product.code} · ${data.product.name}`} />
                <ReviewRow label="BOM" status={data.created.bomId ? "created" : data.bomEnabled ? "todo" : "skip"} value={data.bomEnabled ? `${data.bomRows.length} รายการ` : "ข้าม"} />
                <ReviewRow label="Workflow" status={data.created.workflowId ? "created" : data.workflowEnabled ? "todo" : "skip"} value={data.workflowEnabled ? `${data.workflowRows.length} ขั้นตอน` : "ข้าม"} />
              </dl>
              {(data.bomEnabled || data.workflowEnabled) && (
                <label className="flex items-center gap-2 text-sm text-fg">
                  <Checkbox
                    checked={data.activate && can.activateBom && can.activateWorkflow}
                    disabled={!can.activateBom || !can.activateWorkflow}
                    onCheckedChange={(v) => setData((d) => ({ ...d, activate: v === true }))}
                  />
                  เปิดใช้งาน BOM และ Workflow ทันที (ถ้าไม่เลือก จะสร้างเป็นฉบับร่าง)
                </label>
              )}
              {problem && <Notice tone="danger">{problem}</Notice>}
            </div>
          )}
        </fieldset>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-border bg-surface-2 px-5 py-4 shadow-[0_-4px_12px_-8px_rgb(0_0_0/0.25)]">
          <Button type="button" variant="outline" disabled={step === 0 || locked} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="size-4" aria-hidden="true" /> ย้อนกลับ
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={savingDraft || locked} onClick={() => void persistDraft(data, step)}>
              {savingDraft ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />} บันทึกร่าง
            </Button>
            {isLast ? (
              <Button type="button" disabled={locked} onClick={() => void handleRun()}>
                {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                {Object.keys(data.created).length > 0 ? "สร้างส่วนที่เหลือ" : "สร้างทั้งหมด"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
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
}: {
  m: SetupMaterialData;
  index: number;
  onPatch: (patch: Partial<SetupMaterialData>) => void;
  onRemove?: () => void;
  unitOptions: MasterDataSelectOption[];
  supplierOptions: MasterDataSelectOption[];
  materialTypeOptions: MasterDataSelectOption[];
}) {
  const id = (name: string) => `sw-m-${name}-${m.key}`;
  return (
    <section className="rounded-lg border border-border border-l-4 border-l-primary" aria-label={`วัสดุใหม่ที่ ${index + 1}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-primary-soft/50 px-3 py-2">
        <p className="text-sm font-semibold text-fg">
          วัสดุใหม่ที่ {index + 1}
          {m.code.trim() && <span className="ml-2 font-normal text-fg-muted">{m.code.trim()}</span>}
        </p>
        {onRemove && (
          <Button type="button" size="icon" variant="ghost" aria-label={`ลบวัสดุใหม่ที่ ${index + 1}`} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="grid gap-4 p-3 sm:grid-cols-2">
        <Field label="รหัสวัสดุ" htmlFor={id("code")} required>
          <Input id={id("code")} maxLength={50} value={m.code} onChange={(e) => onPatch({ code: e.target.value })} />
        </Field>
        <Field label="ชื่อวัสดุ" htmlFor={id("name")} required>
          <Input id={id("name")} maxLength={255} value={m.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </Field>
        <Field label="หน่วย" required>
          <MasterDataSelect options={unitOptions} value={m.unitId} onValueChange={(v) => onPatch({ unitId: v })} placeholder="เลือกหน่วย" href="/master-data/units" resourceLabel="หน่วย" />
        </Field>
        <Field label="ประเภทวัสดุ (ไม่บังคับ)">
          <MasterDataSelect options={materialTypeOptions} value={m.materialTypeId} onValueChange={(v) => onPatch({ materialTypeId: v })} placeholder="เลือกประเภท" href="/master-data/material-types" resourceLabel="ประเภทวัสดุ" />
        </Field>
        <Field label="Location Type">
          <MasterDataSelect
            options={[{ id: "external", label: "ภายนอก (External)" }, { id: "internal", label: "ภายใน (Internal)" }]}
            value={m.locationType}
            onValueChange={(v) => onPatch({ locationType: v === "internal" ? "internal" : "external" })}
            placeholder="เลือก" href="/materials/catalog" resourceLabel="Location Type"
          />
        </Field>
        <Field label="จำนวนต่อแพ็ก" htmlFor={id("pack")}>
          <Input id={id("pack")} type="number" min={1} value={m.packingQuantity} onChange={(e) => onPatch({ packingQuantity: e.target.value })} />
        </Field>
        <Field label="สต็อกขั้นต่ำ" htmlFor={id("min")}>
          <Input id={id("min")} type="number" min={0} value={m.minimumStock} onChange={(e) => onPatch({ minimumStock: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ซัพพลายเออร์" required hint="เพิ่มได้หลายราย — ต้องมีอย่างน้อย 1 รายจึงจะรับเข้าได้">
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
          <Field label="ข้อกำหนดเฉพาะ (ไม่บังคับ)" htmlFor={id("spec")}>
            <Textarea id={id("spec")} rows={2} value={m.specification} onChange={(e) => onPatch({ specification: e.target.value })} />
          </Field>
        </div>
      </div>
    </section>
  );
}
