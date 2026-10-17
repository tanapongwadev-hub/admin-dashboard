"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { RoleSummary } from "@/lib/api/permission-access";
import type { DepartmentOption, UserListItem, UserListResult } from "@/lib/api/users";
import { deleteUserAction, setUserStatusAction } from "@/app/(dashboard)/system/users/actions";
import { UsersFilters } from "./users-filters";
import { UsersTable, userDisplayName, type UserRowHandlers } from "./users-table";
import { UserFormDialog } from "./user-form-dialog";
import { UserPasswordDialog } from "./user-password-dialog";

/**
 * Orchestrates /system/users. Server data stays in props (refreshed with
 * router.refresh() after a mutation); this component only owns which dialog
 * is open and for whom.
 */
export function UsersClient({
  users,
  meta,
  roles,
  departments,
  currentUserId,
}: {
  users: UserListItem[];
  meta: UserListResult["meta"];
  roles: RoleSummary[];
  departments: DepartmentOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // undefined = closed, null = create, user = edit.
  const [formTarget, setFormTarget] = React.useState<UserListItem | null | undefined>(undefined);
  const [formSession, setFormSession] = React.useState(0);
  const [passwordTarget, setPasswordTarget] = React.useState<UserListItem | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserListItem | null>(null);
  const [pending, startTransition] = React.useTransition();

  function openForm(target: UserListItem | null) {
    setFormSession((value) => value + 1);
    setFormTarget(target);
  }

  function goToPage(value: number) {
    const target = new URLSearchParams(params.toString());
    target.set("page", String(value));
    router.push(`${pathname}?${target}`);
  }

  const handlers: UserRowHandlers = {
    onEdit: (user) => openForm(user),
    onResetPassword: setPasswordTarget,
    onToggleStatus: setStatusTarget,
    onDelete: setDeleteTarget,
    onOpenOverrides: () => router.push("/system/permissions?tab=users"),
  };

  function confirmStatus() {
    const user = statusTarget;
    if (!user) return;
    setStatusTarget(null);
    startTransition(async () => {
      const result = await setUserStatusAction(user.id, !user.isActive);
      if (result.status === "error") {
        toast.error("เปลี่ยนสถานะไม่สำเร็จ", { description: result.message });
        return;
      }
      toast.success(result.user.isActive ? "เปิดใช้งานผู้ใช้แล้ว" : "ระงับการใช้งานผู้ใช้แล้ว", {
        description: userDisplayName(user),
      });
      router.refresh();
    });
  }

  function confirmDelete() {
    const user = deleteTarget;
    if (!user) return;
    setDeleteTarget(null);
    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (result.status === "error") {
        toast.error("ลบผู้ใช้ไม่สำเร็จ", { description: result.message });
        return;
      }
      toast.success("ลบผู้ใช้แล้ว", { description: userDisplayName(user) });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/system/permissions?tab=users">
            <ShieldCheck className="size-4" />
            สิทธิ์รายคน
          </Link>
        </Button>
        <Button onClick={() => openForm(null)}>
          <UserPlus className="size-4" />
          เพิ่มผู้ใช้
        </Button>
      </div>

      <UsersFilters totalItems={meta.totalItems} />

      <div aria-busy={pending} className={pending ? "pointer-events-none opacity-60" : undefined}>
        <UsersTable users={users} currentUserId={currentUserId} handlers={handlers} />
      </div>

      {users.length > 0 && (
        <div className="flex flex-col gap-2 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            หน้า {meta.page} จาก {Math.max(1, meta.totalPages)} · ทั้งหมด {meta.totalItems.toLocaleString("th-TH")} รายการ
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="หน้าก่อนหน้า"
              disabled={meta.page <= 1}
              onClick={() => goToPage(meta.page - 1)}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="หน้าถัดไป"
              disabled={meta.page >= meta.totalPages}
              onClick={() => goToPage(meta.page + 1)}
            >
              ถัดไป
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
          roles={roles}
          departments={departments}
          onSaved={() => router.refresh()}
        />
      )}

      <UserPasswordDialog
        key={passwordTarget?.id ?? "none"}
        user={passwordTarget}
        onOpenChange={(open) => !open && setPasswordTarget(null)}
      />

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        variant={statusTarget?.isActive ? "danger" : "default"}
        title={statusTarget?.isActive ? "ระงับการใช้งานผู้ใช้นี้หรือไม่?" : "เปิดใช้งานผู้ใช้นี้หรือไม่?"}
        description={
          statusTarget?.isActive
            ? `"${statusTarget ? userDisplayName(statusTarget) : ""}" จะเข้าสู่ระบบไม่ได้ทันที ข้อมูลและประวัติยังอยู่ครบ เปิดใช้งานใหม่ได้ภายหลัง`
            : `"${statusTarget ? userDisplayName(statusTarget) : ""}" จะเข้าสู่ระบบได้อีกครั้งด้วยแผนกและ role เดิม`
        }
        confirmLabel={statusTarget?.isActive ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
        onConfirm={confirmStatus}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="ลบผู้ใช้นี้ถาวรหรือไม่?"
        description={`"${deleteTarget ? userDisplayName(deleteTarget) : ""}" และการมอบหมายแผนก/สิทธิ์รายคนจะถูกลบ ย้อนกลับไม่ได้ ถ้าบัญชีนี้เคยใช้งานแล้ว ระบบจะไม่ให้ลบ ให้ใช้การระงับแทน`}
        confirmLabel="ลบผู้ใช้"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
