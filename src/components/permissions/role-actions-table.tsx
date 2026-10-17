"use client";

import * as React from "react";
import { toast } from "sonner";
import { Info, Loader2, RefreshCw, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { diffRoleActions, toggleRoleAction, type RoleActionMap } from "@/lib/permission-matrix";
import type { MatrixAction, RoleSummary } from "@/lib/api/permission-access";
import { refreshRolesAction, saveRoleActionsAction } from "@/app/(dashboard)/system/permissions/actions";

const SUPER_ADMIN = "SUPER_ADMIN";

function toRoleActionMap(roles: readonly RoleSummary[]): RoleActionMap {
  const map: RoleActionMap = {};
  for (const role of roles) {
    if (role.code !== SUPER_ADMIN) map[role.id] = [...role.actionCodes];
  }
  return map;
}

/**
 * Role × action grid. A role is the ceiling of actions its users may do in
 * whatever menus their department opens (see the department tab).
 */
export function RoleActionsTable({
  initialRoles,
  actions,
}: {
  initialRoles: RoleSummary[];
  actions: MatrixAction[];
}) {
  const [roles, setRoles] = React.useState(initialRoles);
  const [saved, setSaved] = React.useState<RoleActionMap>(() => toRoleActionMap(initialRoles));
  const [current, setCurrent] = React.useState<RoleActionMap>(saved);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [reloading, setReloading] = React.useState(false);

  const sortedRoles = React.useMemo(
    () =>
      [...roles].sort(
        (a, b) => Number(b.code === SUPER_ADMIN) - Number(a.code === SUPER_ADMIN) || a.code.localeCompare(b.code),
      ),
    [roles],
  );
  const changes = React.useMemo(() => diffRoleActions(saved, current), [saved, current]);
  const changedRoles = roles.filter((role) => changes.some((item) => item.roleId === role.id));
  const affectedUsers = changedRoles.reduce((sum, role) => sum + role.userCount, 0);
  const losesRead = changes.filter(
    (item) => saved[item.roleId]?.includes("READ") && !item.actionCodes.includes("READ"),
  );

  function replaceRoles(next: RoleSummary[]) {
    const map = toRoleActionMap(next);
    setRoles(next);
    setSaved(map);
    setCurrent(map);
  }

  async function reload() {
    setReloading(true);
    const result = await refreshRolesAction();
    setReloading(false);
    if (result.status === "success") {
      replaceRoles(result.roles);
      toast.success("โหลดข้อมูล role ล่าสุดแล้ว");
    } else {
      toast.error(result.message);
    }
  }

  async function handleSave() {
    if (!reason.trim()) return;
    setSaving(true);
    const result = await saveRoleActionsAction(reason.trim(), changes);
    setSaving(false);
    if (result.status === "success") {
      replaceRoles(result.roles);
      setSaveOpen(false);
      setReason("");
      toast.success(`บันทึก action ของ ${result.changed} role แล้ว`);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <p className="flex max-w-2xl items-start gap-2 text-sm text-fg-secondary">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          role กำหนดว่าผู้ใช้ทำ action ไหนได้บ้าง ใช้กับทุกเมนูที่แผนกของผู้ใช้เปิดไว้ การเปิด action อื่นจะเปิด &quot;อ่าน&quot; ให้อัตโนมัติ และการปิด &quot;อ่าน&quot; จะปิดทุก action ของ role นั้น
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {changes.length > 0 && <Badge variant="warning">เปลี่ยน {changes.length} role</Badge>}
          <Button variant="ghost" size="sm" onClick={reload} disabled={reloading || saving}>
            {reloading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            โหลดใหม่
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(saved)} disabled={changes.length === 0 || saving}>
            <RotateCcw className="size-4" />
            รีเซ็ต
          </Button>
          <Button size="sm" onClick={() => setSaveOpen(true)} disabled={changes.length === 0 || saving}>
            <Save className="size-4" />
            บันทึก
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-52 border-b border-border bg-surface-2 px-4 py-2.5 text-left font-semibold text-fg">
                Role
              </th>
              {actions.map((action) => (
                <th
                  key={action.id}
                  scope="col"
                  className="border-b border-border bg-surface-2 px-2 py-2.5 text-center text-xs font-semibold text-fg-secondary"
                >
                  {action.nameTh}
                  <span className="block font-mono text-[10px] font-normal text-fg-muted">{action.code}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRoles.map((role) => {
              const superAdmin = role.code === SUPER_ADMIN;
              const codes = superAdmin ? null : (current[role.id] ?? []);
              const changed = changes.some((item) => item.roleId === role.id);
              return (
                <tr key={role.id} className={cn(!role.isActive && "opacity-60")}>
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-[5] border-b border-border bg-surface px-4 py-2.5 text-left font-normal",
                      changed && "shadow-[inset_3px_0_0_var(--primary)]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-fg">{role.nameTh}</span>
                      {!role.isActive && <Badge>ปิดใช้งาน</Badge>}
                      {superAdmin && (
                        <Badge variant="info">
                          <ShieldCheck className="size-3" aria-hidden />
                          ข้ามการตรวจสิทธิ์
                        </Badge>
                      )}
                    </div>
                    <span className="block font-mono text-[11px] text-fg-muted">
                      {role.code} · ผู้ใช้ {role.userCount} คน
                    </span>
                  </th>
                  {actions.map((action) => (
                    <td key={action.id} className="border-b border-border px-2 py-2.5 text-center">
                      <Checkbox
                        checked={superAdmin ? true : codes!.includes(action.code)}
                        disabled={superAdmin}
                        onCheckedChange={(checked) =>
                          setCurrent((map) => ({
                            ...map,
                            [role.id]: toggleRoleAction(map[role.id] ?? [], action.code, checked === true),
                          }))
                        }
                        aria-label={`${role.nameTh} – ${action.nameTh}`}
                        title={superAdmin ? "SUPER_ADMIN ใช้ได้ทุก action เสมอ" : undefined}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={saveOpen} onOpenChange={(open) => !saving && setSaveOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึก action ของ role</DialogTitle>
            <DialogDescription>
              เปลี่ยน {changes.length} role ({changedRoles.map((role) => role.code).join(", ")}) กระทบผู้ใช้ {affectedUsers} คนในทุกแผนกที่ใช้ role เหล่านี้
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-4">
            {losesRead.length > 0 && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-fg">
                role {losesRead.map((item) => roles.find((role) => role.id === item.roleId)?.code).join(", ")} จะไม่มี &quot;อ่าน&quot; ผู้ใช้ role นี้จะเข้าเมนูใดไม่ได้เลย
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-change-reason">เหตุผล</Label>
              <Textarea
                id="role-change-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="เช่น ให้ผู้ใช้ทั่วไปยืนยันเอกสารได้"
                aria-describedby="role-change-reason-hint"
              />
              <p id="role-change-reason-hint" className="text-xs text-fg-muted">
                บันทึกใน Audit Log คู่กับรายการที่เปลี่ยน
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving || !reason.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
