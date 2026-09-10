import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  PackagePlus,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  MaterialInventoryItem,
  MaterialInventorySummary,
  MaterialStockStatus,
} from "@/lib/api/materials";
import type { MaterialReceiving, MaterialReceivingStatus } from "@/lib/api/materials-receiving";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatQuantity(value: string) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value));
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
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

const stockStatusMeta: Record<MaterialStockStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  NORMAL: { label: "ปกติ", variant: "success" },
  LOW_STOCK: { label: "สต็อกต่ำ", variant: "warning" },
  OUT_OF_STOCK: { label: "หมดสต็อก", variant: "danger" },
};

const receivingStatusMeta: Record<MaterialReceivingStatus, { label: string; variant: "neutral" | "success" | "danger" }> = {
  draft: { label: "ร่าง", variant: "neutral" },
  confirmed: { label: "ยืนยันแล้ว", variant: "success" },
  cancelled: { label: "ยกเลิก", variant: "danger" },
};

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | null;
  note: string;
  icon: typeof Boxes;
  tone: string;
}) {
  return (
    <Card className="materials-dashboard-panel min-w-0 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-fg">
            {value === null ? "—" : formatCount(value)}
          </p>
          <p className="mt-1 truncate text-xs text-fg-secondary">{note}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", tone)} aria-hidden="true">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
      </div>
    </Card>
  );
}

