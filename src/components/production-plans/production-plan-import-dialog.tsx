"use client";

import * as React from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { importProductionPlanAction } from "@/app/(dashboard)/production/plans/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProductionPlanImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await importProductionPlanAction(
      new FormData(event.currentTarget),
    );
    setPending(false);
    if (result.status === "error") return toast.error(result.message);
    toast.success("นำเข้าแผนการผลิตแล้ว", { description: result.plan.code });
    onOpenChange(false);
    onImported();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-success-soft text-success">
              <FileSpreadsheet className="size-5" />
            </span>
            <div>
              <DialogTitle>นำเข้าแผนจาก Excel</DialogTitle>
              <DialogDescription>
                แถวแรกต้องมีคอลัมน์ Product Code, Quantity, Need-by Date และ
                Remark ตรงตามชื่อนี้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <Label htmlFor="plan-file">ไฟล์ Excel (.xlsx)</Label>
              <Input
                id="plan-file"
                name="file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-title">ชื่อแผน</Label>
              <Input id="import-title" name="title" maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-remark">หมายเหตุ</Label>
              <Textarea
                id="import-remark"
                name="remark"
                maxLength={2000}
                rows={3}
              />
            </div>
            <p className="text-xs text-fg-muted">
              ไฟล์หนึ่งไฟล์จะสร้างหนึ่งแผนแบบร่าง
              ทุกแถวต้องอ้างถึงสินค้าที่ใช้งานและมี ACTIVE BOM
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              <Upload className="size-4" />
              {pending ? "กำลังนำเข้า..." : "นำเข้าไฟล์"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
