"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Separator } from "@/components/ui/separator";

export function ProfileSettings() {
  const [saving, setSaving] = React.useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("อัปเดตโปรไฟล์แล้ว");
    }, 600);
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>รูปโปรไฟล์</CardTitle>
            <CardDescription>รูปนี้จะแสดงในโปรไฟล์ของคุณและแถบด้านข้าง</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <UserAvatar name="Maya Chen" className="h-16 w-16 text-base" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm">อัปโหลดใหม่</Button>
            <Button type="button" variant="ghost" size="sm" className="text-danger">ลบ</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>ข้อมูลส่วนตัว</CardTitle>
            <CardDescription>อัปเดตชื่อ อีเมล และประวัติย่อของคุณ</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">ชื่อจริง</Label>
              <Input id="firstName" defaultValue="Maya" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">นามสกุล</Label>
              <Input id="lastName" defaultValue="Chen" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ที่อยู่อีเมล</Label>
            <Input id="email" type="email" defaultValue="maya@panel.io" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">ตำแหน่งงาน</Label>
            <Input id="title" defaultValue="Head of Operations" />
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">ประวัติย่อ</Label>
            <textarea
              id="bio"
              rows={3}
              defaultValue="Running operations for the Panel workspace. Coffee enthusiast."
              className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
