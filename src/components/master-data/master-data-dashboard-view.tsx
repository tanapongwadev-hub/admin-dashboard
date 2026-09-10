import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, Layers, ShieldOff, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatUpdatedDate() {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());
}

export interface MasterDataResourceCard {
  key: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  // null = the viewer lacks the resource's own VIEW permission, so no counts
  // were fetched and the card renders as locked rather than linking through.
  total: number | null;
  active: number | null;
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="min-w-0 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-fg">{formatCount(value)}</p>
          <p className="mt-1 truncate text-xs text-fg-secondary">{note}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", tone)} aria-hidden="true">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </div>
    </Card>
  );
}

function ResourceCard({ resource }: { resource: MasterDataResourceCard }) {
  const Icon = resource.icon;
  const locked = resource.total === null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            locked ? "bg-surface-2 text-fg-muted" : "bg-primary-soft text-primary"
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        {!locked && (
          <ArrowRight
            className="size-4 text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-4 min-w-0">
        <h3 className="truncate text-sm font-semibold text-fg">{resource.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-muted">{resource.description}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2 border-t border-border pt-3">
        {locked ? (
          <p className="flex items-center gap-1.5 text-xs text-fg-muted">
            <ShieldOff className="size-3.5" aria-hidden="true" />
            ไม่มีสิทธิ์เข้าถึง
          </p>
        ) : (
          <>
            <p className="text-2xl font-semibold tabular-nums text-fg">
              {formatCount(resource.total ?? 0)}
              <span className="ml-1.5 text-xs font-normal text-fg-muted">รายการ</span>
            </p>
            <p className="text-xs text-fg-muted">ใช้งานอยู่ {formatCount(resource.active ?? 0)}</p>
          </>
        )}
      </div>
    </>
  );

  if (locked) {
    return (
      <Card className="min-w-0 border-dashed p-5 opacity-70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">{body}</Card>
    );
  }

  return (
    <Link href={resource.href} className="group block min-w-0">
      <Card className="min-w-0 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors group-hover:border-primary/40 group-hover:bg-surface-2/40">
        {body}
      </Card>
    </Link>
  );
}

export function MasterDataDashboardView({ resources }: { resources: MasterDataResourceCard[] }) {
  const visible = resources.filter((r) => r.total !== null);
  const totalRecords = visible.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const totalActive = visible.reduce((sum, r) => sum + (r.active ?? 0), 0);
  const totalInactive = totalRecords - totalActive;

  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Master data control tower</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">ข้อมูลหลัก</h1>
          <p className="mt-1.5 text-sm text-fg-muted">ภาพรวมข้อมูลอ้างอิงของระบบ ณ {formatUpdatedDate()}</p>
        </div>
      </header>

      {visible.length === 0 ? (
        <Card className="border-dashed p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-info-soft text-info" aria-hidden="true">
              <ShieldOff className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงข้อมูลหลักรายการใด</h2>
              <p className="mt-1 text-sm leading-6 text-fg-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ View ของข้อมูลหลักที่ต้องการ</p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 @min-[40rem]:grid-cols-3" aria-label="ตัวชี้วัดข้อมูลหลัก">
            <MetricCard label="หมวดข้อมูลที่เข้าถึงได้" value={visible.length} note={`จากทั้งหมด ${resources.length} หมวด`} icon={Database} tone="bg-primary-soft text-primary" />
            <MetricCard label="ใช้งานอยู่" value={totalActive} note="รายการที่เปิดใช้งานทุกหมวด" icon={CheckCircle2} tone="bg-success-soft text-success" />
            <MetricCard label="ปิดใช้งาน" value={totalInactive} note="รายการที่ถูกปิดใช้งานทุกหมวด" icon={Layers} tone="bg-warning-soft text-warning" />
          </section>

          <section
            className="grid grid-cols-1 gap-3 @min-[28rem]:grid-cols-2 @min-[56rem]:grid-cols-3 @min-[72rem]:grid-cols-4"
            aria-label="รายการข้อมูลหลัก"
          >
            {resources.map((resource) => (
              <ResourceCard key={resource.key} resource={resource} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
