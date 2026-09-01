"use client";

import * as React from "react";
import { Search, Plus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getUserColumns } from "@/components/users/columns";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { users as initialUsers } from "@/lib/data";
import type { AppUser } from "@/lib/types";

export function UsersTable({ openInvite }: { openInvite?: boolean }) {
  const [users, setUsers] = React.useState<AppUser[]>(initialUsers);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<AppUser[]>([]);

  const [formOpen, setFormOpen] = React.useState(!!openInvite);
  const [editingUser, setEditingUser] = React.useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AppUser | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const columns = React.useMemo(
    () =>
      getUserColumns({
        onEdit: (user) => {
          setEditingUser(user);
          setFormOpen(true);
        },
        onDelete: (user) => setDeleteTarget(user),
      }),
    []
  );

  // simple client-side pre-filter for role/status since DataTable's built-in
  // column filters need matching filterFn; we filter the source data instead.
  const filteredData = React.useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  function handleSave(values: Omit<AppUser, "id" | "avatarColor" | "lastActive" | "joined">, existing?: AppUser | null) {
    if (existing) {
      setUsers((prev) => prev.map((u) => (u.id === existing.id ? { ...u, ...values } : u)));
    } else {
      const newUser: AppUser = {
        ...values,
        id: `USR-${Math.floor(Math.random() * 9000 + 1000)}`,
        avatarColor: "chart-1",
        lastActive: new Date().toISOString(),
        joined: new Date().toISOString(),
      };
      setUsers((prev) => [newUser, ...prev]);
    }
  }

  function handleDelete(user: AppUser) {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    toast.success("User deleted", { description: `${user.name} was removed from the workspace.` });
  }

  function handleBulkDelete() {
    const ids = new Set(selected.map((u) => u.id));
    setUsers((prev) => prev.filter((u) => !ids.has(u.id)));
    toast.success(`${selected.length} user${selected.length > 1 ? "s" : ""} deleted`);
    setSelected([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input placeholder="Search by name or email" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Owner">Owner</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Editor">Editor</SelectItem>
              <SelectItem value="Viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Invited">Invited</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button variant="outline" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" /> Delete ({selected.length})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Invite user
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <DataTable columns={columns} data={filteredData} onRowSelectionChange={setSelected} emptyMessage="No users match your filters." />
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} onSave={handleSave} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete this user?"
        description={`This will permanently remove ${deleteTarget?.name ?? "this user"} from your workspace. This action can't be undone.`}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.length} users?`}
        description="This will permanently remove the selected users from your workspace. This action can't be undone."
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
