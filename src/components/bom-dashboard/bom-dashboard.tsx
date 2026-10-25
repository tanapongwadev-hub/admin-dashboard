import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, FileClock, GitBranch, Layers, ListOrdered, Package, Scissors, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BomOverview, BomOverviewOwner } from "@/lib/api/bom-overview";
import { formatNumber } from "@/lib/utils";

export interface BomDashboardTotals {
  /** Active owners that can have a BOM/Workflow (products / internal non-raw materials) */
  products: { id: string; code: string; name: string }[];
  materials: { id: string; code: string; name: string }[];
}

type Owner = { id: string; code: string; name: string };

function analyse(owners: Owner[], listed: BomOverviewOwner[]) {
  const byId = new Map(listed.map((o) => [o.id, o]));
  let bomActive = 0;
  let workflowActive = 0;
  let complete = 0;
  let draftVersions = 0;
  const noBom: Owner[] = [];
  const noWorkflow: Owner[] = [];
  const withDraft: { owner: Owner; drafts: number }[] = [];
  for (const owner of owners) {
    const entry = byId.get(owner.id);
    const hasBom = !!entry?.boms.some((b) => b.status === "ACTIVE");
    const hasWorkflow = !!entry?.workflows.some((w) => w.status === "ACTIVE");
    if (hasBom) bomActive += 1;
    else noBom.push(owner);
    if (hasWorkflow) workflowActive += 1;
    else noWorkflow.push(owner);
    if (hasBom && hasWorkflow) complete += 1;
    const drafts =
      (entry?.boms.filter((b) => b.status === "DRAFT").length ?? 0) +
      (entry?.workflows.filter((w) => w.status === "DRAFT").length ?? 0);
    draftVersions += drafts;
    if (drafts > 0) withDraft.push({ owner, drafts });
  }
  return { total: owners.length, bomActive, workflowActive, complete, draftVersions, noBom, noWorkflow, withDraft };
}

