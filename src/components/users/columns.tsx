"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      size: 36,
    },
    {
      accessorKey: "name",
      header: "Name",
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
      header: "Role",
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
          {row.original.role === "Owner" && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={statusVariant[row.original.status]} dot>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "lastActive",
      header: "Last active",
      cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.lastActive)}</span>,
    },
    {
      accessorKey: "joined",
      header: "Joined",
      cell: ({ row }) => <span className="text-fg-muted">{formatDate(row.original.joined)}</span>,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => opts.onEdit(row.original)}>
              <Pencil className="h-4 w-4" /> Edit user
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => opts.onDelete(row.original)}>
              <Trash2 className="h-4 w-4" /> Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
