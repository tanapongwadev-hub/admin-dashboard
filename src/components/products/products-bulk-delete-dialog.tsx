"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkProductDeletionAction, deleteProductPermanentlyAction } from "@/app/(dashboard)/engineering/products/actions";
import type { Product } from "@/lib/api/products";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

const CONFIRM_WORD = "ลบถาวร";

type CheckState =
  | { status: "ok"; boms: number; workflows: number }
  | { status: "blocked"; reasons: string[] }
  | { status: "error"; message: string };

// Bulk permanent delete. Each product is checked first; the ones that pass are
// deleted together with their own BOMs and workflows, the rest (stock, plans,
// orders, sales history) are kept and reported.
export function ProductsBulkDeleteDialog({ products, onClose, onDone }: {
  products: Product[]; onClose: () => void; onDone: () => void;
}) {
  const [checks, setChecks] = useState<Record<string, CheckState>>({});
  const [word, setWord] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const product of products) {
        let state: CheckState;
        try {
          const result = await checkProductDeletionAction(product.id);
          state = result.status === "error" ? { status: "error", message: result.message }
            : result.check.canDelete ? { status: "ok", boms: result.check.bomCount, workflows: result.check.workflowCount }
            : { status: "blocked", reasons: result.check.blockers };
        } catch { state = { status: "error", message: CONNECTION_ERROR_MESSAGE }; }
        if (cancelled) return;
        setChecks((prev) => ({ ...prev, [product.id]: state }));
      }
    })();
    return () => { cancelled = true; };
  }, [products]);

  const checking = products.some((p) => !checks[p.id]);
  const deletable = products.filter((p) => checks[p.id]?.status === "ok");
  const kept = products.filter((p) => checks[p.id] && checks[p.id].status !== "ok");
  const bomTotal = deletable.reduce((sum, p) => { const c = checks[p.id]; return sum + (c?.status === "ok" ? c.boms : 0); }, 0);
  const wfTotal = deletable.reduce((sum, p) => { const c = checks[p.id]; return sum + (c?.status === "ok" ? c.workflows : 0); }, 0);
  const wordMatches = word === CONFIRM_WORD;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || checking || deletable.length === 0 || !wordMatches) return;
    setPending(true);
    setError("");
    let deleted = 0;
    const failed: string[] = [];
    for (const product of deletable) {
      try {
        const result = await deleteProductPermanentlyAction(product.id, product.code);
        if (result.status === "success") deleted += 1;
        else failed.push(`${product.code}: ${result.message}`);
      } catch { failed.push(`${product.code}: ${CONNECTION_ERROR_MESSAGE}`); }
    }
    setPending(false);
    if (deleted > 0) toast.success(`ลบสินค้าถาวรแล้ว ${deleted} รายการ`, failed.length ? { description: `ลบไม่สำเร็จ ${failed.length} รายการ` } : undefined);
    if (failed.length > 0) { setError(failed.join("\n")); if (deleted > 0) onDone(); return; }
    onDone();
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent fullScreenOnMobile size="lg" className="overflow-hidden sm:max-w-xl">
      <DialogHeader className="shrink-0 gap-3 pr-12">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-danger/20 bg-danger-soft text-danger"><Trash2 className="size-5" aria-hidden="true" /></span>
          <div>
            <DialogTitle className="text-lg">ลบสินค้าถาวร {products.length} รายการ</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">ลบสินค้าพร้อม BOM และ Workflow ของสินค้า เฉพาะรายการที่ไม่มีประวัติสต็อก แผนผลิต ใบสั่งผลิต หรือการขาย</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {products.map((product) => {
              const state = checks[product.id];
              return <li key={product.id} className="flex items-start gap-3 bg-surface px-3 py-2.5 text-sm">
                <span className="mt-0.5 shrink-0">
                  {!state ? <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                    : state.status === "ok" ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                    : <Link2 className="size-4 text-warning" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-mono font-semibold text-fg">{product.code}</p>
                  <p className="break-words text-xs text-fg-secondary">{product.name}</p>
                  {state?.status === "ok" && (state.boms > 0 || state.workflows > 0) && <p className="mt-1 text-xs text-warning-fg">จะลบ BOM {state.boms} และ Workflow {state.workflows} เวอร์ชันของสินค้านี้ด้วย</p>}
                  {state?.status === "blocked" && <p className="mt-1 text-xs text-warning-fg">ลบไม่ได้: มี{state.reasons.join(", ")} — ใช้ปิดใช้งานแทน</p>}
                  {state?.status === "error" && <p className="mt-1 text-xs text-danger">ตรวจสอบไม่สำเร็จ: {state.message}</p>}
                </div>
              </li>;
            })}
          </ul>

          {!checking && <p className="text-sm text-fg-secondary">ลบได้ <span className="font-semibold text-success">{deletable.length}</span> รายการ{kept.length > 0 && <> · ข้าม <span className="font-semibold text-warning-fg">{kept.length}</span> รายการ</>}</p>}

          {!checking && deletable.length > 0 && <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-fg-secondary"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /><p>สินค้า {deletable.length} รายการ{bomTotal + wfTotal > 0 ? ` พร้อม BOM ${bomTotal} และ Workflow ${wfTotal} เวอร์ชัน` : ""} จะถูกลบถาวร และกู้คืนไม่ได้</p></div>
            <div className="space-y-2">
              <Label htmlFor="product-bulk-delete-word">พิมพ์ “{CONFIRM_WORD}” เพื่อยืนยัน</Label>
              <Input id="product-bulk-delete-word" className="h-11" autoComplete="off" value={word} onChange={(event) => setWord(event.target.value)} disabled={pending} />
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
