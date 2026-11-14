import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, FileSearch } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DashboardEmptyState } from "@/components/dashboard/chart-card";
import { recentDocuments } from "@/lib/dashboard-data";
import type { StockDocStatus, StockDocument } from "@/lib/dashboard-data";

const statusVariant: Record<StockDocStatus, NonNullable<BadgeProps["variant"]>> = {
  Draft: "neutral",
  Confirmed: "success",
  Cancelled: "danger",
};

const statusLabel: Record<StockDocStatus, string> = {
  Draft: "ร่าง",
  Confirmed: "ยืนยันแล้ว",
  Cancelled: "ยกเลิก",
};

// `documents` defaults to the same slice this rendered before, so a bare
// <RecentDocuments /> is unchanged; the dashboard passes its filtered set.
export function RecentDocuments({
  documents = recentDocuments.slice(0, 6),
  onClearFilters,
  unavailable = false,
}: {
  documents?: StockDocument[];
  unavailable?: boolean;
  onClearFilters?: () => void;
}) {
  const recent = documents;

  if (recent.length === 0) {
    return (
      <DashboardEmptyState
        icon={FileSearch}
        title={unavailable ? "ยังแสดงเอกสารไม่ได้ครบ" : "ยังไม่มีเอกสาร"}
        description={unavailable ? "กดรีเฟรชด้านบนเพื่อลองโหลดเอกสารใหม่" : "ยังไม่มีเอกสารรับเข้าหรือเบิกจ่ายตามสิทธิ์ของคุณ"}
        action={
          onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              ล้างตัวกรอง
            </Button>
          )
        }
      />
    );
  }

  return (
    <Table className="min-w-[44rem]">
      <TableHeader>
        <TableRow>
          <TableHead>เอกสาร</TableHead>
          <TableHead>วัสดุ</TableHead>
          <TableHead>ผู้จัดจำหน่าย / สายการผลิต</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead className="text-right">จำนวน / รายการ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recent.map((doc) => (
          <TableRow key={`${doc.type}-${doc.id}`}>
            <TableCell className="font-medium text-fg">
              <span className="flex items-center gap-1.5">
                {doc.type === "Receiving" ? (
                  <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-info" />
                ) : (
                  <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-warning" />
                )}
                <Link className="inline-flex min-h-6 items-center whitespace-nowrap text-primary underline underline-offset-4 pointer-coarse:min-h-11" href={`${doc.type === "Receiving" ? "/materials/receiving" : "/materials/disbursements"}?search=${encodeURIComponent(doc.id)}`}>{doc.id}</Link>
              </span>
            </TableCell>
            <TableCell className="text-fg-secondary">{doc.material}</TableCell>
            <TableCell className="text-fg-muted">{doc.counterparty}</TableCell>
            <TableCell>
              {/* Thai label + dot + variant — status is never carried by
                  color alone (see the accessibility note in AGENTS.md). */}
              <Badge variant={statusVariant[doc.status]} dot>
                {statusLabel[doc.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium text-fg">
              {doc.qty.toLocaleString()} {doc.unit}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RecentDocumentsFooter({ canViewReceiving = false, canViewDisbursement = false }: { canViewReceiving?: boolean; canViewDisbursement?: boolean }) {
  return <>
    {canViewReceiving && <Button variant="ghost" size="sm" asChild><Link href="/materials/receiving">ดูเอกสารรับเข้า</Link></Button>}
    {canViewDisbursement && <Button variant="ghost" size="sm" asChild><Link href="/materials/disbursements">ดูเอกสารเบิกจ่าย</Link></Button>}
  </>;
}
