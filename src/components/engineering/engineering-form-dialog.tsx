"use client";

import { useState, useTransition } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MasterDataEmptyLink } from '@/components/ui/master-data-empty-link';
import { createEngineeringAction } from '@/app/(dashboard)/bom-workflow/actions';
import type { EngineeringScope, EngineeringKind, EngineeringVersion } from '@/lib/api/engineering';
import type { Material } from '@/lib/api/materials';
import type { ProcessStep } from '@/lib/api/process-steps';
import type { EngineeringOwner } from './engineering-client';
import { CONNECTION_ERROR_MESSAGE } from '@/lib/user-error';

const schema = z.object({
  kind: z.enum(['bom', 'workflow']), specification: z.string().max(500), remark: z.string().max(1000),
  entries: z.array(z.object({ materialId: z.string(), processStepId: z.string(), quantity: z.number().positive().max(1000000000), description: z.string().max(255), isScrap: z.boolean(), wastagePercent: z.number().min(0).max(100) })).min(1).max(200),
}).superRefine((values, context) => {
  const ids = new Set<string>();
  if (values.kind === 'workflow' && values.entries.length > 100) context.addIssue({ code: 'custom', path: ['entries'], message: 'Workflow รองรับสูงสุด 100 ขั้นตอน' });
  values.entries.forEach((entry, index) => {
    if (values.kind === 'bom') {
      if (!entry.materialId || ids.has(entry.materialId)) context.addIssue({ code: 'custom', path: ['entries', index, 'materialId'], message: 'เลือก Material โดยไม่ซ้ำกัน' });
      if (!/^\d+(\.\d{1,4})?$/.test(String(entry.quantity)) || entry.quantity < 0.0001) context.addIssue({ code: 'custom', path: ['entries', index, 'quantity'], message: 'จำนวนขั้นต่ำ 0.0001 ทศนิยมไม่เกิน 4 ตำแหน่ง' });
      ids.add(entry.materialId);
    } else if (!entry.processStepId) context.addIssue({ code: 'custom', path: ['entries', index, 'processStepId'], message: 'เลือกขั้นตอนกระบวนการ' });
  });
});
type Values = z.infer<typeof schema>;
const emptyEntry = () => ({ materialId: '', processStepId: '', quantity: 1, description: '', isScrap: false, wastagePercent: 0 });

