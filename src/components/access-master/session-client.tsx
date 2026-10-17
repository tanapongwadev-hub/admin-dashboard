"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuthSessionRow, SessionsPage } from "@/lib/api/access-master";
import { revokeSessionAction } from "@/app/(dashboard)/system/access-actions";

function stateOf(session: AuthSessionRow, now: number) {
  if (session.revokedAt) return { label: "ยกเลิกแล้ว", variant: "neutral" as const };
  if (new Date(session.expiresAt).getTime() <= now) return { label: "หมดอายุ", variant: "warning" as const };
  return { label: "ใช้งานอยู่", variant: "success" as const };
}

const fmt = (value: string) =>
  new Date(value).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" });

export function SessionClient({ page, nowIso }: { page: SessionsPage; nowIso: string }) {
  const router = useRouter();
  const [target, setTarget] = React.useState<AuthSessionRow | null>(null);
  const [busy, setBusy] = React.useState(false);
  const now = new Date(nowIso).getTime();

  async function confirmRevoke() {
    if (!target) return;
    setBusy(true);
    const result = await revokeSessionAction(target.id);
    setBusy(false);
    if (result.status === "error") toast.error(result.message);
    else {
      toast.success("ยกเลิกเซสชันแล้ว ผู้ใช้จะถูกออกจากระบบ");
      router.refresh();
    }
    setTarget(null);
  }

  const { meta } = page;
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>แผนก / role</TableHead>
              <TableHead>เริ่ม</TableHead>
              <TableHead>หมดอายุ</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-28"><span className="sr-only">การจัดการ</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-fg-muted">ไม่มีเซสชัน</TableCell></TableRow>
            )}
            {page.items.map((session) => {
              const state = stateOf(session, now);
              const assignment = session.activeUserDepartmentRole;
              const name = [session.user?.firstName, session.user?.lastName].filter(Boolean).join(" ");
              return (
                <TableRow key={session.id}>
                  <TableCell>
                    <p className="font-medium text-fg">{session.user?.username ?? "—"}</p>
                    {name && <p className="text-xs text-fg-muted">{name}</p>}
                  </TableCell>
                  <TableCell className="text-fg-secondary">
                    {assignment ? `${assignment.department?.code ?? "ทุกแผนก"} · ${assignment.role?.nameTh ?? "—"}` : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-fg-secondary">{fmt(session.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-fg-secondary">{fmt(session.expiresAt)}</TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">{session.ipAddress ?? "—"}</TableCell>
                  <TableCell><Badge variant={state.variant} dot>{state.label}</Badge></TableCell>
                  <TableCell>
                    {state.label === "ใช้งานอยู่" && (
                      <Button size="sm" variant="danger" onClick={() => setTarget(session)}>
                        <Ban className="mr-1 size-3.5" aria-hidden />ยกเลิก
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-fg-secondary">
        <span>หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems} เซสชัน</span>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" aria-disabled={meta.page <= 1} className={meta.page <= 1 ? "pointer-events-none opacity-50" : ""}>
            <Link href={`/system/sessions?page=${Math.max(1, meta.page - 1)}`}>ก่อนหน้า</Link>
          </Button>
          <Button asChild variant="outline" size="sm" aria-disabled={meta.page >= meta.totalPages} className={meta.page >= meta.totalPages ? "pointer-events-none opacity-50" : ""}>
            <Link href={`/system/sessions?page=${meta.page + 1}`}>ถัดไป</Link>
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => { if (!open && !busy) setTarget(null); }}
        title={`ยกเลิกเซสชันของ ${target?.user?.username ?? ""}?`}
        description="ผู้ใช้จะถูกออกจากระบบจากอุปกรณ์นี้ และต้องเข้าสู่ระบบใหม่"
        confirmLabel="ยกเลิกเซสชัน"
        onConfirm={() => void confirmRevoke()}
      />
    </div>
  );
}
