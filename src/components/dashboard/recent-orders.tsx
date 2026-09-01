import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { orders } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

const statusVariant: Record<OrderStatus, NonNullable<BadgeProps["variant"]>> = {
  Pending: "warning",
  Processing: "primary",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "danger",
};

export function RecentOrders() {
  const recent = orders.slice(0, 6);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recent.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="font-medium text-fg">{order.id}</TableCell>
            <TableCell className="text-fg-secondary">{order.customer}</TableCell>
            <TableCell className="text-fg-muted">{formatDate(order.date)}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[order.status]} dot>
                {order.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium text-fg">{formatCurrency(order.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function RecentOrdersFooter() {
  return (
    <Button variant="ghost" size="sm" asChild className="text-fg-secondary">
      <Link href="/dashboard/orders">View all orders</Link>
    </Button>
  );
}
