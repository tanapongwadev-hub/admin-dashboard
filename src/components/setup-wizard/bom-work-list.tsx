"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Material } from "@/lib/api/materials";
import type { ProcessStep } from "@/lib/api/process-steps";
import type { EngineeringKind, EngineeringScope, EngineeringVersion } from "@/lib/api/engineering";
import { deleteEngineeringAction, engineeringHistoryAction } from "@/app/(dashboard)/engineering/bom/actions";
import { OwnerDetail } from "@/components/bom-overview/bom-overview-client";
import type { BomOverview } from "@/lib/api/bom-overview";
import { EngineeringFormDialog } from "@/components/engineering/engineering-form-dialog";
import { type SetupMode } from "@/lib/setup-wizard";
import { cn } from "@/lib/utils";
import type { ManageCan } from "./setup-wizard-client";
import { Notice } from "./wizard-ui";

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
export function BomWorkList({
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
    <section className="rounded-lg border border-border bg-surface" aria-label="รายการ BOM และ Workflow">
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
