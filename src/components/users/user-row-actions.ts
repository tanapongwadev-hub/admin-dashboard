import { KeyRound, Pencil, Power, PowerOff, Trash2, Users } from "lucide-react";
import type { RowAction } from "@/components/ui/row-actions-menu";
import type { UserRow } from "@/lib/api/users";
import type { RoleSummary } from "@/lib/api/permission-access";

export function userDisplayName(user: Pick<UserRow, "firstName" | "lastName" | "username">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
}

export type UserStatusKey = "active" | "locked" | "inactive";

export function userStatus(user: Pick<UserRow, "isActive" | "isLocked">): UserStatusKey {
  if (!user.isActive) return "inactive";
  return user.isLocked ? "locked" : "active";
}

/**
 * Roles an admin may pick on this page. SUPER_ADMIN is a system-wide role
 * with no department, while every assignment here needs one (cps-api
 * CreateAssignmentDto), so it is left to the seed/IAM scripts.
 */
export function assignableRoles(roles: RoleSummary[]) {
  return roles.filter((role) => role.isActive && role.code !== "SUPER_ADMIN");
}

export interface UserRowHandlers {
  onEdit: (user: UserRow) => void;
  onAssignments: (user: UserRow) => void;
  onResetPassword: (user: UserRow) => void;
  onToggleStatus: (user: UserRow) => void;
  onDelete: (user: UserRow) => void;
}

/**
 * Disable/delete are hidden on the signed-in admin's own row, so nobody
 * locks themself out; cps-api additionally refuses the last SUPER_ADMIN.
 */
export function getUserRowActions(
  user: UserRow,
  currentUserId: string,
  handlers: UserRowHandlers,
): RowAction[] {
  const isSelf = user.id === currentUserId;
  const actions: RowAction[] = [
    { label: "แก้ไขข้อมูล", icon: Pencil, onSelect: () => handlers.onEdit(user) },
    { label: "แผนกและ Role", icon: Users, onSelect: () => handlers.onAssignments(user) },
    { label: "ตั้งรหัสผ่านใหม่", icon: KeyRound, onSelect: () => handlers.onResetPassword(user) },
  ];
  if (isSelf) return actions;
  actions.push(
    user.isActive
      ? { label: "ปิดใช้งาน", icon: PowerOff, variant: "danger", onSelect: () => handlers.onToggleStatus(user) }
      : { label: "เปิดใช้งาน", icon: Power, onSelect: () => handlers.onToggleStatus(user) },
    { label: "ลบผู้ใช้ถาวร", icon: Trash2, variant: "danger", onSelect: () => handlers.onDelete(user) },
  );
  return actions;
}
