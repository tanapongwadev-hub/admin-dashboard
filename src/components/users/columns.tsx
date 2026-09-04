"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { formatDate } from "@/lib/utils";
import type { AppUser, UserStatus } from "@/lib/types";

const statusVariant: Record<UserStatus, NonNullable<BadgeProps["variant"]>> = {
  Active: "success",
  Invited: "info",
  Suspended: "danger",
};

export function getUserColumns(opts: {
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
}): ColumnDef<AppUser>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="เลือกทั้งหมด"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="เลือกแถว"
        />
      ),
      enableSorting: false,
      size: 36,
    },
    {
      accessorKey: "name",
      header: "ชื่อ",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.original.name} color={row.original.avatarColor} className="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{row.original.name}</p>
            <p className="truncate text-xs text-fg-muted">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "บทบาท",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
          {row.original.role === "Owner" && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "สถานะ",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} dot>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "lastActive",
      header: "ใช้งานล่าสุด",
      cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.lastActive)}</span>,
    },
    {
      accessorKey: "joined",
      header: "เข้าร่วมเมื่อ",
      cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.joined)}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <RowActionsMenu itemLabel={row.original.name} actions={getUserRowActions(row.original, opts)} />
        </div>
      ),
    },
  ];
}

// Pure — exported for tests. This page still has no real permission wiring
// (mock data, not yet connected to cps-api — see AGENTS.md § Sidebar
// permissions "known gap"), so both actions are always offered; there is no
// existing permission logic to preserve here yet.
export function getUserRowActions(
  user: AppUser,
  handlers: { onEdit: (user: AppUser) => void; onDelete: (user: AppUser) => void }
): RowAction[] {
  return [
    { label: "แก้ไขผู้ใช้", icon: Pencil, onSelect: () => handlers.onEdit(user), variant: "default" },
    { label: "ลบผู้ใช้", icon: Trash2, onSelect: () => handlers.onDelete(user), variant: "danger" },
  ];
}
