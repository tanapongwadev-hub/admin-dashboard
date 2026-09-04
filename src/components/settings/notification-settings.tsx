"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const emailOptions = [
  { id: "orders", label: "คำสั่งซื้อใหม่", description: "รับการแจ้งเตือนเมื่อมีคำสั่งซื้อใหม่เข้ามา" },
  { id: "stock", label: "การแจ้งเตือนสินค้าใกล้หมด", description: "รับการแจ้งเตือนเมื่อสินค้าใกล้หมด" },
  { id: "team", label: "กิจกรรมของทีม", description: "อัปเดตเมื่อสมาชิกในทีมเข้าร่วม แก้ไข หรือแสดงความคิดเห็น" },
  { id: "reports", label: "รายงานประจำสัปดาห์", description: "สรุปผลการดำเนินงานทุกวันจันทร์" },
];

const pushOptions = [
  { id: "mentions", label: "การกล่าวถึง", description: "เมื่อมีคนกล่าวถึงคุณในความคิดเห็น" },
  { id: "payments", label: "การชำระเงินล้มเหลว", description: "แจ้งเตือนทันทีเมื่อการชำระเงินล้มเหลว" },
];

export function NotificationSettings() {
  const [email, setEmail] = React.useState<Record<string, boolean>>({ orders: true, stock: true, team: false, reports: true });
  const [push, setPush] = React.useState<Record<string, boolean>>({ mentions: true, payments: true });
  const [marketing, setMarketing] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>การแจ้งเตือนทางอีเมล</CardTitle>
            <CardDescription>เลือกสิ่งที่คุณต้องการให้แจ้งเตือนทางอีเมล</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {emailOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-fg">{opt.label}</p>
                <p className="text-sm text-fg-muted">{opt.description}</p>
              </div>
              <Switch checked={email[opt.id]} onCheckedChange={(v) => setEmail((prev) => ({ ...prev, [opt.id]: v }))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>การแจ้งเตือนแบบพุช</CardTitle>
            <CardDescription>การแจ้งเตือนแบบเรียลไทม์ที่ส่งไปยังเบราว์เซอร์หรืออุปกรณ์ของคุณ</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {pushOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-fg">{opt.label}</p>
                <p className="text-sm text-fg-muted">{opt.description}</p>
              </div>
              <Switch checked={push[opt.id]} onCheckedChange={(v) => setPush((prev) => ({ ...prev, [opt.id]: v }))} />
            </div>
          ))}
          <Separator className="hidden" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>อีเมลการตลาด</CardTitle>
            <CardDescription>อัปเดตผลิตภัณฑ์ เคล็ดลับ และข้อเสนอเป็นครั้งคราว</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-fg-secondary">รับอีเมลการตลาดจาก Panel</p>
          <Switch checked={marketing} onCheckedChange={setMarketing} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => toast.success("บันทึกการตั้งค่าการแจ้งเตือนแล้ว")}>บันทึกการตั้งค่า</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
