import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { getUserColumns, getUserRowActions } from "./columns";
import type { AppUser } from "@/lib/types";

const user: AppUser = {
  id: "user-1",
  name: "Maya Chen",
  email: "maya@example.com",
  role: "Admin",
  status: "Active",
  avatarColor: "chart-1",
  lastActive: "2026-09-04T00:00:00.000Z",
  joined: "2026-01-01T00:00:00.000Z",
};

function TableBody({ user, opts }: { user: AppUser; opts: Parameters<typeof getUserColumns>[0] }) {
  const columns = getUserColumns(opts);
  const table = useReactTable({ data: [user], columns, getCoreRowModel: getCoreRowModel() });
  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

test("renders a single row-actions trigger labelled with the user's name", () => {
  const html = renderToStaticMarkup(
    <TableBody user={user} opts={{ onEdit: () => undefined, onDelete: () => undefined }} />
  );

  assert.match(html, /aria-label="ตัวเลือกสำหรับ Maya Chen"/);
  assert.match(html, /lucide-ellipsis/);
});

test("getUserRowActions offers edit (default) and delete (destructive) with a separator between them", () => {
  const actions = getUserRowActions(user, { onEdit: () => undefined, onDelete: () => undefined });

  assert.deepEqual(
    actions.map((a) => [a.label, a.variant]),
    [
      ["แก้ไขผู้ใช้", "default"],
      ["ลบผู้ใช้", "danger"],
    ]
  );
});
