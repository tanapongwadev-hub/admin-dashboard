"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Waypoints, Workflow } from "lucide-react";
import { CENTER_SIZE, DiagramNode, NODE_SIZE, useRadialPositions } from "@/components/products/products-bom-diagram";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { BomOverview, BomOverviewOwner } from "@/lib/api/bom-overview";
import { cn } from "@/lib/utils";

type Scope = "products" | "materials";
type Status = "DRAFT" | "ACTIVE" | "INACTIVE";

const STATUS_LABEL: Record<Status, string> = { ACTIVE: "ใช้งาน", DRAFT: "ร่าง", INACTIVE: "ปิดใช้งาน" };
const statusVariant = (s: Status) => (s === "ACTIVE" ? "success" : s === "DRAFT" ? "warning" : "neutral");

/** The version that is in use (ACTIVE) if any, otherwise the newest one. */
function headline<T extends { status: Status }>(versions: T[]): T | undefined {
  return versions.find((v) => v.status === "ACTIVE") ?? versions[0];
}

function StatusChip({ label, versions }: { label: string; versions: Array<{ status: Status; version: string }> }) {
  const main = headline(versions);
  if (!main) return <Badge variant="neutral">{label} — ไม่มี</Badge>;
  return (
    <Badge variant={statusVariant(main.status)}>
      {label} {main.version} · {STATUS_LABEL[main.status]}
      {versions.length > 1 ? ` (+${versions.length - 1})` : ""}
    </Badge>
  );
}

function VersionTabs<T extends { id: string; version: string; status: Status }>({
  versions,
  value,
  onChange,
}: {
  versions: T[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {versions.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={value === v.id}
          onClick={() => onChange(v.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            value === v.id ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-secondary hover:bg-surface-2"
          )}
        >
          {v.version}
          <Badge variant={statusVariant(v.status)}>{STATUS_LABEL[v.status]}</Badge>
        </button>
      ))}
    </div>
  );
}

function BomDiagram({ owner, bom }: { owner: BomOverviewOwner; bom: BomOverviewOwner["boms"][number] }) {
  const positions = useRadialPositions(bom.items.length);
  if (bom.items.length === 0) return <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีรายการวัตถุดิบใน BOM นี้</p>;
  // Phones are too narrow for a square: use a taller box there so the fixed-size nodes and labels do not collide (lines stretch with it, percentages still line up).
  return (
    <div className="relative mx-auto h-[24rem] w-full max-w-md sm:aspect-square sm:h-auto">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {positions.map((pos, i) => (
          <line key={i} x1={50} y1={50} x2={pos.x} y2={pos.y} stroke="var(--border-strong)" strokeWidth={0.6} />
        ))}
      </svg>
      <DiagramNode
        center
        imagePath={owner.imagePath?.trim() || null}
        alt={owner.name}
        label={owner.name}
        sublabel={owner.code}
        size={CENTER_SIZE}
        x={50}
        y={50}
      />
      {bom.items.map((item, i) => (
        <DiagramNode
          key={`${item.code}-${i}`}
          imagePath={item.imagePath?.trim() || null}
          alt={item.name}
          label={item.name}
          sublabel={`${Number(item.quantity)} ${item.unit ?? ""}${item.isScrap ? " · เศษ" : ""}`}
          size={NODE_SIZE}
          x={positions[i].x}
          y={positions[i].y}
        />
      ))}
    </div>
  );
}

