"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function AccountSettings() {
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>การตั้งค่าทั่วไป</CardTitle>
            <CardDescription>ภาษา เขตเวลา และรูปแบบการแสดงวันที่ทั่วทั้งพื้นที่ทำงาน</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>ภาษา</Label>
              <Select defaultValue="en">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>เขตเวลา</Label>
              <Select defaultValue="bangkok">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bangkok">(GMT+7) กรุงเทพฯ</SelectItem>
                  <SelectItem value="utc">(GMT+0) UTC</SelectItem>
                  <SelectItem value="ny">(GMT-5) นิวยอร์ก</SelectItem>
                  <SelectItem value="tokyo">(GMT+9) โตเกียว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>รูปแบบวันที่</Label>
              <Select defaultValue="mdy">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>สกุลเงิน</Label>
              <Select defaultValue="usd">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="thb">THB (฿)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => toast.success("บันทึกการตั้งค่าแล้ว")}>บันทึกการตั้งค่า</Button>
        </CardFooter>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <div>
            <CardTitle className="text-danger">โซนอันตราย</CardTitle>
            <CardDescription>การดำเนินการที่ไม่สามารถย้อนกลับได้สำหรับบัญชีนี้</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-fg">ลบบัญชี</p>
            <p className="text-sm text-fg-muted">ลบบัญชีของคุณและข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร</p>
          </div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>ลบบัญชี</Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="ลบบัญชีของคุณหรือไม่?"
        description="การดำเนินการนี้จะลบบัญชี สิทธิ์การเข้าถึงพื้นที่ทำงาน และข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร และไม่สามารถย้อนกลับได้"
        confirmLabel="ลบบัญชี"
        onConfirm={() => toast.success("กำหนดการลบบัญชีเรียบร้อยแล้ว")}
      />
    </div>
  );
}
