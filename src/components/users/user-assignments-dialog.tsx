"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { RoleSummary, UserAssignment } from "@/lib/api/permission-access";
import type { DepartmentOption, UserRow } from "@/lib/api/users";
import {
  addAssignmentAction,
  listAssignmentsAction,
  removeAssignmentAction,
  updateAssignmentAction,
} from "@/app/(dashboard)/system/users/actions";
import { userDisplayName } from "./user-row-actions";

type Draft = { departmentId: string; roleId: string };

function DepartmentSelect({
  id,
  value,
  onChange,
  options,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: DepartmentOption[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label}>
        <SelectValue placeholder="เลือกแผนก" />
      </SelectTrigger>
      <SelectContent>
        {options.map((department) => (
          <SelectItem key={department.id} value={department.id}>
            {department.nameEn} · {department.nameTh}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RoleSelect({
  id,
  value,
  onChange,
  roles,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  roles: RoleSummary[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label}>
        <SelectValue placeholder="เลือก role" />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.nameTh}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Lists a user's department/role assignments and lets the admin add, change
 * and remove them. Every change saves immediately (one API call each). The
 * parent remounts it per user via `key`, so loading starts fresh each time.
 * Changing department/role keeps the assignment's ALLOW/DENY overrides.
 */
export function UserAssignmentsDialog({
  user,
  onOpenChange,
  departments,
  roles,
}: {
  user: UserRow;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentOption[];
  /** Already filtered to assignable roles. */
  roles: RoleSummary[];
}) {
  const [assignments, setAssignments] = React.useState<UserAssignment[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = React.useState<Draft>({ departmentId: "", roleId: "" });
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<UserAssignment | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    listAssignmentsAction(user.id).then((result) => {
      if (cancelled) return;
      if (result.status === "success") setAssignments(result.assignments);
      else setLoadError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  function applyResult(result: Awaited<ReturnType<typeof listAssignmentsAction>>, success: string) {
    if (result.status === "error") {
      toast.error(result.message);
      return false;
    }
    setAssignments(result.assignments);
    toast.success(success);
    return true;
  }

  const takenDepartmentIds = new Set(
    (assignments ?? []).map((a) => a.departmentId).filter((id): id is string => !!id),
  );
  const freeDepartments = departments.filter((d) => !takenDepartmentIds.has(d.id));

  async function saveRow(assignment: UserAssignment) {
    const draft = drafts[assignment.id];
    if (!draft) return;
    setBusyId(assignment.id);
    const result = await updateAssignmentAction(user.id, assignment.id, draft);
    setBusyId(null);
    if (applyResult(result, "บันทึกแผนกและ role แล้ว")) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[assignment.id];
        return next;
      });
    }
  }

  async function addRow() {
    setBusyId("new");
    const result = await addAssignmentAction(user.id, newDraft);
    setBusyId(null);
    if (applyResult(result, "เพิ่มแผนกแล้ว")) setNewDraft({ departmentId: "", roleId: "" });
  }

  async function removeRow(assignment: UserAssignment) {
    setBusyId(assignment.id);
    const result = await removeAssignmentAction(user.id, assignment.id);
    setBusyId(null);
    applyResult(result, "ถอดแผนกออกแล้ว");
  }

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent fullScreenOnMobile size="xl" className="p-0">
          <div className="flex h-full flex-col">
            <DialogHeader>
              <DialogTitle>แผนกและ Role</DialogTitle>
              <DialogDescription>
                {userDisplayName(user)} ({user.username}) · แผนกกำหนดเมนูที่เห็น role กำหนด action ที่ทำได้ การแก้ไขแต่ละแถวบันทึกทันที
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {loadError ? (
                <p className="text-sm text-danger">{loadError}</p>
              ) : !assignments ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <Loader2 className="size-4 animate-spin" /> กำลังโหลด…
                </p>
              ) : (
                <>
                  {assignments.length === 0 && (
                    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft p-3 text-sm text-warning-fg">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      ผู้ใช้นี้ยังไม่อยู่ในแผนกใด จะเข้าใช้งานเมนูใดไม่ได้จนกว่าจะเพิ่มแผนก
                    </p>
                  )}

                  <ul className="flex flex-col gap-2">
                    {assignments.map((assignment) => {
                      const draft = drafts[assignment.id];
                      const departmentId = draft?.departmentId ?? assignment.departmentId ?? "";
                      const roleId = draft?.roleId ?? assignment.roleId;
                      const isSystem = !assignment.departmentId || assignment.role?.code === "SUPER_ADMIN";
                      const busy = busyId === assignment.id;
                      // The row's own department stays selectable for itself.
                      const rowDepartments = departments.filter(
                        (d) => d.id === assignment.departmentId || !takenDepartmentIds.has(d.id),
                      );
                      return (
                        <li
                          key={assignment.id}
                          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center"
                        >
                          {isSystem ? (
                            <div className="flex flex-1 items-center gap-2 text-sm">
                              <ShieldCheck className="size-4 text-primary" />
                              <span className="font-medium text-fg">{assignment.role?.nameTh ?? "Super Admin"}</span>
                              <span className="text-fg-muted">· ทั้งระบบ (แก้ไขจากหน้านี้ไม่ได้)</span>
                            </div>
                          ) : (
                            <div className="grid flex-1 gap-2 sm:grid-cols-2">
                              <DepartmentSelect
                                id={`assignment-${assignment.id}-department`}
                                label="แผนก"
                                value={departmentId}
                                options={rowDepartments}
                                onChange={(value) =>
                                  setDrafts((prev) => ({ ...prev, [assignment.id]: { departmentId: value, roleId } }))
                                }
                              />
                              <RoleSelect
                                id={`assignment-${assignment.id}-role`}
                                label="Role"
                                value={roleId}
                                roles={roles}
                                onChange={(value) =>
                                  setDrafts((prev) => ({ ...prev, [assignment.id]: { departmentId, roleId: value } }))
                                }
                              />
                            </div>
                          )}
                          {!assignment.isActive && <Badge variant="neutral">ไม่ใช้งาน</Badge>}
                          {!isSystem && (
                            <div className="flex shrink-0 gap-2">
                              {draft && (
                                <Button size="sm" disabled={busy || !departmentId || !roleId} onClick={() => saveRow(assignment)}>
                                  บันทึก
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`ถอดแผนก ${assignment.department?.nameTh ?? ""}`}
                                disabled={busy}
                                onClick={() => setRemoveTarget(assignment)}
                              >
                                <Trash2 className="size-4 text-danger" />
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rounded-lg border border-dashed border-border-strong p-3">
                    <p className="mb-2 text-sm font-medium text-fg">เพิ่มแผนก</p>
                    {freeDepartments.length === 0 ? (
                      <p className="text-sm text-fg-muted">ผู้ใช้อยู่ครบทุกแผนกแล้ว</p>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          <DepartmentSelect
                            id="new-assignment-department"
                            label="แผนกที่จะเพิ่ม"
                            value={newDraft.departmentId}
                            options={freeDepartments}
                            onChange={(value) => setNewDraft((prev) => ({ ...prev, departmentId: value }))}
                          />
                          <RoleSelect
                            id="new-assignment-role"
                            label="Role ในแผนกที่จะเพิ่ม"
                            value={newDraft.roleId}
                            roles={roles}
                            onChange={(value) => setNewDraft((prev) => ({ ...prev, roleId: value }))}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 gap-1.5"
                          disabled={busyId === "new" || !newDraft.departmentId || !newDraft.roleId}
                          onClick={addRow}
                        >
                          <Plus className="size-4" /> เพิ่ม
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-fg-muted">
                    ต้องการให้สิทธิ์หรือห้ามสิทธิ์เป็นรายบุคคล ไปที่{" "}
                    <Link href="/system/permissions?tab=users" className="text-primary underline-offset-2 hover:underline">
                      สิทธิ์การเข้าถึง › ผู้ใช้
                    </Link>
                  </p>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ปิด
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="ถอดแผนกนี้ออก?"
        description={`${userDisplayName(user)} จะไม่เห็นเมนูของแผนก ${removeTarget?.department?.nameTh ?? ""} อีก และสิทธิ์รายบุคคลของแผนกนี้จะถูกลบด้วย`}
        confirmLabel="ถอดออก"
        onConfirm={() => removeTarget && removeRow(removeTarget)}
      />
    </>
  );
}
