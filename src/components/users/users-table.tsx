"use client";

import { KeyRound, Pencil, ShieldCheck, Trash2, UserCheck, UserX, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserListAssignment, UserListItem } from "@/lib/api/users";

export function userDisplayName(user: Pick<UserListItem, "firstName" | "lastName" | "username">) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.username;
}

export function assignmentLabel(assignment: UserListAssignment) {
  const role = assignment.role?.nameTh || assignment.role?.code || "-";
  if (!assignment.department) return role;
  return `${assignment.department.code} · ${role}`;
}

export function isSuperAdminUser(user: UserListItem) {
  return user.assignments.some((assignment) => assignment.role?.code === "SUPER_ADMIN");
}

export interface UserRowHandlers {
  onEdit: (user: UserListItem) => void;
  onResetPassword: (user: UserListItem) => void;
  onToggleStatus: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => void;
  onOpenOverrides: (user: UserListItem) => void;
}

/**
 * Row actions for one user. The signed-in admin cannot deactivate or delete
 * their own account from here (cps-api only protects the last SUPER_ADMIN).
 */
export function getUserRowActions(
  user: UserListItem,
  isSelf: boolean,
  handlers: UserRowHandlers,
): RowAction[] {
  const actions: RowAction[] = [
    { label: "แก้ไขข้อมูลและแผนก", icon: Pencil, onSelect: () => handlers.onEdit(user) },
    { label: "รีเซ็ตรหัสผ่าน", icon: KeyRound, onSelect: () => handlers.onResetPassword(user) },
  ];
  if (!isSuperAdminUser(user)) {
    actions.push({
      label: "สิทธิ์รายคน",
      icon: ShieldCheck,
      onSelect: () => handlers.onOpenOverrides(user),
    });
  }
  if (isSelf) return actions;
  actions.push(
    user.isActive
      ? {
          label: "ระงับการใช้งาน",
          icon: UserX,
          variant: "danger",
          onSelect: () => handlers.onToggleStatus(user),
        }
      : {
          label: "เปิดใช้งาน",
          icon: UserCheck,
          onSelect: () => handlers.onToggleStatus(user),
        },
    { label: "ลบผู้ใช้", icon: Trash2, variant: "danger", onSelect: () => handlers.onDelete(user) },
  );
  return actions;
}

function formatDateTime(value: string | null) {
  if (!value) return "ยังไม่เคย";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export function UsersTable({
  users,
  currentUserId,
  handlers,
}: {
  users: UserListItem[];
  currentUserId: string;
  handlers: UserRowHandlers;
}) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
        <UsersRound className="size-6 text-fg-muted" />
        <p className="text-sm font-medium text-fg">ไม่พบผู้ใช้</p>
        <p className="text-xs text-fg-muted">ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มผู้ใช้ใหม่</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[14rem]">ผู้ใช้</TableHead>
            <TableHead className="min-w-[12rem]">ติดต่อ</TableHead>
            <TableHead className="min-w-[14rem]">แผนก · Role</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="min-w-[10rem]">เข้าสู่ระบบล่าสุด</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">การจัดการ</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <TableRow key={user.id} className={user.isActive ? undefined : "opacity-70"}>
                <TableCell>
                  <p className="font-medium text-fg">
                    {userDisplayName(user)}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-fg-muted">(คุณ)</span>}
                  </p>
                  <p className="font-mono text-xs text-fg-muted">{user.username}</p>
                </TableCell>
                <TableCell className="text-sm text-fg-secondary">
                  <p>{user.email || "—"}</p>
                  {user.telephone && <p className="text-xs text-fg-muted">{user.telephone}</p>}
                </TableCell>
                <TableCell>
                  {user.assignments.length === 0 ? (
                    <span className="text-xs text-warning-fg">ยังไม่ได้มอบหมาย</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {user.assignments.map((assignment) => (
                        <Badge
                          key={assignment.id}
                          variant={assignment.role?.scopeType === "SYSTEM" ? "primary" : "neutral"}
                        >
                          {assignmentLabel(assignment)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={user.isActive ? "success" : "neutral"} dot>
                      {user.isActive ? "ใช้งานอยู่" : "ระงับการใช้งาน"}
                    </Badge>
                    {user.isLocked && <Badge variant="warning">ถูกล็อก</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-fg-secondary">{formatDateTime(user.lastLoginAt)}</TableCell>
                <TableCell className="text-right">
                  <RowActionsMenu
                    actions={getUserRowActions(user, isSelf, handlers)}
                    itemLabel={userDisplayName(user)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