export function EngineeringFormDialog({ scope, kind, owner, materials, processSteps, base, onClose, onSaved }: {
  scope: EngineeringScope; kind: EngineeringKind; owner: EngineeringOwner; materials: Material[]; processSteps: ProcessStep[]; base?: EngineeringVersion; onClose: () => void; onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const entries = kind === 'bom' ? base?.items?.map((item) => ({ ...emptyEntry(), materialId: item.materialId, quantity: item.quantity, description: item.remark ?? '', isScrap: item.isScrap, wastagePercent: item.wastagePercent ?? 0 })) : base?.steps?.map((step) => ({ ...emptyEntry(), processStepId: step.processStepId, description: step.description ?? '' }));
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { kind, specification: base?.specification ?? '', remark: base?.remark ?? '', entries: entries?.length ? entries : [emptyEntry()] } });
  const rows = useFieldArray({ control: form.control, name: 'entries' });
  const selected = form.watch('entries');
  const materialsForOwner = materials.filter((material) => scope !== 'materials' || material.id !== owner.id);

  function submit(values: Values) {
    const items = kind === 'bom' ? values.entries.map((entry) => ({ materialId: entry.materialId, quantity: entry.quantity, unitId: materials.find((material) => material.id === entry.materialId)?.unitId ?? '', remark: entry.description || null, isScrap: entry.isScrap, wastagePercent: entry.wastagePercent })) : undefined;
    if (items?.some((item) => !item.unitId)) { setError('ส่วนประกอบบางรายการถูกปิดใช้งาน กรุณาเลือก Material ที่พร้อมใช้งาน'); return; }
    startTransition(async () => {
      try {
        const result = await createEngineeringAction(scope, kind, owner.id, kind === 'bom' ? { specification: values.specification, remark: values.remark, items } : { remark: values.remark, steps: values.entries.map((entry) => ({ processStepId: entry.processStepId, description: entry.description || null })) });
        if (result.status === 'error') { setError(result.message); return; }
        toast.success('บันทึกเวอร์ชันร่างแล้ว'); onSaved();
      } catch { setError(CONNECTION_ERROR_MESSAGE); }
    });
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent fullScreenOnMobile size="xl" className="overflow-hidden">
    <DialogHeader><DialogTitle>{base ? 'ทำสำเนาเป็นเวอร์ชันใหม่' : 'เพิ่ม'} {kind === 'bom' ? 'BOM' : 'Workflow'}</DialogTitle><DialogDescription>{owner.code} · {owner.name} — บันทึกเป็นร่างก่อนเปิดใช้งาน</DialogDescription></DialogHeader>
    <form noValidate onSubmit={form.handleSubmit(submit, () => setError('กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือเกินกำหนดในแบบฟอร์ม'))} className="flex min-h-0 flex-1 flex-col">
      <fieldset disabled={pending} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
        {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {kind === 'bom' && <div className="space-y-1.5"><Label htmlFor="engineering-spec">ข้อมูลจำเพาะ</Label><Input id="engineering-spec" maxLength={500} {...form.register('specification')} /><p className="text-xs text-fg-muted">ระบุจำนวนส่วนประกอบที่ใช้ต่อปลายทาง 1 หน่วย</p></div>}
        {rows.fields.map((row, index) => <section key={row.id} className="space-y-3 rounded-md border border-border bg-surface-2/30 p-4">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-fg">{kind === 'bom' ? 'ส่วนประกอบ' : 'ขั้นตอน'} {index + 1}</h3><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" aria-label="เลื่อนขึ้น" disabled={pending || index === 0} onClick={() => rows.move(index, index - 1)}><ArrowUp className="size-4" /></Button><Button type="button" variant="ghost" size="sm" aria-label="เลื่อนลง" disabled={pending || index === rows.fields.length - 1} onClick={() => rows.move(index, index + 1)}><ArrowDown className="size-4" /></Button><Button type="button" variant="ghost" size="sm" aria-label="นำรายการออก" disabled={pending || rows.fields.length === 1} onClick={() => rows.remove(index)}><Trash2 className="size-4" /></Button></div></div>
          {kind === 'bom' ? <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="space-y-1.5"><Label htmlFor={`component-${index}`}>Material</Label>{materialsForOwner.length === 0 ? <MasterDataEmptyLink href="/materials/pc" resourceLabel="วัสดุส่วนประกอบ" /> : <Controller control={form.control} name={`entries.${index}.materialId`} render={({ field }) => <Select value={field.value} onValueChange={field.onChange} disabled={pending}><SelectTrigger id={`component-${index}`} ref={field.ref} onBlur={field.onBlur} aria-invalid={!!form.formState.errors.entries?.[index]?.materialId}><SelectValue placeholder="เลือก Material" /></SelectTrigger><SelectContent>{materialsForOwner.filter((material) => material.id === field.value || !selected.some((entry) => entry.materialId === material.id)).map((material) => <SelectItem key={material.id} value={material.id}>{material.code} · {material.name}</SelectItem>)}</SelectContent></Select>} />}{form.formState.errors.entries?.[index]?.materialId && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.materialId?.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor={`quantity-${index}`}>จำนวน ({materials.find((material) => material.id === selected[index]?.materialId)?.unit?.nameTh || 'หน่วยวัสดุ'})</Label><Input id={`quantity-${index}`} type="number" required min="0.0001" step="0.0001" max="1000000000" {...form.register(`entries.${index}.quantity`, { valueAsNumber: true })} aria-invalid={!!form.formState.errors.entries?.[index]?.quantity} />{form.formState.errors.entries?.[index]?.quantity && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.quantity?.message}</p>}</div>
            <label className="flex items-center gap-2 text-xs text-fg-secondary"><input type="checkbox" {...form.register(`entries.${index}.isScrap`)} />เศษวัสดุ</label><div><Label htmlFor={`wastage-${index}`}>เผื่อสูญเสีย (%)</Label><Input id={`wastage-${index}`} type="number" min="0" max="100" step="0.0001" {...form.register(`entries.${index}.wastagePercent`, { valueAsNumber: true })} />{form.formState.errors.entries?.[index]?.wastagePercent && <p role="alert" className="text-xs text-danger">ระบุค่าระหว่าง 0–100</p>}</div>
          </div> : <div className="space-y-1.5"><Label htmlFor={`process-${index}`}>ขั้นตอนกระบวนการ</Label>{processSteps.length === 0 ? <MasterDataEmptyLink href="/master-data/process-steps" resourceLabel="ขั้นตอนกระบวนการ" /> : <Controller control={form.control} name={`entries.${index}.processStepId`} render={({ field }) => <Select value={field.value} onValueChange={field.onChange} disabled={pending}><SelectTrigger id={`process-${index}`} ref={field.ref} onBlur={field.onBlur} aria-invalid={!!form.formState.errors.entries?.[index]?.processStepId}><SelectValue placeholder="เลือกขั้นตอน" /></SelectTrigger><SelectContent>{processSteps.map((step) => <SelectItem key={step.id} value={step.id}>{step.code} · {step.nameTh}</SelectItem>)}</SelectContent></Select>} />}{form.formState.errors.entries?.[index]?.processStepId && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.processStepId?.message}</p>}</div>}
          <div className="space-y-1.5"><Label htmlFor={`description-${index}`}>{kind === 'bom' ? 'หมายเหตุส่วนประกอบ' : 'รายละเอียดขั้นตอน'}</Label><Input id={`description-${index}`} maxLength={255} {...form.register(`entries.${index}.description`)} /></div>
        </section>)}
        <Button type="button" variant="secondary" disabled={pending || rows.fields.length >= (kind === 'bom' ? 200 : 100)} onClick={() => rows.append(emptyEntry())}><Plus className="mr-1 size-4" />เพิ่ม{kind === 'bom' ? 'ส่วนประกอบ' : 'ขั้นตอน'}</Button>
        <div className="space-y-1.5"><Label htmlFor="engineering-remark">หมายเหตุ</Label><Input id="engineering-remark" maxLength={1000} {...form.register('remark')} /></div>
      </fieldset>
      <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>ยกเลิก</Button><Button type="submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกร่าง'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
