"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, Ban, Check, CheckCircle2, Link2, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { checkMaterialDeletionAction, deleteMaterialPermanentlyAction, type MaterialDeletionResult } from "@/app/(dashboard)/materials/catalog/actions";
import type { Material } from "@/lib/api/materials";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export function MaterialPcDeleteDialog({ material, onClose, onDeleted, onDeactivate }: {
  material: Material; onClose: () => void; onDeleted: () => void; onDeactivate: () => void;
}) {
  const [result, setResult] = useState<MaterialDeletionResult | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    checkMaterialDeletionAction(material.id).then((value) => { if (!cancelled) setResult(value); })
      .catch(() => { if (!cancelled) setResult({ status: "error", message: CONNECTION_ERROR_MESSAGE }); });
    return () => { cancelled = true; };
  }, [material.id, attempt]);
  const check = result?.status === "success" ? result.check : null;
  const identity = check?.material ?? material;
  const codeMatches = !!check && code === check.material.code;
  const blocked = check?.canDelete === false;
  const location = identity.locationType === "internal" ? "Internal (ภายใน)" : identity.locationType === "external" ? "External (ภายนอก)" : "ไม่ระบุ";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !check?.canDelete || code !== check.material.code) return;
    setPending(true);
    setError("");
    try {
      const deleted = await deleteMaterialPermanentlyAction(material.id, code);
      if (deleted.status === "error") { setError(deleted.message); return; }
      toast.success("ลบวัสดุถาวรแล้ว", { description: check.material.code });
      onDeleted();
    } catch { setError(CONNECTION_ERROR_MESSAGE); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent fullScreenOnMobile size="lg" className="overflow-hidden sm:max-w-xl">
      <DialogHeader className="shrink-0 gap-3 pr-12">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger-soft text-danger"><Trash2 className="size-5" aria-hidden="true" /></span>
          <div>
            <DialogTitle className="text-lg">ลบ Material ถาวร</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">ตรวจสอบรายการและข้อมูลอ้างอิงก่อนยืนยัน</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section aria-label="วัสดุที่ต้องการลบ" className="overflow-hidden rounded-lg border border-border border-l-4 border-l-danger bg-surface">
            <div className="space-y-2 p-4">
              <p className="text-xs font-medium text-fg-muted">รายการที่เลือก</p>
              <p className="break-all font-mono text-lg font-semibold tracking-tight text-fg">{identity.code}</p>
              <p className="break-words text-sm text-fg-secondary">{identity.name}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-border bg-surface-2 px-4 py-3 text-xs">
              <div><dt className="text-fg-muted">Location Type</dt><dd className="mt-1 font-medium text-fg">{location}</dd></div>
              <div><dt className="text-fg-muted">สถานะวัสดุ</dt><dd className="mt-1"><Badge variant={material.isActive ? "success" : "neutral"}>{material.isActive ? "ใช้งาน" : "ปิดใช้งาน"}</Badge></dd></div>
            </dl>
          </section>

          {!result && <div role="status" className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-4"><Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" /><div><p className="text-sm font-medium text-fg">กำลังตรวจสอบข้อมูลอ้างอิง</p><p className="mt-1 text-xs text-fg-muted">ตรวจสอบ BOM สต็อก และประวัติที่เชื่อมโยงกับวัสดุ</p></div></div>}

          {result?.status === "error" && <div role="alert" className="space-y-3 rounded-lg border border-danger/20 bg-danger-soft p-4"><p className="text-sm font-semibold text-danger">ตรวจสอบข้อมูลไม่สำเร็จ</p><p className="break-words text-sm text-fg-secondary">{result.message}</p><Button type="button" variant="outline" size="sm" onClick={() => { setResult(null); setAttempt((value) => value + 1); }}><RotateCcw className="size-3.5" aria-hidden="true" />ลองตรวจสอบอีกครั้ง</Button></div>}

          {blocked && check && <section aria-labelledby="material-delete-blocked" className="overflow-hidden rounded-lg border border-warning/30">
            <div className="flex items-start gap-3 bg-warning-soft p-4"><Link2 className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" /><div><h3 id="material-delete-blocked" className="text-sm font-semibold text-fg">วัสดุนี้ยังลบถาวรไม่ได้</h3><p className="mt-1 text-xs leading-relaxed text-fg-secondary">พบข้อมูลอ้างอิง {check.blockers.length} ประเภทที่ต้องเก็บประวัติไว้</p></div></div>
            <ul className="divide-y divide-border px-4">{check.blockers.map((blocker) => <li key={blocker} className="flex items-center gap-2.5 py-3 text-sm text-fg-secondary"><span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />{blocker}</li>)}</ul>
            <p className="border-t border-border bg-surface-2 px-4 py-3 text-xs leading-relaxed text-fg-secondary">{material.isActive ? "เลือกปิดใช้งานแทน เพื่อหยุดใช้งานวัสดุและเก็บข้อมูลอ้างอิงไว้" : "วัสดุนี้ปิดใช้งานแล้ว ข้อมูลอ้างอิงและประวัติยังคงอยู่"}</p>
          </section>}

          {check?.canDelete && <>
            <div className="flex items-start gap-3 rounded-lg border border-success/25 bg-success-soft p-4"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" /><div><p className="text-sm font-semibold text-fg">ผ่านการตรวจสอบข้อมูลอ้างอิง</p><p className="mt-1 text-xs text-fg-secondary">ไม่พบข้อมูลที่ขัดขวางการลบวัสดุนี้</p></div><CheckCircle2 className="ml-auto mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /></div>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-fg-secondary"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /><p>รายการนี้จะถูกลบออกจากทะเบียนวัสดุถาวร และกู้คืนไม่ได้</p></div>
              <div className="space-y-2">
                <Label htmlFor="material-delete-code">พิมพ์รหัสวัสดุเพื่อยืนยัน</Label>
                <p id="material-delete-code-hint" className="break-words text-xs text-fg-muted">กรอกรหัส <span className="break-all font-mono font-semibold text-fg">{check.material.code}</span> ให้ตรงกันทุกตัวอักษร</p>
                <div className="relative"><Input id="material-delete-code" className="h-11 pr-10 font-mono text-base" autoComplete="off" autoCapitalize="none" spellCheck={false} value={code} onChange={(event) => setCode(event.target.value)} disabled={pending} aria-describedby="material-delete-code-hint material-delete-code-status" />{codeMatches && <Check className="pointer-events-none absolute right-3 top-3 size-5 text-success" aria-hidden="true" />}</div>
                <p id="material-delete-code-status" className={`min-h-4 text-xs ${codeMatches ? "text-success" : "text-fg-muted"}`}>{codeMatches ? "รหัสตรงกัน พร้อมยืนยันลบ" : code ? "รหัสยังไม่ตรงกับรายการที่เลือก" : "ปุ่มยืนยันจะเปิดเมื่อกรอกรหัสตรงกัน"}</p>
              </div>
            </div>
          </>}
          {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        </div>
        <DialogFooter className="shrink-0 flex-wrap bg-surface-2/50 px-5 sm:px-6">
          <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" disabled={pending} onClick={onClose}>{blocked ? "ปิดหน้าต่าง" : "ยกเลิก"}</Button>
          {material.isActive && (blocked || error) && <Button type="button" variant={blocked ? "primary" : "secondary"} className="h-11 flex-1 sm:flex-none" disabled={pending} onClick={onDeactivate}><Ban className="size-4" aria-hidden="true" />ปิดใช้งานแทน</Button>}
          {!blocked && <Button type="submit" variant="danger" className="h-11 flex-1 sm:flex-none" disabled={pending || !check?.canDelete || !codeMatches}>{pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}{pending ? "กำลังลบ…" : "ยืนยันลบถาวร"}</Button>}
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
