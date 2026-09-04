import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { getOrderColumns, getOrderRowActions } from "./columns";
import type { Order } from "@/lib/types";

const order: Order = {
  id: "ORD-1001",
  customer: "Jordan Blake",
  email: "jordan@example.com",
  date: "2026-09-04T00:00:00.000Z",
  amount: 1200,
  items: 3,
  status: "Pending",
  payment: "Paid",
};

function TableBody({ order, opts }: { order: Order; opts: Parameters<typeof getOrderColumns>[0] }) {
  const columns = getOrderColumns(opts);
  const table = useReactTable({ data: [order], columns, getCoreRowModel: getCoreRowModel() });
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

test("renders a single row-actions trigger labelled with the order id", () => {
  const html = renderToStaticMarkup(
    <TableBody
      order={order}
      opts={{ onView: () => undefined, onMarkShipped: () => undefined, onCancel: () => undefined }}
    />
  );

  assert.match(html, /aria-label="ตัวเลือกสำหรับ คำสั่งซื้อ ORD-1001"/);
  assert.match(html, /lucide-ellipsis/);
});

test("getOrderRowActions puts view and mark-shipped as default, cancel as destructive", () => {
  const actions = getOrderRowActions(order, {
    onView: () => undefined,
    onMarkShipped: () => undefined,
    onCancel: () => undefined,
  });

  assert.deepEqual(
    actions.map((a) => [a.label, a.variant]),
    [
      ["ดูรายละเอียด", "default"],
      ["ทำเครื่องหมายว่าจัดส่งแล้ว", "default"],
      ["ยกเลิกคำสั่งซื้อ", "danger"],
    ]
  );
});
