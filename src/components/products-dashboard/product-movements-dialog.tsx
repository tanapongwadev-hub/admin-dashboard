"use client";

import * as React from "react";
import { Loader2, PackageSearch } from "lucide-react";
import { getProductMovementsAction } from "@/app/(dashboard)/engineering/products/overview/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nf } from "@/components/materials-dashboard/materials-movement-overview";
import type { ProductMovementDetail } from "@/lib/api/products-dashboard";
import { formatThaiDate } from "@/lib/production-day";
import { cn } from "@/lib/utils";

type Filter = "all" | "receive" | "issue";
const PAGE_SIZES = [10, 20, 50];

function View({ code, name, from, to }: { code: string; name: string; from: string; to: string }) {
  // Keyed by "code|from|to" so a different target is detected by comparison
  // instead of a synchronous reset in the effect (set-state-in-effect rule).
  const key = `${code}|${from}|${to}`;
  const [result, setResult] = React.useState<
    { key: string; status: "success"; detail: ProductMovementDetail } | { key: string; status: "error"; message: string } | null
  >(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);

  React.useEffect(() => {
    let cancelled = false;
    getProductMovementsAction(code, from, to).then((res) => {
      if (cancelled) return;
      setResult(res.status === "success" ? { key, status: "success", detail: res.detail } : { key, status: "error", message: res.message });
    });
    return () => {
      cancelled = true;
    };
  }, [code, from, to, key]);

  const current = result?.key === key ? result : null;
  const detail = current?.status === "success" ? current.detail : null;
  const items = (detail?.items ?? []).filter((i) => filter === "all" || i.type === filter);
  const pages = Math.max(1, Math.ceil(items.length / limit));
  const safePage = Math.min(page, pages);
  const visible = items.slice((safePage - 1) * limit, safePage * limit);
  const unit = detail?.product?.unit ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-border px-6 py-5 pr-12">
        <p className="font-mono text-xs tracking-[0.05em] text-primary">{code}</p>
        <DialogTitle className="mt-1 text-lg font-semibold leading-tight text-fg">{name}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-fg-muted">
          รายการรับเข้า–จ่ายออก {formatThaiDate(from)}{from === to ? "" : ` – ${formatThaiDate(to)}`}
        </DialogDescription>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {current?.status === "error" ? (
          <p className="text-sm text-danger">{current.message}</p>
        ) : !detail ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> กำลังโหลดข้อมูล...
          </p>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3">
                <dt className="text-xs text-fg-muted">รับเข้า</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-success-fg">{nf.format(detail.totals.receivedQty)}</dd>
              </div>
              <div className="rounded-md border border-border p-3">
                <dt className="text-xs text-fg-muted">จ่ายออก</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-warning-fg">{nf.format(detail.totals.issuedQty)}</dd>
              </div>
              <div className="rounded-md border border-border p-3">
                <dt className="text-xs text-fg-muted">สุทธิ</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">
                  {detail.totals.receivedQty - detail.totals.issuedQty > 0 ? "+" : ""}
                  {nf.format(detail.totals.receivedQty - detail.totals.issuedQty)} <span className="text-xs font-normal text-fg-muted">{unit}</span>
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="ประเภทรายการ">
                {([["all", "ทั้งหมด"], ["receive", "รับเข้า"], ["issue", "จ่ายออก"]] as const).map(([key2, label]) => (
                  <button
                    key={key2}
                    type="button"
                    aria-pressed={filter === key2}
                    onClick={() => {
                      setFilter(key2);
                      setPage(1);
                    }}
                    className={cn("rounded px-3 py-1 text-xs font-medium", filter === key2 ? "bg-primary-soft text-primary" : "text-fg-secondary hover:bg-surface-2")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-fg-muted">{nf.format(items.length)} รายการ{detail.truncated ? " (แสดงสูงสุด 500 รายการล่าสุด)" : ""}</p>
            </div>

            {items.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
                <PackageSearch className="size-7 text-fg-muted" aria-hidden="true" />
                <p className="text-sm text-fg-muted">ไม่มีรายการในช่วงเวลานี้</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันเวลา</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">คงเหลือหลังรายการ</TableHead>
                      <TableHead>เลขอ้างอิง</TableHead>
                      <TableHead>ผู้บันทึก</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="whitespace-nowrap text-xs">{i.recordedAt}</TableCell>
                        <TableCell>
                          <Badge variant={i.type === "receive" ? "success" : "warning"}>{i.type === "receive" ? "รับเข้า" : "จ่ายออก"}</Badge>
                        </TableCell>
                        <TableCell className={cn("text-right font-medium tabular-nums", i.type === "receive" ? "text-success-fg" : "text-warning-fg")}>
                          {i.type === "receive" ? "+" : "−"}{nf.format(i.qty)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{nf.format(i.balanceAfter)}</TableCell>
                        <TableCell className="font-mono text-xs">{i.referenceNo}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-fg-secondary">{i.recordedBy ?? "—"}</TableCell>
                        <TableCell className="max-w-[16rem] truncate text-xs text-fg-muted" title={i.remark ?? undefined}>{i.remark ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                <span>หน้า {safePage} จาก {pages}</span>
                <div className="flex items-center gap-2">
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                    <SelectTrigger className="h-8 w-28" aria-label="จำนวนต่อหน้า"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (<SelectItem key={n} value={String(n)}>{n} / หน้า</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>ก่อนหน้า</Button>
                  <Button variant="outline" size="sm" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>ถัดไป</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ProductMovementsDialog({
  target,
  from,
  to,
  onClose,
}: {
  target: { code: string; name: string } | null;
  from: string;
  to: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl" fullScreenOnMobile className="flex max-h-[90vh] flex-col gap-0 p-0">
        {target && <View key={`${target.code}|${from}|${to}`} code={target.code} name={target.name} from={from} to={to} />}
      </DialogContent>
    </Dialog>
  );
}
