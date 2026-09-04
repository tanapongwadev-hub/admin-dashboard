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
            <CardTitle>แพ็กเกจปัจจุบัน</CardTitle>
            <CardDescription>คุณกำลังใช้แพ็กเกจ Growth เรียกเก็บเงินรายเดือน</CardDescription>
          </div>
          <Badge variant="primary">Growth</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-3xl font-semibold text-fg">
              {formatCurrency(149)}
              <span className="text-base font-normal text-fg-muted">/เดือน</span>
            </p>
            <p className="mt-1 text-sm text-fg-muted">วันที่เรียกเก็บเงินถัดไป: 1 กันยายน 2026</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">เปรียบเทียบแพ็กเกจ</Button>
            <Button size="sm">อัปเกรดแพ็กเกจ</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>วิธีการชำระเงิน</CardTitle>
            <CardDescription>ใช้สำหรับการสมัครสมาชิกรายเดือนของคุณ</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-14 items-center justify-center rounded-md bg-surface-2 text-fg-secondary">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">Visa ลงท้ายด้วย 4242</p>
              <p className="text-sm text-fg-muted">หมดอายุ 09/2028</p>
            </div>
          </div>
          <Button variant="outline" size="sm">อัปเดต</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>ประวัติการเรียกเก็บเงิน</CardTitle>
            <CardDescription>ดาวน์โหลดใบแจ้งหนี้ย้อนหลังเพื่อเก็บไว้เป็นหลักฐาน</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ใบแจ้งหนี้</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead>จำนวนเงิน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">ใบเสร็จ</TableHead>
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
