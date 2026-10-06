import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { QrCode, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { scanTrace, type OriginShare, type ScanResult, type TraceNode, type TransferTagTrace } from "@/lib/api/production-lots";
import { lotColorAt, type LotColor } from "@/lib/lot-colors";
import { formatThaiDate } from "@/lib/production-day";
import { apiErrorMessage } from "@/lib/user-error";
import { getCurrentSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "สอบกลับการผลิต" };

const fmt = (n: number) => n.toLocaleString("th-TH");

// Scan a box QR (QR-…-BOX001) or type a lot number; a plain GET form so a
// keyboard-wedge scanner (types + Enter) works with no client JS. The result
// is the backward lineage: box → FG lot → … → origin lots at the first step.
export default async function TraceabilityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getCurrentSession();
  const allowed =
    !!session && (session.user.isSuperAdmin || session.permissions.includes("PRODUCTION_ORDER_VIEW"));
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์สอบกลับการผลิต</p>
        <p className="max-w-sm text-sm text-fg-muted">กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Production Order View</p>
      </div>
    );
  }

  const q = ((await searchParams).q ?? "").trim();
  let result: ScanResult | null = null;
  let error: string | null = null;
  if (q) {
    const accessToken = (await cookies()).get("accessToken")!.value;
    try {
      result = await scanTrace(accessToken, q);
    } catch (err) {
      if (err instanceof ApiError) error = err.status === 404 ? `ไม่พบ QR หรือ Lot "${q}"` : apiErrorMessage(err);
      else throw err;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-fg">สอบกลับการผลิต</h1>
        <p className="text-sm text-fg-secondary">สแกน QR กล่อง หรือพิมพ์เลข Lot เพื่อดูว่ามาจาก Lot ไหน ผลิตวันไหน กะไหน</p>
      </div>
      <form method="get" className="flex max-w-xl gap-2" role="search">
        <div className="relative flex-1">
          <QrCode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <label htmlFor="trace-q" className="sr-only">
            QR กล่อง หรือ เลข Lot
          </label>
          <Input
            id="trace-q"
            name="q"
            defaultValue={q}
            placeholder="QR-FG-691005-001-BOX001 หรือ WE-691004-001"
            className="h-10 pl-9 font-mono"
            autoFocus
            autoComplete="off"
          />
        </div>
        <Button type="submit" className="h-10">
          <Search className="size-4" /> สอบกลับ
        </Button>
      </form>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-danger-fg">
          {error}
        </p>
      )}
      {result && <TraceResult result={result} />}
    </div>
  );
}

function collectOrigins(node: TraceNode, into = new Map<string, OriginShare>()) {
  for (const o of node.origins) if (!into.has(o.lotNo)) into.set(o.lotNo, o);
  node.links.forEach((child) => collectOrigins(child, into));
  return into;
}