function StockHealth({ summary, canViewMaterials }: { summary: MaterialInventorySummary; canViewMaterials: boolean }) {
  const actionable = summary.lowStock + summary.outOfStock;
  const healthyPercent = summary.total > 0 ? Math.round((summary.normal / summary.total) * 100) : 0;
  const normalWidth = summary.total > 0 ? (summary.normal / summary.total) * 100 : 0;
  const lowWidth = summary.total > 0 ? (summary.lowStock / summary.total) * 100 : 0;
  const outWidth = summary.total > 0 ? (summary.outOfStock / summary.total) * 100 : 0;

  return (
    <Card className="materials-dashboard-panel overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Stock health rail</p>
              <h2 className="mt-2 text-xl font-semibold text-fg">ความพร้อมของวัตถุดิบ</h2>
              <p className="mt-1 text-sm text-fg-muted">วัดจากวัสดุที่เปิดใช้งานเทียบกับ Minimum Stock</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-semibold tracking-tight tabular-nums text-fg">{healthyPercent}%</p>
              <p className="text-xs text-fg-muted">อยู่ในระดับปกติ</p>
            </div>
          </div>

          <div
            className="mt-7 flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={`สต็อกปกติ ${summary.normal} รายการ สต็อกต่ำ ${summary.lowStock} รายการ หมดสต็อก ${summary.outOfStock} รายการ`}
          >
            <span className="bg-success" style={{ width: `${normalWidth}%` }} />
            <span className="bg-warning" style={{ width: `${lowWidth}%` }} />
            <span className="bg-danger" style={{ width: `${outWidth}%` }} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <HealthLegend label="ปกติ" value={summary.normal} dotClassName="bg-success" />
            <HealthLegend label="สต็อกต่ำ" value={summary.lowStock} dotClassName="bg-warning" />
            <HealthLegend label="หมดสต็อก" value={summary.outOfStock} dotClassName="bg-danger" />
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-border bg-surface-2/55 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div>
            <span className={cn(
              "flex size-10 items-center justify-center rounded-md",
              actionable > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
            )}>
              {actionable > 0 ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
            </span>
            <p className="mt-4 text-lg font-semibold text-fg">
              {actionable > 0 ? `${formatCount(actionable)} รายการต้องตรวจสอบ` : "สต็อกพร้อมสำหรับการผลิต"}
            </p>
            <p className="mt-1 text-sm leading-6 text-fg-muted">
              {actionable > 0
                ? "เริ่มจากรายการหมดสต็อก แล้วตรวจแผนรับเข้าของรายการที่ต่ำกว่าจุดขั้นต่ำ"
                : "ยังไม่มีวัสดุที่ต่ำกว่าจุดขั้นต่ำในขณะนี้"}
            </p>
          </div>
          {canViewMaterials && (
            <Button asChild variant="outline" className="mt-5 w-full justify-between">
              <Link href="/materials/pc">
                เปิดรายการสต็อก
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function HealthLegend({ label, value, dotClassName }: { label: string; value: number; dotClassName: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span className={cn("size-2 shrink-0 rounded-full", dotClassName)} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 pl-4 text-sm font-semibold tabular-nums text-fg">{formatCount(value)}</p>
    </div>
  );
}

function CriticalMaterialRow({ material, canOpen }: { material: MaterialInventoryItem; canOpen: boolean }) {
  const meta = stockStatusMeta[material.stockStatus];
  const content = (
    <>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-xs font-semibold text-primary">{material.code}</span>
          <Badge variant={meta.variant} dot>{meta.label}</Badge>
        </div>
        <p className="mt-1 truncate text-sm font-medium text-fg">{material.name}</p>
        <p className="mt-0.5 truncate text-xs text-fg-muted">
          {material.loadingPoint?.nameTh ?? "ยังไม่ระบุจุดจัดเก็บ"}
        </p>
      </div>
      <div className="flex items-end justify-between gap-4 sm:block sm:text-right">
        <p className="text-lg font-semibold tabular-nums text-fg">
          {formatQuantity(material.currentStock)}
          <span className="ml-1 text-xs font-normal text-fg-muted">{material.unit?.symbol ?? material.unit?.code ?? "หน่วย"}</span>
        </p>
        <p className="text-xs text-fg-muted">ขั้นต่ำ {formatQuantity(material.minimumStock)}</p>
      </div>
    </>
  );
  const rowClassName = "grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";

  if (!canOpen) return <div className={rowClassName}>{content}</div>;

  return (
    <Link
      href={`/materials/pc?search=${encodeURIComponent(material.code)}`}
      className={cn(
        rowClassName,
        "group transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      )}
    >
      {content}
    </Link>
  );
}

function CriticalMaterials({
  items,
  canViewStock,
  canViewMaterials,
}: {
  items: MaterialInventoryItem[];
  canViewStock: boolean;
  canViewMaterials: boolean;
}) {
  return (
    <Card className="materials-dashboard-panel min-w-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-fg">คิววัตถุดิบที่ต้องดูแล</h2>
          <p className="mt-1 text-xs text-fg-muted">หมดสต็อกก่อน แล้วตามด้วยรายการต่ำกว่าจุดขั้นต่ำ</p>
        </div>
        {canViewMaterials && (
          <Button asChild variant="link" size="sm">
            <Link href="/materials/pc">ดูทั้งหมด</Link>
          </Button>
        )}
      </header>

      {!canViewStock ? (
        <EmptyPanel icon={Warehouse} title="ไม่มีสิทธิ์ดูยอดคงเหลือ" description="ยังเปิดดูข้อมูลพื้นฐานวัตถุดิบได้จาก Material Master" />
      ) : items.length === 0 ? (
        <EmptyPanel icon={CheckCircle2} title="ไม่มีรายการที่ต้องติดตาม" description="วัสดุที่เปิดใช้งานทั้งหมดอยู่ในระดับปกติ" />
      ) : (
        <div className="divide-y divide-border">
          {items.map((material) => (
            <CriticalMaterialRow key={material.id} material={material} canOpen={canViewMaterials} />
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentReceiving({ items, total }: { items: MaterialReceiving[]; total: number | null }) {
  return (
    <Card className="materials-dashboard-panel min-w-0 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-fg">รับเข้าล่าสุด</h2>
          <p className="mt-1 text-xs text-fg-muted">เอกสารและล็อตที่เคลื่อนไหวล่าสุด</p>
        </div>
        <Button asChild variant="link" size="sm">
          <Link href="/materials/materials-receiving">ดูทั้งหมด</Link>
        </Button>
      </header>

      {items.length === 0 ? (
        <EmptyPanel icon={ClipboardList} title="ยังไม่มีรายการรับเข้า" description="รายการใหม่จะปรากฏที่นี่หลังเริ่มรับวัตถุดิบ" />
      ) : (
        <div className="divide-y divide-border">
          {items.map((receiving) => {
            const meta = receivingStatusMeta[receiving.status];
            return (
              <Link
                key={receiving.id}
                href={`/materials/materials-receiving?search=${encodeURIComponent(receiving.internalLotNo)}`}
                className="group flex gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden="true">
                  <PackageCheck className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-fg">{receiving.internalLotNo}</span>
                    <Badge variant={meta.variant} dot>{meta.label}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-fg">{receiving.material?.name ?? "ไม่พบข้อมูลวัสดุ"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
                    <span>รับเข้า {formatQuantity(receiving.receiveQuantity)} · {formatCount(receiving.packageCount)} กล่อง</span>
                    <span className="flex items-center gap-1"><Clock3 className="size-3" />{formatThaiDate(receiving.receiveDate)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {total !== null && (
        <footer className="border-t border-border bg-surface-2/45 px-5 py-3 text-xs text-fg-muted">
          เอกสารรับเข้าทั้งหมด <span className="font-semibold tabular-nums text-fg">{formatCount(total)}</span> รายการ
        </footer>
      )}
    </Card>
  );
}

function EmptyPanel({ icon: Icon, title, description }: { icon: typeof Warehouse; title: string; description: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-fg-muted" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-fg-muted">{description}</p>
    </div>
  );
}

export function MaterialsDashboardView({
  inventorySummary,
  materialTotal,
  criticalMaterials,
  recentReceivings,
  receivingTotal,
  canViewMaterials,
  canViewStock,
  canCreateReceiving,
}: {
  inventorySummary: MaterialInventorySummary | null;
  materialTotal: number;
  criticalMaterials: MaterialInventoryItem[];
  recentReceivings: MaterialReceiving[];
  receivingTotal: number | null;
  canViewMaterials: boolean;
  canViewStock: boolean;
  canCreateReceiving: boolean;
}) {
  return (
    <div className="@container flex flex-col gap-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Materials control tower</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg sm:text-3xl">ภาพรวมวัตถุดิบ</h1>
          <p className="mt-1.5 text-sm text-fg-muted">สถานะคลังและงานรับเข้า ณ {formatUpdatedDate()}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewMaterials && (
            <Button asChild variant="outline">
              <Link href="/materials/pc">
                <Boxes className="size-4" aria-hidden="true" />
                จัดการวัตถุดิบ
              </Link>
            </Button>
          )}
          {canCreateReceiving && (
            <Button asChild>
              <Link href="/materials/materials-receiving">
                <PackagePlus className="size-4" aria-hidden="true" />
                รับเข้าวัตถุดิบ
              </Link>
            </Button>
          )}
        </div>
      </header>

      {inventorySummary ? (
        <StockHealth summary={inventorySummary} canViewMaterials={canViewMaterials} />
      ) : (
        <Card className="materials-dashboard-panel border-dashed p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-info-soft text-info" aria-hidden="true">
              <Warehouse className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">ภาพรวมสต็อกถูกจำกัดตามสิทธิ์</h2>
              <p className="mt-1 text-sm leading-6 text-fg-muted">คุณยังดูและจัดการข้อมูล Material Master ได้ แต่ยอดคงเหลือและรายการรับเข้าต้องใช้สิทธิ์ Materials Receiving View</p>
            </div>
          </div>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 @min-[52rem]:grid-cols-4" aria-label="ตัวชี้วัดวัตถุดิบ">
        <MetricCard label="วัสดุใช้งาน" value={materialTotal} note="รายการใน Material Master" icon={Boxes} tone="bg-primary-soft text-primary" />
        <MetricCard label="สต็อกปกติ" value={inventorySummary?.normal ?? null} note="พร้อมจ่ายเข้าสายการผลิต" icon={CheckCircle2} tone="bg-success-soft text-success" />
        <MetricCard label="สต็อกต่ำ" value={inventorySummary?.lowStock ?? null} note="ต่ำกว่าจุดขั้นต่ำ" icon={AlertTriangle} tone="bg-warning-soft text-warning" />
        <MetricCard label="หมดสต็อก" value={inventorySummary?.outOfStock ?? null} note="ควรดำเนินการก่อน" icon={TriangleAlert} tone="bg-danger-soft text-danger" />
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <CriticalMaterials items={criticalMaterials} canViewStock={canViewStock} canViewMaterials={canViewMaterials} />
        {canViewStock ? (
          <RecentReceiving items={recentReceivings} total={receivingTotal} />
        ) : (
          <Card className="materials-dashboard-panel min-w-0 overflow-hidden">
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-fg">รับเข้าล่าสุด</h2>
              <p className="mt-1 text-xs text-fg-muted">เอกสารและล็อตที่เคลื่อนไหวล่าสุด</p>
            </header>
            <EmptyPanel icon={ClipboardList} title="ไม่มีสิทธิ์ดูรายการรับเข้า" description="ขอสิทธิ์ Materials Receiving View เพื่อดูประวัติล็อตและสถานะเอกสาร" />
          </Card>
        )}
      </div>
    </div>
  );
}