const pct = (value: number, total: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

function Kpi({ label, value, hint, tone = "default", icon: Icon }: { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "danger"; icon: typeof Layers }) {
  const toneClass = { default: "bg-primary-soft text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-fg">{value}</p>
        {hint && <p className="truncate text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

function Coverage({ label, value, total, tone }: { label: string; value: number; total: number; tone: "success" | "primary" | "info" }) {
  const percent = pct(value, total);
  const bar = { success: "bg-success", primary: "bg-primary", info: "bg-info" }[tone];
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-fg">{label}</span>
        <span className="tabular-nums text-fg-secondary">
          {formatNumber(value)} / {formatNumber(total)} <span className="text-xs text-fg-muted">({percent}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function OwnerList({ title, empty, owners, scope, icon: Icon, tone }: { title: string; empty: string; owners: { owner: Owner; note?: string }[]; scope: "products" | "materials"; icon: typeof Layers; tone: "warning" | "danger" }) {
  const shown = owners.slice(0, 6);
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon className={`size-4 ${tone === "danger" ? "text-danger" : "text-warning"}`} aria-hidden="true" />
          {title}
        </h4>
        <Badge variant={owners.length ? tone : "success"}>{formatNumber(owners.length)}</Badge>
      </div>
      {shown.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-fg-muted">
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />{empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map(({ owner, note }) => (
            <li key={owner.id}>
              <Link href={`/engineering/setup`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs text-fg-muted">{owner.code}</span> <span className="text-fg">{owner.name}</span>
                </span>
                {note && <span className="shrink-0 text-xs text-fg-muted">{note}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {owners.length > shown.length && <p className="border-t border-border px-4 py-2 text-xs text-fg-muted">และอีก {formatNumber(owners.length - shown.length)} รายการ</p>}
    </div>
  );
}

function ScopeSection({ scope, title, subtitle, icon: Icon, owners, listed }: { scope: "products" | "materials"; title: string; subtitle: string; icon: typeof Layers; owners: Owner[]; listed: BomOverviewOwner[] }) {
  const a = analyse(owners, listed);
  return (
    <section aria-labelledby={`bomdash-${scope}`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
          <div>
            <h3 id={`bomdash-${scope}`} className="text-lg font-semibold text-fg">{title}</h3>
            <p className="text-xs text-fg-muted">{subtitle}</p>
          </div>
        </div>
        <Link href={`/engineering/setup`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium text-primary hover:bg-surface-2">
          จัดการ<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={scope === "products" ? "สินค้าที่ใช้งาน" : "วัตถุดิบภายในที่ใช้งาน"} value={formatNumber(a.total)} icon={Layers} />
        <Kpi label="พร้อมผลิต (BOM + Workflow ใช้งาน)" value={formatNumber(a.complete)} hint={`${pct(a.complete, a.total)}% ของทั้งหมด`} tone="success" icon={CheckCircle2} />
        <Kpi label="ยังไม่ครบชุด" value={formatNumber(a.total - a.complete)} hint="ขาด BOM หรือ Workflow ที่ใช้งาน" tone={a.total - a.complete > 0 ? "danger" : "default"} icon={TriangleAlert} />
        <Kpi label="ฉบับร่างรอเปิดใช้" value={formatNumber(a.draftVersions)} hint="BOM + Workflow ที่ยังเป็นร่าง" tone={a.draftVersions > 0 ? "warning" : "default"} icon={FileClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <h4 className="text-sm font-semibold text-fg">ความครอบคลุม</h4>
          <Coverage label="มี BOM ที่ใช้งาน" value={a.bomActive} total={a.total} tone="primary" />
          <Coverage label="มี Workflow ที่ใช้งาน" value={a.workflowActive} total={a.total} tone="info" />
          <Coverage label="ครบทั้งสอง (พร้อมผลิต)" value={a.complete} total={a.total} tone="success" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <OwnerList title="ยังไม่มี BOM ใช้งาน" empty="ทุกรายการมี BOM ใช้งานแล้ว" owners={a.noBom.map((owner) => ({ owner }))} scope={scope} icon={Layers} tone="danger" />
          <OwnerList title="ยังไม่มี Workflow ใช้งาน" empty="ทุกรายการมี Workflow ใช้งานแล้ว" owners={a.noWorkflow.map((owner) => ({ owner }))} scope={scope} icon={ListOrdered} tone="danger" />
        </div>
      </div>

      {a.withDraft.length > 0 && (
        <OwnerList title="มีฉบับร่างรอเปิดใช้" empty="" owners={a.withDraft.map(({ owner, drafts }) => ({ owner, note: `${drafts} ฉบับร่าง` }))} scope={scope} icon={CircleDashed} tone="warning" />
      )}
    </section>
  );
}

/** Most-used components across ACTIVE BOMs (products + materials together). */
function TopComponents({ overview }: { overview: BomOverview }) {
  const usage = new Map<string, { code: string; name: string; boms: number }>();
  for (const owner of [...overview.products, ...overview.materials]) {
    for (const bom of owner.boms) {
      if (bom.status !== "ACTIVE") continue;
      for (const item of bom.items) {
        const current = usage.get(item.code) ?? { code: item.code, name: item.name, boms: 0 };
        current.boms += 1;
        usage.set(item.code, current);
      }
    }
  }
  const top = [...usage.values()].sort((x, y) => y.boms - x.boms || x.code.localeCompare(y.code)).slice(0, 8);
  const max = top[0]?.boms ?? 1;
  return (
    <section aria-labelledby="bomdash-top" className="rounded-lg border border-border bg-surface p-4">
      <h3 id="bomdash-top" className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <GitBranch className="size-4 text-primary" aria-hidden="true" />วัสดุที่ถูกใช้ใน BOM มากที่สุด (เฉพาะ BOM ที่ใช้งาน)
      </h3>
      {top.length === 0 ? (
        <p className="text-sm text-fg-muted">ยังไม่มี BOM ที่ใช้งาน</p>
      ) : (
        <ul className="space-y-2">
          {top.map((row) => (
            <li key={row.code} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="min-w-0 truncate"><span className="font-mono text-xs text-fg-muted">{row.code}</span> <span className="text-fg">{row.name}</span></span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-primary" style={{ width: `${pct(row.boms, max)}%` }} /></span>
              <span className="tabular-nums text-fg-secondary">{formatNumber(row.boms)} BOM</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function BomDashboard({ overview, totals }: { overview: BomOverview; totals: BomDashboardTotals }) {
  return (
    <div className="space-y-8">
      <ScopeSection scope="products" title="สินค้า" subtitle="สูตรและขั้นตอนผลิตสินค้าสำเร็จรูป" icon={Package} owners={totals.products} listed={overview.products} />
      <ScopeSection scope="materials" title="วัตถุดิบภายใน" subtitle="สูตรและขั้นตอนแปรรูป Material ปลายทาง" icon={Scissors} owners={totals.materials} listed={overview.materials} />
      <TopComponents overview={overview} />
    </div>
  );
}