function WorkflowChain({ wf }: { wf: BomOverviewOwner["workflows"][number] }) {
  if (wf.steps.length === 0) return <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มีขั้นตอนใน Workflow นี้</p>;
  return (
    <ol className="mx-auto flex max-w-sm flex-col">
      {wf.steps.map((s, idx) => (
        <li key={`${s.code}-${idx}`} className="relative flex items-center gap-3 pb-4 last:pb-0">
          {idx < wf.steps.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border-strong" aria-hidden="true" />}
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-success bg-success-soft text-xs font-semibold text-success">
            {idx + 1}
          </span>
          <div className="min-w-0 rounded-md border border-border bg-surface px-3 py-1.5">
            <p className="truncate text-sm font-medium text-fg">{s.name}</p>
            <p className="truncate text-[11px] text-fg-muted">{s.code}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OwnerDetail({ owner }: { owner: BomOverviewOwner }) {
  const [bomId, setBomId] = React.useState(headline(owner.boms)?.id ?? "");
  const [wfId, setWfId] = React.useState(headline(owner.workflows)?.id ?? "");
  const bom = owner.boms.find((b) => b.id === bomId);
  const wf = owner.workflows.find((w) => w.id === wfId);
  return (
    <div className="grid gap-6 bg-surface-2/50 px-4 py-4 lg:grid-cols-2">
      <section aria-label="แผนภาพองค์ประกอบ" className="min-w-0 rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Waypoints className="size-4 text-primary" aria-hidden="true" /> แผนภาพองค์ประกอบ — {owner.name}
          </h4>
          {owner.boms.length > 0 && <VersionTabs versions={owner.boms} value={bomId} onChange={setBomId} />}
        </div>
        {bom ? <BomDiagram owner={owner} bom={bom} /> : <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มี BOM</p>}
      </section>
      <section aria-label="กระบวนการผลิต" className="min-w-0 rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-fg">
            <Workflow className="size-4 text-success" aria-hidden="true" /> กระบวนการผลิต
          </h4>
          {owner.workflows.length > 0 && <VersionTabs versions={owner.workflows} value={wfId} onChange={setWfId} />}
        </div>
        {wf ? <WorkflowChain wf={wf} /> : <p className="py-10 text-center text-sm text-fg-muted">ยังไม่มี Workflow</p>}
      </section>
    </div>
  );
}

export function BomOverviewClient({ overview }: { overview: BomOverview }) {
  const [scope, setScope] = React.useState<Scope>("products");
  const [query, setQuery] = React.useState("");
  const [only, setOnly] = React.useState<"all" | "both" | "missing">("all");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const rows = overview[scope].filter((o) => {
    if (q && !o.code.toLowerCase().includes(q) && !o.name.toLowerCase().includes(q)) return false;
    const both = o.boms.length > 0 && o.workflows.length > 0;
    return only === "all" || (only === "both" ? both : !both);
  });

  const tabs: Array<{ id: Scope; label: string }> = [
    { id: "products", label: `สินค้า (${overview.products.length})` },
    { id: "materials", label: `วัสดุ (${overview.materials.length})` },
  ];
  const filters: Array<{ id: typeof only; label: string }> = [
    { id: "all", label: "ทั้งหมด" },
    { id: "both", label: "มีครบทั้งคู่" },
    { id: "missing", label: "ยังไม่ครบ" },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface" aria-label="รายการ BOM และ Workflow">
      <div role="tablist" className="flex gap-1 border-b border-border px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={scope === t.id}
            onClick={() => {
              setScope(t.id);
              setOpenId(null);
            }}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              scope === t.id ? "border-primary text-primary" : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <Input aria-label="ค้นหารายการ" placeholder="ค้นหารหัสหรือชื่อ" className="h-8 w-full sm:w-64" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex items-center gap-1" role="group" aria-label="กรองตามความครบถ้วน">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={only === f.id}
              onClick={() => setOnly(f.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                only === f.id ? "border-primary bg-primary-soft text-primary" : "border-border text-fg-secondary hover:bg-surface-2"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-fg-muted">พบ {rows.length} รายการ</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-fg-muted">ไม่พบรายการ</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-left text-xs font-semibold text-fg-secondary">
                <th className="w-10 px-3 py-2" aria-label="ขยาย" />
                <th className="px-3 py-2">รหัส</th>
                <th className="px-3 py-2">ชื่อ</th>
                <th className="px-3 py-2">BOM</th>
                <th className="px-3 py-2">Workflow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const open = openId === o.id;
                return (
                  <React.Fragment key={o.id}>
                    <tr className={cn("border-b border-border hover:bg-surface-2/60", open && "bg-surface-2/60")}>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-label={`${open ? "ซ่อน" : "ดู"}รายละเอียด ${o.code}`}
                          onClick={() => setOpenId(open ? null : o.id)}
                          className="rounded p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
                        >
                          {open ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-fg">
                        {o.code}
                        {!o.isActive && <Badge variant="neutral" className="ml-2">ปิดใช้งาน</Badge>}
                      </td>
                      <td className="px-3 py-2 text-fg-secondary">{o.name}</td>
                      <td className="px-3 py-2"><StatusChip label="BOM" versions={o.boms} /></td>
                      <td className="px-3 py-2"><StatusChip label="Workflow" versions={o.workflows} /></td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border">
                        <td colSpan={5} className="p-0">
                          <OwnerDetail owner={o} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
