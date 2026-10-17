"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban, Check, Loader2, Minus, Plus, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  buildMatrixRows,
  cycleOverride,
  effectivePermission,
  filterRows,
  sameOverrides,
  toAccessMap,
  type EffectiveReason,
  type OverrideMap,
} from "@/lib/permission-matrix";
import type {
  AssignmentOverrides,
  PermissionMatrix,
  RoleSummary,
  UserAssignment,
  UserListItem,
} from "@/lib/api/permission-access";
import {
  loadAssignmentsAction,
  loadOverridesAction,
  saveOverridesAction,
} from "@/app/(dashboard)/system/permissions/actions";

const INDENT = 18;

const REASON_LABEL: Record<EffectiveReason, string> = {
  ROLE: "ได้จาก role และแผนก",
  USER_ALLOW: "อนุญาตรายบุคคล",
  USER_DENY: "ห้ามรายบุคคล",
  ROLE_LACKS_ACTION: "role ไม่มี action นี้",
  DEPARTMENT_BLOCKED: "แผนกไม่ได้เปิดเมนูนี้",
  INACTIVE: "สิทธิ์ถูกปิดใช้งาน",
};

function userLabel(user: UserListItem) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name ? `${name} (${user.username})` : user.username;
}

function toOverrideMap(overrides: AssignmentOverrides): OverrideMap {
  const map: OverrideMap = {};
  for (const item of overrides.items) {
    if (!item.expired) map[item.permissionId] = { effect: item.effect, expiresAt: item.expiresAt };
  }
  return map;
}

/** yyyy-mm-dd from an ISO date-time, in local time. */
function toDateInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** End of the chosen local day, as ISO. */
function fromDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}

/**
 * Per-person exceptions on one assignment (user + department + role).
 * Each cell shows what the user effectively gets; clicking cycles
 * no override → อนุญาต → ห้าม. ALLOW also works outside the department.
 */
