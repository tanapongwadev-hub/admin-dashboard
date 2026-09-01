"use client";

import { CreditCard, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

const invoices = [
  { id: "INV-2026-08", date: "2026-08-01", amount: 149, status: "Paid" },
  { id: "INV-2026-07", date: "2026-07-01", amount: 149, status: "Paid" },
  { id: "INV-2026-06", date: "2026-06-01", amount: 149, status: "Paid" },
  { id: "INV-2026-05", date: "2026-05-01", amount: 99, status: "Paid" },
];

export function BillingSettings() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>You&apos;re on the Growth plan, billed monthly.</CardDescription>
          </div>
          <Badge variant="primary">Growth</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-3xl font-semibold text-fg">
              {formatCurrency(149)}
              <span className="text-base font-normal text-fg-muted">/month</span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">Next billing date: September 1, 2026</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Compare plans</Button>
            <Button size="sm">Upgrade plan</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>Used for your monthly subscription.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-14 items-center justify-center rounded-md bg-surface-2 text-fg-secondary">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">Visa ending in 4242</p>
              <p className="text-sm text-fg-muted">Expires 09/2028</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Update</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Billing history</CardTitle>
            <CardDescription>Download past invoices for your records.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-fg">{inv.id}</TableCell>
                  <TableCell className="text-fg-muted">{formatDate(inv.date)}</TableCell>
                  <TableCell className="tabular-nums text-fg-secondary">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="success" dot>{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-fg-muted">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
