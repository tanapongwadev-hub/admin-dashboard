"use client";

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, GitBranch, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableFilterSelect } from '@/components/ui/searchable-filter-select';
import { MasterDataEmptyLink } from '@/components/ui/master-data-empty-link';
import { activateEngineeringAction, engineeringHistoryAction } from '@/app/(dashboard)/bom-workflow/actions';
import type { EngineeringScope, EngineeringKind, EngineeringVersion } from '@/lib/api/engineering';
import type { Material } from '@/lib/api/materials';
import type { ProcessStep } from '@/lib/api/process-steps';
import { CONNECTION_ERROR_MESSAGE } from '@/lib/user-error';
import { EngineeringFormDialog } from './engineering-form-dialog';

const quantityFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

export type EngineeringOwner = { id: string; code: string; name: string; isActive: boolean };
export type EngineeringPermissions = Record<EngineeringKind, { view: boolean; create: boolean; activate: boolean }>;
type Props = { scope: EngineeringScope; owners: EngineeringOwner[]; materials: Material[]; processSteps: ProcessStep[]; permissions: EngineeringPermissions };

export function EngineeringClient(props: Props) {
  const [ownerId, setOwnerId] = useState('');
  const [search, setSearch] = useState('');
  const owner = props.owners.find((entry) => entry.id === ownerId);
  const filtered = props.owners.filter((entry) => `${entry.code} ${entry.name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <div className="space-y-4">
    <section className={`grid gap-3 rounded-md border border-border bg-surface p-4 ${props.scope === 'products' ? 'sm:grid-cols-2' : ''}`} aria-label="เลือกข้อมูลปลายทาง">
      {props.scope === 'products' && <div className="space-y-1.5"><Label htmlFor="engineering-search">ค้นหารหัสหรือชื่อ</Label><Input id="engineering-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาข้อมูลปลายทาง…" /></div>}
      <div className="space-y-1.5"><Label htmlFor="engineering-owner">{props.scope === 'materials' ? 'Material ปลายทาง' : 'Product ปลายทาง'}</Label>
        {props.owners.length === 0 ? <MasterDataEmptyLink href={props.scope === 'materials' ? '/materials/pc' : '/products'} resourceLabel={props.scope === 'materials' ? 'วัสดุ' : 'สินค้า'} /> : props.scope === 'materials' ? (
          <SearchableFilterSelect
            id="engineering-owner"
            label="Material ปลายทาง"
            value={ownerId}
            onChange={setOwnerId}
            options={props.owners.map((entry) => ({ value: entry.id, label: `${entry.code} · ${entry.name}${entry.isActive ? '' : ' (ปิดใช้งาน)'}` }))}
            placeholder="เลือก Material ปลายทาง"
            allLabel="ล้างการเลือก"
            searchPlaceholder="ค้นหารหัสหรือชื่อวัสดุ…"
          />
        ) : <Select value={ownerId} onValueChange={setOwnerId}><SelectTrigger id="engineering-owner"><SelectValue placeholder="เลือกข้อมูลที่ต้องการจัดการ" /></SelectTrigger><SelectContent>{filtered.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.code} · {entry.name}{entry.isActive ? '' : ' (ปิดใช้งาน)'}</SelectItem>)}{filtered.length === 0 && <p className="p-3 text-sm text-fg-muted">ไม่พบข้อมูลตามคำค้นหา</p>}</SelectContent></Select>}
      </div>
    </section>
    {owner ? <Workspace key={`${props.scope}:${owner.id}`} {...props} owner={owner} /> : <div className="rounded-md border border-dashed border-border p-12 text-center"><GitBranch className="mx-auto mb-3 size-8 text-primary" aria-hidden="true" /><p className="text-sm text-fg-muted">เลือกข้อมูลปลายทางเพื่อเพิ่ม BOM และ Workflow</p></div>}
  </div>;
}

function Workspace({ owner, ...props }: Props & { owner: EngineeringOwner }) {
  const firstTab = props.permissions.bom.view || props.permissions.bom.create ? 'bom' : 'workflow';
  return <section className="rounded-md border border-border bg-surface">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4"><div><p className="font-mono text-xs text-primary">{owner.code}</p><h2 className="mt-1 font-semibold text-fg">{owner.name}</h2></div><Badge variant={owner.isActive ? 'success' : 'neutral'}>{owner.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge></header>
    <Tabs defaultValue={firstTab} className="p-4">
      <TabsList><TabsTrigger value="bom"><GitBranch className="mr-2 size-4" />BOM</TabsTrigger><TabsTrigger value="workflow"><Workflow className="mr-2 size-4" />Workflow</TabsTrigger></TabsList>
      {(['bom', 'workflow'] as const).map((kind) => <TabsContent key={kind} value={kind}><VersionPanel {...props} owner={owner} kind={kind} /></TabsContent>)}
    </Tabs>
  </section>;
}

function VersionPanel({ scope, owner, kind, materials, processSteps, permissions }: Omit<Props, 'owners'> & { owner: EngineeringOwner; kind: EngineeringKind }) {
  const router = useRouter();
  const [versions, setVersions] = useState<EngineeringVersion[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<{ base?: EngineeringVersion } | null>(null);
  const [pending, startTransition] = useTransition();
  const permission = permissions[kind];
  useEffect(() => {
    if (!permission.view) return;
    let cancelled = false;
    engineeringHistoryAction(scope, kind, owner.id).then((result) => {
      if (cancelled) return;
      if (result.status === 'success') { setVersions(result.versions); setError(''); }
      else setError(result.message);
    }).catch(() => { if (!cancelled) setError(CONNECTION_ERROR_MESSAGE); });
    return () => { cancelled = true; };
  }, [scope, kind, owner.id, reload, permission.view]);

  function activate(id: string) {
    startTransition(async () => {
      try {
        const result = await activateEngineeringAction(scope, kind, id);
        if (result.status === 'error') { setError(result.message); return; }
        toast.success('เปิดใช้เวอร์ชันแล้ว'); setReload((value) => value + 1); router.refresh();
      } catch { setError(CONNECTION_ERROR_MESSAGE); }
    });
  }
  return <div className="space-y-4 pt-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-fg-muted">{kind === 'bom' ? 'จำนวนส่วนประกอบสำหรับผลิตปลายทาง 1 หน่วย' : 'ลำดับขั้นตอนตั้งแต่ต้นจนจบกระบวนการ'}</p>{permission.create && owner.isActive && <Button size="sm" onClick={() => setEditor({})}><Plus className="mr-1 size-4" />เพิ่ม {kind === 'bom' ? 'BOM' : 'Workflow'}</Button>}</div>
    {error && <div role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">{error}<Button variant="secondary" size="sm" className="ml-3" onClick={() => setReload((value) => value + 1)}>โหลดใหม่</Button></div>}
    {!permission.view ? <p className="text-sm text-fg-muted">คุณไม่มีสิทธิ์ดูประวัติ {kind === 'bom' ? 'BOM' : 'Workflow'}</p> : versions === null && !error ? <p role="status" className="py-6 text-sm text-fg-muted">กำลังโหลดเวอร์ชัน…</p> : versions?.length === 0 ? <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-fg-muted">ยังไม่มี {kind === 'bom' ? 'BOM' : 'Workflow'} สำหรับรายการนี้</p> : versions?.map((version) => <article key={version.id} className="rounded-md border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/40 p-3"><div className="flex items-center gap-2"><span className="font-semibold text-fg">{version.version}</span><Badge variant={version.status === 'ACTIVE' ? 'success' : version.status === 'DRAFT' ? 'warning' : 'neutral'}>{version.status === 'ACTIVE' ? 'ใช้งาน' : version.status === 'DRAFT' ? 'ร่าง' : 'ไม่ใช้งาน'}</Badge></div><div className="flex flex-wrap gap-2">{permission.create && owner.isActive && <Button variant="secondary" size="sm" onClick={() => setEditor({ base: version })}>ทำสำเนาเป็นเวอร์ชันใหม่</Button>}{permission.activate && owner.isActive && version.status !== 'ACTIVE' && <Button size="sm" disabled={pending} onClick={() => activate(version.id)}>เปิดใช้เวอร์ชันนี้</Button>}</div></div>
      <details className="p-3"><summary className="cursor-pointer text-sm font-medium text-fg">{kind === 'bom' ? `${version.items?.length ?? 0} ส่วนประกอบ` : `${version.steps?.length ?? 0} ขั้นตอน`} · {new Date(version.createdAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</summary>
        {version.specification && <p className="mt-3 whitespace-pre-wrap text-sm text-fg-secondary">{version.specification}</p>}
        {kind === 'bom' ? <ol className="mt-3 space-y-2">{version.items?.map((item, index) => <li key={item.id} className="rounded-md bg-surface-2 p-3 text-sm"><p className="font-medium text-fg">{index + 1}. {item.materialCode} · {item.materialName}</p><p className="mt-1 text-fg-secondary">{quantityFormatter.format(item.quantity)} {item.unitNameTh}{item.isScrap ? ' · เศษวัสดุ' : ''}{item.wastagePercent ? ` · เผื่อสูญเสีย ${item.wastagePercent}%` : ''}</p>{item.remark && <p className="mt-1 text-xs text-fg-muted">{item.remark}</p>}</li>)}</ol> : <ol className="mt-3 space-y-2">{version.steps?.map((step, index) => <li key={step.id} className="rounded-md bg-surface-2 p-3 text-sm"><p className="font-medium text-fg">{index + 1}. {step.stepName}</p>{step.description && <p className="mt-1 whitespace-pre-wrap text-fg-secondary">{step.description}</p>}</li>)}</ol>}
        {version.remark && <p className="mt-3 whitespace-pre-wrap text-sm text-fg-secondary">{version.remark}</p>}
      </details>
    </article>)}
    {editor && <EngineeringFormDialog scope={scope} kind={kind} owner={owner} materials={materials} processSteps={processSteps} base={editor.base} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setReload((value) => value + 1); router.refresh(); }} />}
  </div>;
}
