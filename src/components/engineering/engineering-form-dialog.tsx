"use client";

import { useState, useTransition } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowDown, ArrowUp, Plus, Trash2, Layers3, Package, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableFilterSelect } from '@/components/ui/searchable-filter-select';
import { MasterDataEmptyLink } from '@/components/ui/master-data-empty-link';
import { activateEngineeringAction, createEngineeringAction, updateEngineeringAction } from '@/app/(dashboard)/engineering/bom/actions';
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

export function EngineeringFormDialog({ scope, kind, owner, materials, processSteps, base, editing = false, canActivate = false, onClose, onSaved }: {
  scope: EngineeringScope; kind: EngineeringKind; owner: EngineeringOwner; materials: Material[]; processSteps: ProcessStep[]; base?: EngineeringVersion; /** true: save over `base` in place (BOM that is not ACTIVE) instead of creating a new version. */ editing?: boolean; canActivate?: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const entries = kind === 'bom' ? base?.items?.map((item) => ({ ...emptyEntry(), materialId: item.materialId, quantity: item.quantity, description: item.remark ?? '', isScrap: item.isScrap, wastagePercent: item.wastagePercent ?? 0 })) : base?.steps?.map((step) => ({ ...emptyEntry(), processStepId: step.processStepId, description: step.description ?? '' }));
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { kind, specification: base?.specification ?? '', remark: base?.remark ?? '', entries: entries?.length ? entries : [emptyEntry()] } });
  const rows = useFieldArray({ control: form.control, name: 'entries' });
  const selected = form.watch('entries');
  // New BOM components exclude raw stock (PIPE/SHEET/COIL). Internal-location Materials are
  // excluded only for Material BOMs; a Product BOM may use them as in-house components.
  // One already chosen (e.g. copied from an earlier version) stays selectable.
  const isPickableComponent = (material: Material) =>
    !(['PIPE', 'SHEET', 'COIL'] as string[]).includes(material.materialType) && (scope === 'products' || material.locationType !== 'internal');
  const materialsForOwner = materials.filter((material) => scope !== 'materials' || material.id !== owner.id);

  function submit(values: Values, activate = false) {
    const items = kind === 'bom' ? values.entries.map((entry) => ({ materialId: entry.materialId, quantity: entry.quantity, unitId: materials.find((material) => material.id === entry.materialId)?.unitId ?? '', remark: entry.description || null, isScrap: entry.isScrap, wastagePercent: entry.wastagePercent })) : undefined;
    if (items?.some((item) => !item.unitId)) { setError('ส่วนประกอบบางรายการถูกปิดใช้งาน กรุณาเลือก Material ที่พร้อมใช้งาน'); return; }
    startTransition(async () => {
      try {
        const payload = kind === 'bom' ? { specification: values.specification, remark: values.remark, items } : { remark: values.remark, steps: values.entries.map((entry) => ({ processStepId: entry.processStepId, description: entry.description || null })) };
        let savedId: string;
        if (editing && base) {
          const updated = await updateEngineeringAction(scope, kind, base.id, payload);
          if (updated.status === 'error') { setError(updated.message); return; }
          savedId = base.id;
        } else {
          const created = await createEngineeringAction(scope, kind, owner.id, payload);
          if (created.status === 'error') { setError(created.message); return; }
          savedId = created.id;
        }
        if (activate) {
          const activated = await activateEngineeringAction(scope, kind, savedId);
          if (activated.status === 'error') {
            // The draft is already saved; say so instead of implying nothing happened.
            toast.warning('บันทึกเป็นร่างแล้ว แต่เปิดใช้งานไม่สำเร็จ', { description: activated.message });
            onSaved();
            return;
          }
          toast.success('บันทึกและเปิดใช้งานแล้ว'); onSaved();
          return;
        }
        toast.success(editing ? 'บันทึกการแก้ไขแล้ว' : 'บันทึกเวอร์ชันร่างแล้ว'); onSaved();
      } catch { setError(CONNECTION_ERROR_MESSAGE); }
    });
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent fullScreenOnMobile size="xl" className="overflow-hidden sm:h-[90dvh] sm:max-h-[90dvh]">
    <DialogHeader className="shrink-0 bg-surface-2/50">
      <div className="flex items-center gap-3 pr-6"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-primary"><Layers3 className="size-5" aria-hidden="true" /></span><div className="min-w-0"><DialogTitle>{editing ? 'แก้ไข' : base ? 'แก้ไข (บันทึกเป็นเวอร์ชันใหม่)' : 'เพิ่ม'} {kind === 'bom' ? 'BOM' : 'Workflow'}</DialogTitle><DialogDescription className="mt-1">{kind === 'bom' ? 'กำหนดส่วนประกอบที่ใช้ต่อปลายทาง 1 หน่วย' : 'กำหนดลำดับขั้นตอนกระบวนการ'}</DialogDescription></div></div>
    </DialogHeader>
    {/* Wrapped, not passed directly: handleSubmit calls its handler as (data, event), and a truthy event would land in `activate`. */}
    <form noValidate onSubmit={form.handleSubmit((values) => submit(values, false), () => setError('กรุณาตรวจสอบข้อมูลที่ยังไม่ครบหรือเกินกำหนดในแบบฟอร์ม'))} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <fieldset disabled={pending} className="min-w-0 space-y-6 p-4 sm:p-6">
        <legend className="sr-only">ข้อมูล{kind === 'bom' ? ' BOM' : ' Workflow'}</legend>
        {error && <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/40 p-4"><Package className="mt-1 size-5 shrink-0 text-fg-muted" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-xs text-fg-muted">{scope === 'materials' ? 'วัสดุปลายทาง' : 'สินค้าปลายทาง'}</p><p className="mt-1 break-words text-sm font-semibold text-fg">{owner.name}</p><p className="mt-1 break-all text-xs text-fg-secondary">{owner.code}</p></div><span className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg-secondary">ฉบับร่าง</span></div>
        {kind === 'bom' && <div className="space-y-1.5"><Label htmlFor="engineering-spec">ข้อมูลจำเพาะ <span className="font-normal text-fg-muted">(ไม่บังคับ)</span></Label><Input id="engineering-spec" placeholder="เช่น สูตรประกอบสำหรับชิ้นงานมาตรฐาน" maxLength={500} {...form.register('specification')} /></div>}
        <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-fg">{kind === 'bom' ? 'รายการส่วนประกอบ' : 'ขั้นตอนกระบวนการ'}</h3><p className="mt-1 text-xs text-fg-muted">{kind === 'bom' ? 'เลือกวัสดุไม่ซ้ำกัน และระบุจำนวนตามหน่วยของวัสดุ' : 'เรียงขั้นตอนตามลำดับการทำงาน'}</p></div><span className="text-xs tabular-nums text-fg-secondary">{rows.fields.length} / {kind === 'bom' ? 200 : 100} รายการ</span></div>
        {rows.fields.map((row, index) => <section key={row.id} className="space-y-4 rounded-xl border border-border border-l-4 border-l-primary bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3"><h3 className="text-sm font-semibold text-fg"><span className="mr-2 inline-flex size-7 items-center justify-center rounded-md bg-surface-2 text-xs tabular-nums text-fg-secondary">{index + 1}</span>{kind === 'bom' ? (materials.find((material) => material.id === selected[index]?.materialId)?.name || 'เลือกส่วนประกอบ') : 'ขั้นตอน'}</h3><div className="flex gap-1"><Button type="button" variant="ghost" size="sm" aria-label="เลื่อนขึ้น" disabled={pending || index === 0} onClick={() => rows.move(index, index - 1)}><ArrowUp className="size-4" /></Button><Button type="button" variant="ghost" size="sm" aria-label="เลื่อนลง" disabled={pending || index === rows.fields.length - 1} onClick={() => rows.move(index, index + 1)}><ArrowDown className="size-4" /></Button><Button type="button" variant="ghost" size="sm" aria-label="นำรายการออก" disabled={pending || rows.fields.length === 1} onClick={() => rows.remove(index)}><Trash2 className="size-4" /></Button></div></div>
          {kind === 'bom' ? <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <div className="space-y-1.5"><Label htmlFor={`component-${index}`}>วัสดุส่วนประกอบ *</Label>{materialsForOwner.filter(isPickableComponent).length === 0 ? <MasterDataEmptyLink href="/materials/catalog" resourceLabel="วัสดุส่วนประกอบ" /> : <Controller control={form.control} name={`entries.${index}.materialId`} render={({ field }) => <SearchableFilterSelect id={`component-${index}`} label="วัสดุส่วนประกอบ" value={field.value} onChange={field.onChange} onBlur={field.onBlur} triggerRef={field.ref} disabled={pending} invalid={!!form.formState.errors.entries?.[index]?.materialId} placeholder="เลือกรหัสหรือชื่อวัสดุ" allLabel="เลือกวัสดุส่วนประกอบ" searchPlaceholder="ค้นหารหัสหรือชื่อวัสดุ..." options={materialsForOwner.filter((material) => material.id === field.value || (isPickableComponent(material) && !selected.some((entry) => entry.materialId === material.id))).map((material) => ({ value: material.id, label: `${material.code} · ${material.name}` }))} />} />}{form.formState.errors.entries?.[index]?.materialId && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.materialId?.message}</p>}</div>
            <div className="space-y-1.5"><Label htmlFor={`quantity-${index}`}>จำนวนที่ใช้ * ({materials.find((material) => material.id === selected[index]?.materialId)?.unit?.nameTh || 'หน่วยวัสดุ'})</Label><Input id={`quantity-${index}`} type="number" inputMode="decimal" required min="0.0001" step="0.0001" max="1000000000" {...form.register(`entries.${index}.quantity`, { valueAsNumber: true })} aria-invalid={!!form.formState.errors.entries?.[index]?.quantity} />{form.formState.errors.entries?.[index]?.quantity && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.quantity?.message}</p>}</div>
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 text-sm text-fg-secondary"><input className="size-4 accent-primary" type="checkbox" {...form.register(`entries.${index}.isScrap`)} />เศษวัสดุ</label><div className="space-y-1.5"><Label htmlFor={`wastage-${index}`}>เผื่อสูญเสีย (%)</Label><Input id={`wastage-${index}`} type="number" min="0" max="100" step="0.0001" {...form.register(`entries.${index}.wastagePercent`, { valueAsNumber: true })} />{form.formState.errors.entries?.[index]?.wastagePercent && <p role="alert" className="text-xs text-danger">ระบุค่าระหว่าง 0–100</p>}</div>
          </div> : <div className="space-y-1.5"><Label htmlFor={`process-${index}`}>ขั้นตอนกระบวนการ</Label>{processSteps.length === 0 ? <MasterDataEmptyLink href="/master-data/process-steps" resourceLabel="ขั้นตอนกระบวนการ" /> : <Controller control={form.control} name={`entries.${index}.processStepId`} render={({ field }) => <Select value={field.value} onValueChange={field.onChange} disabled={pending}><SelectTrigger id={`process-${index}`} ref={field.ref} onBlur={field.onBlur} aria-invalid={!!form.formState.errors.entries?.[index]?.processStepId}><SelectValue placeholder="เลือกขั้นตอน" /></SelectTrigger><SelectContent>{processSteps.map((step) => <SelectItem key={step.id} value={step.id}>{step.code} · {step.nameTh}</SelectItem>)}</SelectContent></Select>} />}{form.formState.errors.entries?.[index]?.processStepId && <p role="alert" className="text-xs text-danger">{form.formState.errors.entries?.[index]?.processStepId?.message}</p>}</div>}
          <div className="space-y-1.5"><Label htmlFor={`description-${index}`}>{kind === 'bom' ? 'หมายเหตุส่วนประกอบ' : 'รายละเอียดขั้นตอน'}</Label><Input id={`description-${index}`} maxLength={255} {...form.register(`entries.${index}.description`)} /></div>
        </section>)}
        <Button type="button" variant="secondary" className="min-h-11 w-full border-dashed" disabled={pending || rows.fields.length >= (kind === 'bom' ? 200 : 100)} onClick={() => rows.append(emptyEntry())}><Plus className="mr-1 size-4" />เพิ่ม{kind === 'bom' ? 'ส่วนประกอบ' : 'ขั้นตอน'}</Button>
        </div>
        <div className="space-y-1.5"><Label htmlFor="engineering-remark">หมายเหตุเพิ่มเติม (ไม่บังคับ)</Label><Input id="engineering-remark" maxLength={1000} {...form.register('remark')} /></div>
      </fieldset>
      </div>
      <DialogFooter className="shrink-0 flex-wrap"><p className="text-xs text-fg-muted sm:mr-auto">บันทึกเป็นร่างก่อนตรวจสอบและเปิดใช้งาน</p><Button type="button" variant="secondary" disabled={pending} onClick={onClose}>ยกเลิก</Button><Button type="submit" variant={canActivate ? 'outline' : 'primary'} disabled={pending}><Save className="mr-2 size-4" aria-hidden="true" />{pending ? 'กำลังบันทึก…' : 'บันทึกร่าง'}</Button>{canActivate && <Button type="button" disabled={pending} onClick={form.handleSubmit((values) => submit(values, true))}><CheckCircle2 className="mr-2 size-4" aria-hidden="true" />{pending ? 'กำลังบันทึก…' : 'บันทึกและเปิดใช้งาน'}</Button>}</DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
