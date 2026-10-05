"use client";

import type { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FilterX, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogListItem, PaginatedAuditLogs } from "@/lib/api/audit-logs";
import { getAuditOutcomePresentation } from "@/lib/audit-log-outcome";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function actorName(actor: AuditLogListItem["actorUser"]) {
  if (!actor) return "ระบบ / ไม่ระบุผู้ใช้";
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
  return name || actor.username;
}

function target(item: AuditLogListItem) {
  if (!item.targetType) return "—";
  return item.targetId ? `${item.targetType} #${item.targetId}` : item.targetType;
}

export function AuditLogsView({ auditLogs }: { auditLogs: PaginatedAuditLogs }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlAction = params.get("action") ?? "";
  const urlUserId = params.get("userId") ?? "";

  function navigate(next: URLSearchParams) {
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action") ?? "").trim();
    const userId = String(form.get("userId") ?? "").trim();
    const next = new URLSearchParams(params.toString());
    if (action) next.set("action", action);
    else next.delete("action");
    if (userId) next.set("userId", userId);
    else next.delete("userId");
    next.delete("page");
    navigate(next);
  }

  function clearFilters() {
    const next = new URLSearchParams(params.toString());
    ["action", "userId", "page"].forEach((key) => next.delete(key));
    navigate(next);
  }

  function goToPage(page: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(page));
    navigate(next);
  }

  const hasFilters = Boolean(urlAction || urlUserId);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden border-l-4 border-l-primary">
        <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <ScrollText className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-fg">เหตุการณ์ล่าสุด</p>
              <p className="mt-0.5 text-sm text-fg-muted">
                แสดง {auditLogs.items.length.toLocaleString("th-TH")} จากทั้งหมด {auditLogs.meta.totalItems.toLocaleString("th-TH")} รายการ
              </p>
            </div>
          </div>
          <p className="max-w-lg text-sm text-fg-muted">
            หน้ารวมแสดงเฉพาะข้อมูลระบุตัวเหตุการณ์และผลลัพธ์ เพื่อไม่เปิดเผยข้อมูลการเปลี่ยนแปลงที่ละเอียดอ่อน
          </p>
        </CardContent>
      </Card>

      <form
        key={`${urlAction}|${urlUserId}`}
        onSubmit={applyFilters}
        className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 sm:flex-row sm:items-end"
      >
        <div className="w-full sm:max-w-sm">
          <label htmlFor="audit-action" className="mb-1 block text-xs font-medium text-fg-muted">
            Action
          </label>
          <Input
          id="audit-action"
          name="action"
          defaultValue={urlAction}
          placeholder="ค้นหา action เช่น AUTH_LOGIN"
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="audit-user-id" className="mb-1 block text-xs font-medium text-fg-muted">
            รหัสผู้ใช้
          </label>
          <Input
            id="audit-user-id"
            name="userId"
            defaultValue={urlUserId}
            placeholder="เช่น 42"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">กรองรายการ</Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="gap-1.5">
              <FilterX className="size-4" />
              ล้าง
            </Button>
          )}
        </div>
      </form>

      {auditLogs.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium text-fg">ไม่พบบันทึกการใช้งาน</p>
          <p className="mt-1 text-sm text-fg-muted">
            {hasFilters ? "ลองล้างหรือปรับเงื่อนไขการกรอง" : "เหตุการณ์ที่บันทึกแล้วจะแสดงในหน้านี้"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เวลาเกิดเหตุการณ์</TableHead>
                <TableHead>เหตุการณ์</TableHead>
                <TableHead>ผู้ดำเนินการ</TableHead>
                <TableHead>เป้าหมาย</TableHead>
                <TableHead>ผลลัพธ์</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.items.map((item) => {
                const outcome = getAuditOutcomePresentation(item.outcome);
                return (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-sm text-fg-secondary">
                    {formatTime(item.occurredAt)}
                  </TableCell>
                  <TableCell className="min-w-56">
                    <p className="font-mono text-xs font-medium text-fg">{item.eventName}</p>
                    <p className="mt-1 font-mono text-xs text-fg-muted">{item.action}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-fg">{actorName(item.actorUser)}</p>
                    {item.actorUser?.username && (
                      <p className="mt-0.5 text-xs text-fg-muted">@{item.actorUser.username}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-secondary">{target(item)}</TableCell>
                  <TableCell>
                    <Badge variant={outcome.variant} dot>
                      {outcome.label}
                    </Badge>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {auditLogs.items.length > 0 && (
        <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            หน้า {auditLogs.meta.page} จาก {Math.max(1, auditLogs.meta.totalPages)}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={auditLogs.meta.page <= 1}
              onClick={() => goToPage(auditLogs.meta.page - 1)}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={auditLogs.meta.page >= auditLogs.meta.totalPages}
              onClick={() => goToPage(auditLogs.meta.page + 1)}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
