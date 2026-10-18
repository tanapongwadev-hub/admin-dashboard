"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkMaterialDeletionAction, deleteMaterialPermanentlyAction } from "@/app/(dashboard)/materials/catalog/actions";
import type { Material } from "@/lib/api/materials";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

const CONFIRM_WORD = "ลบถาวร";

type CheckState = { status: "checking" } | { status: "ok" } | { status: "ok-with-bom"; boms: number } | { status: "blocked"; reasons: string[] } | { status: "error"; message: string };

// Bulk permanent delete: every selected material is checked with the same
// dependency check as the single dialog; only the ones that pass are deleted
// (each with its own code as confirmation), the rest are reported and kept.
export function MaterialPcBulkDeleteDialog({ materials, onClose, onDone }: {
  materials: Material[]; onClose: () => void; onDone: () => void;
}) {
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [word, setWord] = useState("");
  const [includeBom, setIncludeBom] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const material of materials) {
        let state: CheckState;
        try {
          const result = await checkMaterialDeletionAction(material.id);
          state = result.status === "error" ? { status: "error", message: result.message }
            : result.check.canDelete ? { status: "ok" }
            : result.check.canDeleteWithBom ? { status: "ok-with-bom", boms: result.check.ownBomCount ?? 0 } : { status: "blocked", reasons: result.check.blockers };
        } catch { state = { status: "error", message: CONNECTION_ERROR_MESSAGE }; }
        if (cancelled) return;
        setChecks((prev) => ({ ...prev, [material.id]: state }));
      }
    })();
    return () => { cancelled = true; };
  }, [materials]);

  const checking = materials.some((m) => !checks[m.id] || checks[m.id].status === "checking");
  const withBom = materials.filter((m) => checks[m.id]?.status === "ok-with-bom");
  const deletable = materials.filter((m) => checks[m.id]?.status === "ok" || (includeBom && checks[m.id]?.status === "ok-with-bom"));
  const kept = materials.filter((m) => checks[m.id] && !deletable.includes(m) && checks[m.id].status !== "checking");
  const wordMatches = word === CONFIRM_WORD;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || checking || deletable.length === 0 || !wordMatches) return;
    setPending(true);
    setError("");
    let deleted = 0;
    const failed: string[] = [];
    for (const material of deletable) {
      try {
        const result = await deleteMaterialPermanentlyAction(material.id, material.code, includeBom && checks[material.id]?.status === "ok-with-bom");
        if (result.status === "success") deleted += 1;
        else failed.push(`${material.code}: ${result.message}`);
      } catch { failed.push(`${material.code}: ${CONNECTION_ERROR_MESSAGE}`); }
    }
    setPending(false);
    if (deleted > 0) toast.success(`ลบวัสดุถาวรแล้ว ${deleted} รายการ`, failed.length ? { description: `ลบไม่สำเร็จ ${failed.length} รายการ` } : undefined);
    if (failed.length > 0) { setError(failed.join("\n")); if (deleted > 0) onDone(); return; }
    onDone();
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent fullScreenOnMobile size="lg" className="overflow-hidden sm:max-w-xl">
      <DialogHeader className="shrink-0 gap-3 pr-12">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger-soft text-danger"><Trash2 className="size-5" aria-hidden="true" /></span>
          <div>
            <DialogTitle className="text-lg">ลบวัสดุถาวร {materials.length} รายการ</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">ระบบตรวจข้อมูลอ้างอิงทีละรายการ และลบเฉพาะรายการที่ไม่มีข้อมูลอ้างอิง</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {materials.map((material) => {
              const state = checks[material.id];
              return <li key={material.id} className="flex items-start gap-3 bg-surface px-3 py-2.5 text-sm">
                <span className="mt-0.5 shrink-0">
                  {!state || state.status === "checking" ? <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    : state.status === "ok" || (state.status === "ok-with-bom" && includeBom) ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    : <Link2 className="size-4 text-warning" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono font-semibold text-fg">{material.code}</p>
                  <p className="break-words text-xs text-fg-secondary">{material.name}</p>
                  {state?.status === "ok-with-bom" && <p className="mt-1 text-xs text-warning-fg">มี BOM {state.boms} เวอร์ชัน{includeBom ? " — จะถูกลบพร้อมวัสดุ" : " — ติ๊กด้านล่างเพื่อลบพร้อม BOM/Workflow"}</p>}
                  {state?.status === "blocked" && <p className="mt-1 text-xs text-warning-fg">ลบไม่ได้: {state.reasons.join(", ")}</p>}
                  {state?.status === "error" && <p className="mt-1 text-xs text-danger">ตรวจสอบไม่สำเร็จ: {state.message}</p>}
                </div>
              </li>;
            })}
          </ul>

          {!checking && <p className="text-sm text-fg-secondary">ลบได้ <span className="font-semibold text-success">{deletable.length}</span> รายการ{kept.length > 0 && <> · ข้าม <span className="font-semibold text-warning-fg">{kept.length}</span> รายการ (ยังมีข้อมูลอ้างอิง ให้ใช้ปิดใช้งานแทน)</>}</p>}

          {!checking && withBom.length > 0 && <label className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-fg">
            <input type="checkbox" className="mt-0.5 size-4" checked={includeBom} disabled={pending} onChange={(event) => setIncludeBom(event.target.checked)} />
            <span>ลบ BOM, Workflow และรายการส่วนประกอบที่อ้างอิงวัสดุ {withBom.length} รายการด้วย (ใน BOM วัสดุ/สินค้าอื่น) (ลบถาวร กู้คืนไม่ได้)</span>
          </label>}

          {!checking && deletable.length > 0 && <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-fg-secondary"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /><p>{deletable.length} รายการจะถูกลบออกจากทะเบียนวัสดุถาวร และกู้คืนไม่ได้</p></div>
            <div className="space-y-2">
              <Label htmlFor="material-bulk-delete-word">พิมพ์ “{CONFIRM_WORD}” เพื่อยืนยัน</Label>
              <Input id="material-bulk-delete-word" className="h-11" autoComplete="off" value={word} onChange={(event) => setWord(event.target.value)} disabled={pending} />
            </div>
          </div>}
          {error && <p role="alert" className="whitespace-pre-line break-words rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter className="shrink-0 flex-wrap bg-surface-2/50 px-5 sm:px-6">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" disabled={pending} onClick={onClose}>{deletable.length === 0 && !checking ? "ปิดหน้าต่าง" : "ยกเลิก"}</Button>
          {deletable.length > 0 && <Button type="submit" variant="danger" className="h-11 flex-1 sm:flex-none" disabled={pending || checking || !wordMatches}>{pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}{pending ? "กำลังลบ…" : `ลบถาวร ${deletable.length} รายการ`}</Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
