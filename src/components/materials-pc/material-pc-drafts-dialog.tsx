"use client";

import * as React from "react";
import { ArrowRight, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import { deleteMaterialDraftAction, listMaterialDraftsAction, loadMaterialDraftAction } from "@/app/(dashboard)/materials/catalog/actions";
import type { Material, MaterialDraftRecord, MaterialDraftSummary } from "@/lib/api/materials";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

function getDraftRowActions(draft: MaterialDraftSummary, resume: (id: string) => void, remove: (draft: MaterialDraftSummary) => void, busy: boolean): RowAction[] {
  if (busy) return [];
  return [
    { label: "เปิดทำต่อ", icon: ArrowRight, onSelect: () => resume(draft.id) },
    { label: "ลบร่าง", icon: Trash2, variant: "danger", onSelect: () => remove(draft) },
  ];
}

export function MaterialPcDraftsDialog({ onClose, onResume }: {
  onClose: () => void;
  onResume: (draft: MaterialDraftRecord, material: Material | null) => void;
}) {
  const [response, setResponse] = React.useState<Awaited<ReturnType<typeof listMaterialDraftsAction>> | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<MaterialDraftSummary | null>(null);
  const live = React.useRef(true);

  React.useEffect(() => {
    live.current = true;
    let active = true;
    listMaterialDraftsAction().then((result) => { if (active) setResponse(result); })
      .catch(() => { if (active) setResponse({ status: "error", message: CONNECTION_ERROR_MESSAGE }); });
    return () => { active = false; live.current = false; };
  }, []);

  async function resume(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const result = await loadMaterialDraftAction(id);
      if (!live.current) return;
      if (result.status === "error") { toast.error(result.message); return; }
      onResume(result.value.draft, result.value.material);
    } catch { if (live.current) toast.error(CONNECTION_ERROR_MESSAGE); }
    finally { if (live.current) setBusyId(null); }
  }

  async function remove(target: MaterialDraftSummary) {
    if (busyId) return;
    setBusyId(target.id);
    try {
      const result = await deleteMaterialDraftAction(target.id);
      if (!live.current) return;
      if (result.status === "error") { toast.error(result.message); return; }
      setResponse((current) => current?.status === "success" ? { ...current, value: current.value.filter((row) => row.id !== target.id) } : current);
      toast.success("ลบร่างแล้ว");
    } catch { if (live.current) toast.error(CONNECTION_ERROR_MESSAGE); }
    finally { if (live.current) setBusyId(null); }
  }

  return <>
    <Dialog open onOpenChange={(open) => { if (!open && !busyId) onClose(); }}>
      <DialogContent fullScreenOnMobile size="lg">
        <DialogHeader><DialogTitle>ร่างของฉัน</DialogTitle><DialogDescription>ฟอร์มที่ยังไม่บันทึกเป็น Material · แสดงเฉพาะร่างที่คุณบันทึกไว้</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5 sm:p-6">
          {!response && <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted"><Loader2 className="size-4 animate-spin" aria-hidden="true" />กำลังโหลดร่าง…</p>}
          {response?.status === "error" && <p role="alert" className="text-sm text-danger">{response.message} กรุณาปิดแล้วเปิดใหม่</p>}
          {response?.status === "success" && response.value.length === 0 && <div className="py-8 text-center"><FileText className="mx-auto size-8 text-fg-muted" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-fg">ยังไม่มีร่าง</p><p className="mt-1 text-xs text-fg-muted">ใช้ปุ่ม บันทึกร่าง ในฟอร์มเพิ่มหรือแก้ไขวัสดุ</p></div>}
          {response?.status === "success" && response.value.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="break-all font-mono text-xs font-semibold text-primary">{row.code || "ยังไม่ระบุรหัส"}</p><p className="mt-1 break-words text-sm font-medium text-fg">{row.name || "ยังไม่ระบุชื่อ"}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant="neutral">{row.materialId ? "ร่างแก้ไข" : "ร่างเพิ่มใหม่"}</Badge>{row.materialType && <Badge variant="primary">{row.materialType}</Badge>}<span className="text-xs text-fg-muted">ขั้น {row.step + 1} · {new Date(row.updatedAt).toLocaleString("th-TH")}</span></div></div>
            <Button variant="outline" size="sm" disabled={!!busyId} onClick={() => void resume(row.id)}>{busyId === row.id ? "กำลังดำเนินการ…" : "ทำต่อ"}</Button>
            <RowActionsMenu itemLabel={row.code || `ร่าง ${row.id}`} actions={getDraftRowActions(row, (id) => void resume(id), setDeleteTarget, !!busyId)} />
          </div>)}
        </div>
        <DialogFooter><Button type="button" variant="outline" disabled={!!busyId} onClick={onClose}>ปิด</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }} title="ลบร่างนี้?" description="ข้อมูลและรูปภาพในร่างจะถูกลบ โดยไม่กระทบ Material หรือสต็อกที่มีอยู่" confirmLabel="ลบร่าง" onConfirm={() => { if (deleteTarget) void remove(deleteTarget); }} />
  </>;
}