function TraceResult({ result }: { result: ScanResult }) {
  const origins =
    result.kind === "TRANSFER" && result.box
      ? result.box.origins
      : result.kind === "PACKAGE" || result.kind === "TRANSFER"
        ? result.origins
        : result.lineage.origins;
  // Colors by position across every origin lot that appears in the tree.
  const palette = new Map<string, LotColor>();
  [...collectOrigins(result.lineage).keys()].sort().forEach((lotNo, i) => palette.set(lotNo, lotColorAt(i)));
  const total = origins.reduce((sum, o) => sum + o.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-fg-muted">{result.kind === "PACKAGE" ? "กล่อง FG" : result.kind === "TRANSFER" ? (result.box ? "QR กล่องส่งต่อ" : "QR ส่งต่อ (ทั้งชุด)") : "Lot"}</p>
            <p className="font-mono text-lg font-semibold text-fg">
              {result.kind === "TRANSFER" && result.box
                ? result.box.qrCode
                : result.kind === "PACKAGE" || result.kind === "TRANSFER"
                  ? result.qrCode
                  : result.lineage.lotNo}
            </p>
            {result.kind === "PACKAGE" && result.status === "VOID" && (
              <Badge variant="danger" className="mt-1">
                กล่องนี้ถูกยกเลิกแล้ว — ชิ้นงานกลับเข้า Lot และ QR นี้ใช้ไม่ได้
              </Badge>
            )}
            <p className="text-sm text-fg-secondary">
              <span className="font-mono text-primary">{result.product.code}</span> {result.product.name}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-fg-muted">ใบสั่งผลิต</dt>
            <dd>
              <Link href={`/products/process-orders/${result.productionOrder.id}`} className="font-mono text-primary hover:underline">
                {result.productionOrder.code}
              </Link>
            </dd>
            <dt className="text-fg-muted">แผนผลิต</dt>
            <dd className="font-mono text-fg">{result.productionPlan ?? "—"}</dd>
            {result.kind === "TRANSFER" && (
              <>
                <dt className="text-fg-muted">ส่งต่อ</dt>
                <dd className="text-fg">
                  {result.fromStep.code} → {result.toStep.code} {result.toStep.name}
                </dd>
                <dt className="text-fg-muted">Lot ที่ส่ง</dt>
                <dd className="font-mono text-fg">{result.sourceLotNo}</dd>
                {result.box && (
                  <>
                    <dt className="text-fg-muted">กล่อง</dt>
                    <dd className="text-fg">
                      {result.box.boxNo} / {result.box.boxCount} · {fmt(result.box.qty)} ชิ้น
                    </dd>
                  </>
                )}
                <dt className="text-fg-muted">จำนวนที่ส่ง (ทั้งชุด)</dt>
                <dd className="text-fg">{fmt(result.qty)} ชิ้น</dd>
              </>
            )}
            {result.kind === "PACKAGE" && (
              <>
                <dt className="text-fg-muted">จำนวนในกล่อง</dt>
                <dd className="text-fg">
                  {fmt(result.qty)} ชิ้น {result.unitType === "PARTIAL" && <Badge variant="warning">เศษ</Badge>}
                </dd>
                <dt className="text-fg-muted">รับเข้า</dt>
                <dd className="text-fg">{formatThaiDate(result.receivedDate)}</dd>
              </>
            )}
          </dl>
        </div>

        {result.kind === "TRANSFER" && <TransferWhere result={result} />}

        <h2 className="mt-4 text-sm font-semibold text-fg">ผลิตจาก Lot ต้นทาง</h2>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          {origins.map((o) => (
            <div key={o.lotNo} className={palette.get(o.lotNo)?.bar} style={{ width: `${total ? (o.qty / total) * 100 : 0}%` }} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-2">
          {origins.map((o) => (
            <li key={o.lotNo} className={cn("rounded px-2 py-1 text-xs", palette.get(o.lotNo)?.soft)}>
              <span className={cn("font-mono font-semibold", palette.get(o.lotNo)?.text)}>{o.lotNo}</span>
              <span className="ml-1.5 text-fg-secondary">
                {formatThaiDate(o.productionDate)} กะ {o.shift} · {fmt(o.qty)} ชิ้น
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md border border-border bg-surface p-4 shadow-sm" aria-labelledby="lineage-title">
        <h2 id="lineage-title" className="text-sm font-semibold text-fg">
          เส้นทางการผลิต (ย้อนกลับ)
        </h2>
        <ol className="mt-3">
          <LineageNode node={result.lineage} palette={palette} />
        </ol>
      </section>
    </div>
  );
}

/** Where a transfer batch is now: waiting, produced into which lots, scrapped, closed. */
function TransferWhere({ result }: { result: TransferTagTrace }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-surface-2/50 p-3">
      {result.box?.supersededBy && (
        <p role="alert" className="mb-2 rounded-md border border-warning/50 bg-warning-soft px-3 py-2 text-sm text-warning-fg">
          QR นี้เป็นป้ายเก่า — กล่องถูกแบ่งแล้ว ใช้ป้ายใหม่{" "}
          <Link
            href={`/production/traceability?q=${encodeURIComponent(result.box.supersededBy)}`}
            className="font-mono font-semibold underline"
          >
            {result.box.supersededBy}
          </Link>{" "}
          (เหลือ {fmt(result.box.left)} ชิ้น)
        </p>
      )}
      {result.box && (
        <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant={result.box.status === "DONE" ? "success" : result.box.status === "PARTIAL" ? "primary" : "warning"}
          >
            {result.box.status === "DONE" ? "ผลิตครบแล้ว" : result.box.status === "PARTIAL" ? "กำลังผลิต" : result.box.status === "CLOSED" ? "ปิดแล้ว" : "รอผลิต"}
          </Badge>
          <span className="text-fg-secondary">
            กล่องนี้ {result.toStep.code}: ผลิตแล้ว {fmt(result.box.doneQty)} / {fmt(result.box.qty)} ชิ้น
          </span>
        </p>
      )}
      <h2 className="text-sm font-semibold text-fg">ตอนนี้งานชุดนี้อยู่ที่ไหน</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        {result.waitingQty > 0 && (
          <li className="flex flex-wrap items-center gap-2">
            <Badge variant="warning">รอผลิต</Badge>
            <span className="font-mono font-semibold">{result.toStep.code}</span>
            <span className="text-fg-secondary">{fmt(result.waitingQty)} ชิ้น ยังรอผลิตที่ {result.toStep.name}</span>
          </li>
        )}
        {result.producedInto.map((p) => (
          <li key={p.lotNo} className="flex flex-wrap items-center gap-2">
            <Badge variant={p.lotRemainingQty > 0 ? "primary" : "neutral"}>ผลิตแล้ว</Badge>
            <Link
              href={`/production/traceability?q=${encodeURIComponent(p.lotNo)}`}
              className="font-mono font-semibold text-primary hover:underline"
            >
              {p.lotNo}
            </Link>
            <span className="text-fg-secondary">
              {p.stepCode} · {fmt(p.qty)} ชิ้น
              {p.lotRemainingQty > 0 ? ` (Lot นี้ยังเหลือ ${fmt(p.lotRemainingQty)} ชิ้นที่ ${p.stepCode})` : " (ส่งต่อ/แพ็กไปแล้ว)"}
            </span>
          </li>
        ))}
        {result.rejectedQty > 0 && (
          <li className="flex items-center gap-2">
            <Badge variant="danger">ของเสีย</Badge>
            <span className="text-fg-secondary">{fmt(result.rejectedQty)} ชิ้น</span>
          </li>
        )}
        {result.boxes.length > 1 && (
          <li className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-fg-muted">กล่องในชุดนี้:</span>
            {result.boxes.map((b) => (
              <Link
                key={b.qrCode}
                href={`/production/traceability?q=${encodeURIComponent(b.qrCode)}`}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-xs",
                  b.status === "DONE"
                    ? "border-success/40 bg-success-soft text-success-fg"
                    : b.status === "PARTIAL"
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border text-fg-secondary",
                )}
              >
                {b.boxNo} · {b.qty}
              </Link>
            ))}
          </li>
        )}
        {result.closedQty > 0 && (
          <li className="flex items-center gap-2">
            <Badge variant="neutral">ปิดยอด</Badge>
            <span className="text-fg-secondary">{fmt(result.closedQty)} ชิ้น</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function LineageNode({ node, palette }: { node: TraceNode; palette: Map<string, LotColor> }) {
  return (
    <li className="relative">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2">
        <Badge variant={node.lotType === "ORIGIN" ? "warning" : node.lotType === "FG" || node.lotType === "STORE" ? "success" : "neutral"}>
          {node.processCode}
        </Badge>
        <Link
          href={`/production/traceability?q=${encodeURIComponent(node.lotNo)}`}
          className={cn("font-mono text-sm font-semibold hover:underline", palette.get(node.lotNo)?.text ?? "text-fg")}
        >
          {node.lotNo}
        </Link>
        <span className="text-xs text-fg-secondary">
          ผลิต {formatThaiDate(node.productionDate)} กะ {node.shift} · {fmt(node.producedQty)} ชิ้น
        </span>
        {node.edgeQty !== null && (
          <span className="ml-auto text-xs font-medium text-primary">ส่งมา {fmt(node.edgeQty)} ชิ้น</span>
        )}
      </div>
      {node.links.length > 0 && (
        <ol className="ml-4 mt-2 flex flex-col gap-2 border-l-2 border-border pl-4">
          {node.links.map((child) => (
            <LineageNode key={child.lotId} node={child} palette={palette} />
          ))}
        </ol>
      )}
    </li>
  );
}
