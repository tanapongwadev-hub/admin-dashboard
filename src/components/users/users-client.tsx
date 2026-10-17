"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { RoleSummary } from "@/lib/api/permission-access";
import type { DepartmentOption, PaginatedUsers, UserRow } from "@/lib/api/users";
import { deleteUserAction, setUserStatusAction } from "@/app/(dashboard)/system/users/actions";
import { UserAssignmentsDialog } from "./user-assignments-dialog";
import { UserFormDialog } from "./user-form-dialog";
import { UserPasswordDialog } from "./user-password-dialog";
import { getUserRowActions, userDisplayName, userStatus, type UserStatusKey } from "./user-row-actions";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(date);
}

const STATUS: Record<UserStatusKey, { label: string; variant: NonNullable<BadgeProps["variant"]> }> = {
  active: { label: "ใช้งาน", variant: "success" },
  locked: { label: "ถูกล็อก", variant: "warning" },
  inactive: { label: "ปิดใช้งาน", variant: "neutral" },
};

/**
 * Server data (the URL-filtered page of users, departments, roles) comes in
 * as props; this component only owns which dialog is open (ADR-006).
 * Mutations call Server Actions, then `router.refresh()` re-renders the page.
 */
export function UsersClient({
  users,
  departments,
  roles,
  currentUserId,
  openCreate,
}: {
  users: PaginatedUsers;
  departments: DepartmentOption[];
  roles: RoleSummary[];
  currentUserId: string;
  openCreate: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlSearch = params.get("search") ?? "";
  const [search, setSearch] = React.useState(urlSearch);

  // `undefined` = closed, `null` = create, a user = edit.
  const [formTarget, setFormTarget] = React.useState<UserRow | null | undefined>(openCreate ? null : undefined);
  const [formSession, setFormSession] = React.useState(0);
  const [passwordTarget, setPasswordTarget] = React.useState<UserRow | null>(null);
  const [assignmentsTarget, setAssignmentsTarget] = React.useState<UserRow | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);

  function navigate(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (search.trim() !== urlSearch) navigate({ search: search.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // `?new=1` (command palette) is one-shot: strip it once read.
  React.useEffect(() => {
    if (openCreate) navigate({ new: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openForm(target: UserRow | null) {
    setFormSession((n) => n + 1);
    setFormTarget(target);
  }

  async function toggleStatus(user: UserRow) {
    const result = await setUserStatusAction(user.id, !user.isActive);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(user.isActive ? "ปิดใช้งานผู้ใช้แล้ว" : "เปิดใช้งานผู้ใช้แล้ว");
    router.refresh();
  }

  async function remove(user: UserRow) {
    const result = await deleteUserAction(user.id);
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(`ลบผู้ใช้ ${user.username} แล้ว`);
    router.refresh();
  }

  const handlers = {
    onEdit: (user: UserRow) => openForm(user),
    onAssignments: setAssignmentsTarget,
    onResetPassword: setPasswordTarget,
    onToggleStatus: setStatusTarget,
    onDelete: setDeleteTarget,
  };
  const { meta } = users;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <SearchInput
            id="users-search"
            srLabel="ค้นหาผู้ใช้"
            placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรืออีเมล"
            value={search}
            onChange={setSearch}
            className="w-full sm:max-w-sm"
          />
          <p className="hidden shrink-0 text-sm text-fg-muted sm:block">
            พบ {meta.totalItems.toLocaleString("th-TH")} คน
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => openForm(null)}>
          <Plus className="size-4" /> เพิ่มผู้ใช้
        </Button>
      </div>

      {users.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="size-8 text-fg-muted" />
          <p className="font-medium text-fg">ไม่พบผู้ใช้</p>
          <p className="text-sm text-fg-muted">
            {urlSearch ? "ลองค้นหาด้วยคำอื่น" : "กด \"เพิ่มผู้ใช้\" เพื่อสร้างบัญชีแรก"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>สร้างเมื่อ</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">การจัดการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.items.map((user) => {
                const name = userDisplayName(user);
                const status = STATUS[userStatus(user)];
                return (
                  <TableRow key={user.id} className={user.isActive ? undefined : "opacity-70"}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={name} className="size-8" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">
                            {name}
                            {user.id === currentUserId && <span className="ml-1.5 text-xs text-fg-muted">(คุณ)</span>}
                          </p>
                          <p className="truncate font-mono text-xs text-fg-muted">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-fg-secondary">{user.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} dot>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-fg-secondary">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActionsMenu actions={getUserRowActions(user, currentUserId, handlers)} itemLabel={name} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-fg-muted">
          <p>
            หน้า {meta.page} จาก {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="หน้าก่อนหน้า"
              disabled={meta.page <= 1}
              onClick={() => navigate({ page: String(meta.page - 1) })}
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">ก่อนหน้า</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="หน้าถัดไป"
              disabled={meta.page >= meta.totalPages}
              onClick={() => navigate({ page: String(meta.page + 1) })}
            >
              <span className="hidden sm:inline">ถัดไป</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {formTarget !== undefined && (
        <UserFormDialog
          key={formSession}
          open
          onOpenChange={(open) => !open && setFormTarget(undefined)}
          user={formTarget}
          departments={departments}
          roles={roles}
          onSaved={() => router.refresh()}
        />
      )}

      <UserPasswordDialog
        key={passwordTarget?.id ?? "none"}
        user={passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
      />

      {assignmentsTarget && (
        <UserAssignmentsDialog
          key={assignmentsTarget.id}
          user={assignmentsTarget}
          departments={departments}
          roles={roles}
          onOpenChange={(open) => !open && setAssignmentsTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        variant={statusTarget?.isActive ? "danger" : "default"}
        title={statusTarget?.isActive ? "ปิดใช้งานผู้ใช้นี้?" : "เปิดใช้งานผู้ใช้นี้?"}
        description={
          statusTarget?.isActive
            ? `${statusTarget ? userDisplayName(statusTarget) : ""} จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง ข้อมูลและสิทธิ์ยังเก็บไว้`
            : `${statusTarget ? userDisplayName(statusTarget) : ""} จะกลับมาเข้าสู่ระบบได้ด้วยสิทธิ์เดิม`
        }
        confirmLabel={statusTarget?.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
        onConfirm={() => statusTarget && toggleStatus(statusTarget)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบผู้ใช้ถาวร?"
        description={`ลบ ${deleteTarget?.username ?? ""} พร้อมแผนกและสิทธิ์รายบุคคลทั้งหมด ย้อนกลับไม่ได้ ถ้าเพียงต้องการหยุดใช้งาน ให้เลือก "ปิดใช้งาน" แทน`}
        confirmLabel="ลบถาวร"
        onConfirm={() => deleteTarget && remove(deleteTarget)}
      />
    </div>
  );
}
