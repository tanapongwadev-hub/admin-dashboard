"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMenuAction, type MenuMutationResult } from "@/app/(dashboard)/menus/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FlatMenuNode } from "@/lib/menu-tree";

export function MenuDeleteDialog({
  menu,
  open,
  onOpenChange,
  onDeleted,
}: {
  menu: FlatMenuNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (result: Extract<MenuMutationResult, { status: "success" }>) => void;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete() {
    if (!menu) return;
    setIsDeleting(true);
    const result = await deleteMenuAction(menu.id);
    setIsDeleting(false);

    if (result.status === "success") {
      toast.success("ลบเมนูแล้ว", { description: menu.nameTh });
      onDeleted(result);
      onOpenChange(false);
      return;
    }
    if (result.status === "refresh_required") {
      toast.success(result.message);
      window.location.reload();
      return;
    }
    toast.error(result.message, {
      description: "เมนูที่มีเมนูย่อยหรือ permission ผูกอยู่จะยังลบไม่ได้",
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isDeleting && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-4.5 w-4.5" />
          </span>
          <div>
            <DialogTitle>ลบเมนู {menu?.nameTh}</DialogTitle>
            <DialogDescription className="mt-1">
              การลบถาวรย้อนกลับไม่ได้ และทำได้เฉพาะเมนูที่ไม่มีเมนูย่อยหรือ permission ผูกอยู่
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>ยกเลิก</Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting || !menu}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? "กำลังลบ..." : "ลบเมนูถาวร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