export function UserOverridesPanel({
  users,
  roles,
  matrix,
}: {
  users: UserListItem[];
  roles: RoleSummary[];
  matrix: PermissionMatrix;
}) {
  const [userId, setUserId] = React.useState("");
  const [assignments, setAssignments] = React.useState<UserAssignment[] | null>(null);
  const [assignmentId, setAssignmentId] = React.useState("");
  const [saved, setSaved] = React.useState<OverrideMap>({});
  const [current, setCurrent] = React.useState<OverrideMap>({});
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const rows = React.useMemo(() => buildMatrixRows(matrix.menus, matrix.permissions), [matrix]);
  const visibleRows = React.useMemo(() => filterRows(rows, query), [rows, query]);
  const access = React.useMemo(() => toAccessMap(matrix.permissions), [matrix.permissions]);
  const actions = React.useMemo(() => {
    const used = new Set(matrix.permissions.map((permission) => permission.actionCode));
    return matrix.actions.filter((action) => used.has(action.code));
  }, [matrix]);
  const permissionById = React.useMemo(
    () => new Map(matrix.permissions.map((permission) => [permission.id, permission])),
    [matrix.permissions],
  );
  const menuById = React.useMemo(() => new Map(matrix.menus.map((menu) => [menu.id, menu])), [matrix.menus]);

  const assignment = assignments?.find((item) => item.id === assignmentId) ?? null;
  const role = roles.find((item) => item.id === assignment?.roleId);
  const superAdmin = assignment?.role?.code === "SUPER_ADMIN";
  const dirty = !sameOverrides(saved, current);
  const crossDepartment = Object.entries(current).filter(([permissionId, entry]) => {
    const scope = access[permissionId];
    return (
      entry.effect === "ALLOW" &&
      scope?.accessScope === "DEPARTMENTS" &&
      !(assignment?.departmentId && scope.departmentIds.includes(assignment.departmentId))
    );
  }).length;

  async function selectUser(nextUserId: string) {
    setUserId(nextUserId);
    setAssignments(null);
    setAssignmentId("");
    setSaved({});
    setCurrent({});
    setLoading(true);
    const result = await loadAssignmentsAction(nextUserId);
    setLoading(false);
    if (result.status !== "success") {
      toast.error(result.message);
      return;
    }
    setAssignments(result.assignments);
    const first = result.assignments.find((item) => item.isActive) ?? result.assignments[0];
    if (first) await selectAssignment(nextUserId, first.id);
  }

  async function selectAssignment(forUserId: string, nextAssignmentId: string) {
    setAssignmentId(nextAssignmentId);
    setLoading(true);
    const result = await loadOverridesAction(forUserId, nextAssignmentId);
    setLoading(false);
    if (result.status !== "success") {
      toast.error(result.message);
      return;
    }
    const map = toOverrideMap(result.overrides);
    setSaved(map);
    setCurrent(map);
  }

  async function handleSave() {
    if (!reason.trim() || !assignmentId) return;
    setSaving(true);
    const items = Object.entries(current)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([permissionId, entry]) => ({ permissionId, effect: entry.effect, expiresAt: entry.expiresAt }));
    const result = await saveOverridesAction(userId, assignmentId, reason.trim(), items);
    setSaving(false);
    if (result.status !== "success") {
      toast.error(result.message);
      return;
    }
    const map = toOverrideMap(result.overrides);
    setSaved(map);
    setCurrent(map);
    setSaveOpen(false);
    setReason("");
    toast.success("บันทึกสิทธิ์รายบุคคลแล้ว");
  }

  const overrideList = Object.entries(current)
    .map(([permissionId, entry]) => ({ permissionId, entry, permission: permissionById.get(permissionId) }))
    .sort((a, b) => (a.permission?.code ?? "").localeCompare(b.permission?.code ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-col gap-1.5">
            <Label htmlFor="override-user">ผู้ใช้</Label>
            <Select value={userId} onValueChange={(value) => void selectUser(value)} disabled={saving}>
              <SelectTrigger id="override-user" className="w-full sm:w-72">
                <SelectValue placeholder="เลือกผู้ใช้" />
              </SelectTrigger>
              <SelectContent searchPlaceholder="ค้นหาผู้ใช้">
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id} textValue={`${userLabel(user)} ${user.email ?? ""}`}>
                    {userLabel(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {assignments && assignments.length > 0 && (
            <div className="flex min-w-56 flex-col gap-1.5">
              <Label htmlFor="override-assignment">แผนกและ role</Label>
              <Select
                value={assignmentId}
                onValueChange={(value) => void selectAssignment(userId, value)}
                disabled={saving}
              >
                <SelectTrigger id="override-assignment" className="w-full sm:w-72">
                  <SelectValue placeholder="เลือกการมอบหมาย" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {(item.department?.code ?? "ทุกแผนก") + " · " + (item.role?.nameTh ?? item.roleId)}
                      {item.isActive ? "" : " (ปิดใช้งาน)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {loading && <Loader2 className="mb-2.5 size-4 animate-spin text-fg-muted" aria-label="กำลังโหลด" />}
        </div>
        {assignment && !superAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {dirty && <Badge variant="warning">ยังไม่บันทึก</Badge>}
            <Button variant="outline" size="sm" onClick={() => setCurrent(saved)} disabled={!dirty || saving}>
              <RotateCcw className="size-4" />
              รีเซ็ต
            </Button>
            <Button size="sm" onClick={() => setSaveOpen(true)} disabled={!dirty || saving}>
              <Save className="size-4" />
              บันทึก
            </Button>
          </div>
        )}
      </div>

      {!userId && (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-fg-muted">
          เลือกผู้ใช้เพื่อดูสิทธิ์ที่ได้จริง และกำหนดข้อยกเว้นรายบุคคล
        </p>
      )}
      {userId && assignments && assignments.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-fg-muted">
          ผู้ใช้นี้ยังไม่ได้มอบหมายแผนกและ role
        </p>
      )}
      {assignment && superAdmin && (
        <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-fg-muted">
          <ShieldCheck className="size-4 text-info" aria-hidden />
          การมอบหมายนี้เป็น SUPER_ADMIN ซึ่งข้ามการตรวจสิทธิ์ทั้งหมด จึงไม่ต้องกำหนดข้อยกเว้น
        </p>
      )}

      {assignment && !superAdmin && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-success-soft text-success-fg">
                  <Check className="size-4" aria-hidden />
                </span>
                ได้สิทธิ์
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-md border border-border text-fg-muted">
                  <Minus className="size-4" aria-hidden />
                </span>
                ไม่ได้
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-success-soft text-success-fg ring-2 ring-info">
                  <Plus className="size-4" aria-hidden />
                </span>
                อนุญาตรายบุคคล
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-danger-soft text-danger-fg ring-2 ring-danger">
                  <Ban className="size-4" aria-hidden />
                </span>
                ห้ามรายบุคคล
              </span>
              <span>คลิกช่องเพื่อสลับ: ตามค่าเริ่มต้น → อนุญาต → ห้าม</span>
            </div>
            <SearchInput
              id="override-menu-search"
              value={query}
              onChange={setQuery}
              placeholder="ค้นหาเมนู"
              srLabel="ค้นหาเมนู"
              className="w-full sm:w-64"
            />
          </div>

          <div className="max-h-[60vh] overflow-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 min-w-52 border-b border-border bg-surface-2 px-4 py-2.5 text-left font-semibold text-fg">
                    เมนู
                  </th>
                  {actions.map((action) => (
                    <th
                      key={action.id}
                      scope="col"
                      className="sticky top-0 z-10 border-b border-border bg-surface-2 px-2 py-2.5 text-center text-xs font-semibold text-fg-secondary"
                    >
                      {action.nameTh}
                      <span className="block font-mono text-[10px] font-normal text-fg-muted">{action.code}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.menu.id} className="group hover:bg-surface-2/60">
                    <th
                      scope="row"
                      className="sticky left-0 z-[5] border-b border-border bg-surface px-4 py-2 text-left font-normal group-hover:bg-surface-2"
                    >
                      <div style={{ paddingLeft: row.depth * INDENT }} className={cn(!row.menu.isActive && "opacity-60")}>
                        <span className={cn("text-fg", row.depth === 0 && "font-semibold")}>{row.menu.nameTh}</span>
                        <span className="block truncate font-mono text-[11px] text-fg-muted">
                          {row.menu.path || row.menu.code}
                        </span>
                      </div>
                    </th>
                    {actions.map((action) => {
                      const permission = row.permissionsByAction[action.code];
                      if (!permission) {
                        return (
                          <td key={action.id} className="border-b border-border px-2 py-2 text-center text-fg-muted">
                            <span aria-hidden>—</span>
                          </td>
                        );
                      }
                      const effect = effectivePermission(permission, {
                        departmentId: assignment.departmentId,
                        roleActionCodes: role?.actionCodes ?? [],
                        access,
                        overrides: current,
                      });
                      const override = current[permission.id];
                      const changed =
                        (override?.effect ?? null) !== (saved[permission.id]?.effect ?? null);
                      return (
                        <td key={action.id} className="border-b border-border px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => setCurrent((map) => cycleOverride(map, permission.id))}
                            aria-label={`${row.menu.nameTh} – ${action.nameTh}: ${effect.granted ? "ได้สิทธิ์" : "ไม่ได้"} (${REASON_LABEL[effect.reason]})${changed ? " ยังไม่บันทึก" : ""}`}
                            title={`${permission.code} · ${REASON_LABEL[effect.reason]}`}
                            className={cn(
                              "inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              effect.granted
                                ? "border-transparent bg-success-soft text-success-fg"
                                : override?.effect === "DENY"
                                  ? "border-transparent bg-danger-soft text-danger-fg"
                                  : "border-border bg-surface text-fg-muted",
                              override?.effect === "ALLOW" && "ring-2 ring-info",
                              override?.effect === "DENY" && "ring-2 ring-danger",
                              changed && "outline outline-2 outline-offset-2 outline-primary",
                            )}
                          >
                            {override?.effect === "DENY" ? (
                              <Ban className="size-4" aria-hidden />
                            ) : override?.effect === "ALLOW" ? (
                              <Plus className="size-4" aria-hidden />
                            ) : effect.granted ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <Minus className="size-4" aria-hidden />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="rounded-xl border border-border bg-surface">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-fg">
              ข้อยกเว้นของผู้ใช้นี้ ({overrideList.length})
            </h2>
            {overrideList.length === 0 ? (
              <p className="px-4 py-6 text-sm text-fg-muted">ยังไม่มีข้อยกเว้น สิทธิ์ทั้งหมดมาจาก role และแผนก</p>
            ) : (
              <ul className="divide-y divide-border">
                {overrideList.map(({ permissionId, entry, permission }) => (
                  <li key={permissionId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <Badge variant={entry.effect === "ALLOW" ? "info" : "danger"}>
                      {entry.effect === "ALLOW" ? "อนุญาต" : "ห้าม"}
                    </Badge>
                    <span className="min-w-0 flex-1 text-sm text-fg">
                      {permission ? menuById.get(permission.menuId)?.nameTh : "-"}
                      <span className="ml-2 font-mono text-xs text-fg-muted">{permission?.code ?? permissionId}</span>
                    </span>
                    <Label htmlFor={`override-expiry-${permissionId}`} className="text-xs text-fg-secondary">
                      หมดอายุ
                    </Label>
                    <Input
                      id={`override-expiry-${permissionId}`}
                      type="date"
                      className="h-8 w-40"
                      value={toDateInput(entry.expiresAt)}
                      min={toDateInput(new Date().toISOString())}
                      onChange={(event) =>
                        setCurrent((map) => ({
                          ...map,
                          [permissionId]: { ...map[permissionId], expiresAt: fromDateInput(event.target.value) },
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`ลบข้อยกเว้น ${permission?.code ?? permissionId}`}
                      onClick={() =>
                        setCurrent((map) => {
                          const next = { ...map };
                          delete next[permissionId];
                          return next;
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog open={saveOpen} onOpenChange={(open) => !saving && setSaveOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกสิทธิ์รายบุคคล</DialogTitle>
            <DialogDescription>
              ข้อยกเว้นทั้งหมด {overrideList.length} รายการของ {users.find((user) => user.id === userId)?.username} (
              {assignment?.department?.code ?? "ทุกแผนก"} · {assignment?.role?.nameTh}) จะถูกแทนที่ด้วยชุดนี้
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-4">
            {crossDepartment > 0 && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-fg">
                มี {crossDepartment} สิทธิ์ที่อนุญาตข้ามแผนก (แผนกของผู้ใช้ไม่ได้เปิดเมนูนั้น)
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="override-change-reason">เหตุผล</Label>
              <Textarea
                id="override-change-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="เช่น หัวหน้ากะต้องดูรายงานของแผนก PS ชั่วคราว"
                aria-describedby="override-change-reason-hint"
              />
              <p id="override-change-reason-hint" className="text-xs text-fg-muted">
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
