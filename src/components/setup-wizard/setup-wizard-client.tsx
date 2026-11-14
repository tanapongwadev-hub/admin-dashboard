"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Package, Check, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MasterDataSelect, type MasterDataSelectOption } from "@/components/ui/master-data-select";
import { uploadProductImageAction } from "@/app/(dashboard)/engineering/products/actions";
import { checkMaterialCodeAction } from "@/app/(dashboard)/materials/catalog/actions";
import { deleteSetupDraftAction, runSetupAction, saveSetupDraftAction, checkProductCodeAction } from "@/app/(dashboard)/engineering/setup/actions";
import type { Material, MaterialLookups } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";
import { useCodeAvailability } from "@/hooks/use-code-availability";
import type { BomOverview } from "@/lib/api/bom-overview";
import type { ProductLookupItem, ProductLookups } from "@/lib/api/products";
import type { SetupDraftRecord, SetupDraftSummary, SetupOverview } from "@/lib/api/setup-wizard";
import { emptyMaterial, emptyOwnerMaterial, ownerInfo, isNewMaterialRef, newMaterialKey, newMaterialRef, SETUP_STEPS, stepLabels, visibleSteps, emptySetupData, nextRowKey, resetRowKeys, setupDraftTitle, validateSetupStep, type SetupData, type SetupMaterialData } from "@/lib/setup-wizard";
import { Field, SourceSwitch, CodeFeedback, StepHeading, Notice, ReviewRow } from "./wizard-ui";
import { StepRail, ExistingMaterialList, MaterialCard, ExistingInternalCard, ImageField, ModeChooser } from "./wizard-sections";

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
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-14 text-center">
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

      <div className="min-w-0 rounded-lg border border-border bg-surface">
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
                      <div className="scroll-cue-x overflow-x-auto rounded-lg border border-border">
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
                      <div className="scroll-cue-x overflow-x-auto rounded-lg border border-border">
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
                                    <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-xs font-semibold text-success-fg">{index + 1}</span>
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


