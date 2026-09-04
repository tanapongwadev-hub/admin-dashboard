"use client";

import * as React from "react";
import { toast } from "sonner";
import { Laptop, Smartphone, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const sessions = [
  { id: "s1", device: "MacBook Pro · Chrome", location: "Bangkok, Thailand", current: true, icon: Laptop },
  { id: "s2", device: "iPhone 15 · Panel app", location: "Bangkok, Thailand", current: false, icon: Smartphone },
  { id: "s3", device: "Windows PC · Edge", location: "Singapore", current: false, icon: Laptop },
];

export function SecuritySettings() {
  const [twoFactor, setTwoFactor] = React.useState(true);

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    toast.success("อัปเดตรหัสผ่านแล้ว");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
            <CardDescription>ใช้รหัสผ่านที่รัดกุมและไม่ซ้ำกับที่อื่น</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current">รหัสผ่านปัจจุบัน</Label>
              <Input id="current" type="password" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new">รหัสผ่านใหม่</Label>
                <Input id="new" type="password" required minLength={8} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">ยืนยันรหัสผ่านใหม่</Label>
                <Input id="confirm" type="password" required minLength={8} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit">อัปเดตรหัสผ่าน</Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>การยืนยันตัวตนสองขั้นตอน</CardTitle>
            <CardDescription>เพิ่มความปลอดภัยอีกขั้นให้กับบัญชีของคุณ</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">แอปยืนยันตัวตน</p>
              <p className="text-sm text-fg-muted">{twoFactor ? "เปิดใช้งาน" : "ไม่ได้เปิดใช้งาน"}</p>
            </div>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>เซสชันที่ใช้งานอยู่</CardTitle>
            <CardDescription>อุปกรณ์ที่เข้าสู่ระบบบัญชีของคุณอยู่ในขณะนี้</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                  <session.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    {session.device}
                    {session.current && <Badge variant="success" className="text-[10px]">อุปกรณ์นี้</Badge>}
                  </p>
                  <p className="text-sm text-fg-muted">{session.location}</p>
                </div>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => toast.success("เพิกถอนเซสชันแล้ว")}>
                  เพิกถอน
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
