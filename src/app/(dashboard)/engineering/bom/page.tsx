import Link from "next/link";
import { ArrowRight, Boxes, FileText, GitBranch, Layers, ListOrdered, LockKeyhole, Package, Scissors, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrentSession } from "@/lib/session";

type Workspace = {
  scope: "materials" | "products";
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  input: string;
  inputHint: string;
  output: string;
  outputHint: string;
  workflow: string;
  allowed: boolean;
};

function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const Icon = workspace.icon;
  return (
    <section aria-labelledby={`${workspace.scope}-title`} className="@container flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-1 flex-col p-5 @sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary-soft text-primary"><Icon className="size-6" aria-hidden="true" /></span>
          <Badge variant={workspace.allowed ? "outline" : "neutral"}>
            {workspace.allowed ? workspace.subtitle : <><LockKeyhole className="size-3" aria-hidden="true" />จำกัดสิทธิ์</>}
          </Badge>
        </div>
        <h3 id={`${workspace.scope}-title`} className="text-2xl font-semibold tracking-tight text-fg">{workspace.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{workspace.description}</p>

        <div className="my-6 flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4 @sm:flex-row @sm:items-center @sm:gap-4" aria-label={`เส้นทางการผลิต ${workspace.title}`}>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-fg-muted">ส่วนประกอบที่ใช้</p>
            <p className="mt-1 text-sm font-semibold text-fg">{workspace.input}</p>
            <p className="mt-1 text-xs leading-5 text-fg-muted">{workspace.inputHint}</p>
          </div>
          <ArrowRight className="size-5 shrink-0 rotate-90 text-primary @sm:rotate-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 rounded-md border border-primary/15 bg-surface p-3">
            <p className="text-xs text-primary">ปลายทางที่ผลิต</p>
            <p className="mt-1 text-sm font-semibold text-fg">{workspace.output}</p>
            <p className="mt-1 text-xs leading-5 text-fg-muted">{workspace.outputHint}</p>
          </div>
        </div>

        <dl className="mt-auto divide-y divide-border text-sm">
          <div className="flex items-start gap-3 py-3">
            <Layers className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <div><dt className="font-medium text-fg">BOM · สูตรส่วนประกอบ</dt><dd className="mt-1 text-xs leading-5 text-fg-muted">ระบุวัสดุและจำนวนที่ใช้ต่อปลายทาง 1 หน่วย</dd></div>
          </div>
          <div className="flex items-start gap-3 py-3">
            <ListOrdered className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden="true" />
            <div><dt className="font-medium text-fg">Workflow · ขั้นตอนการผลิต</dt><dd className="mt-1 text-xs leading-5 text-fg-muted">{workspace.workflow}</dd></div>
          </div>
        </dl>
      </div>

      <div className="border-t border-border px-5 py-4 @sm:px-7">
        {workspace.allowed ? (
          <Link href={`/engineering/bom/${workspace.scope}`} className="group flex min-h-11 items-center justify-between gap-3 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
            จัดการ {workspace.title}
            <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        ) : (
          <p className="flex min-h-11 items-center gap-2 text-xs leading-5 text-fg-muted"><LockKeyhole className="size-4 shrink-0" aria-hidden="true" />ติดต่อผู้ดูแลเพื่อขอสิทธิ์จัดการ {workspace.title}</p>
        )}
      </div>
    </section>
  );
}

export default async function Page() {
  const session = await getCurrentSession();
  const can = (code: string) => !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  const workspaces: Workspace[] = [
    {
      scope: "materials", title: "Materials", subtitle: "แปรรูปวัตถุดิบ", icon: Scissors,
      description: "กำหนดสูตรและขั้นตอนสำหรับผลิต Material ปลายทาง ให้พร้อมนำไปใช้ในงานถัดไป",
      input: "วัสดุส่วนประกอบ", inputHint: "เช่น ท่อ แผ่นเหล็ก หรือเหล็กม้วน",
      output: "Material ปลายทาง", outputHint: "วัสดุหรือชิ้นงานหลังแปรรูป",
      workflow: "เรียงขั้นตอนแปรรูปที่ใช้ผลิต Material ปลายทาง",
      allowed: can("MATERIAL_VIEW") && ["MATERIAL_BOMS_VIEW", "MATERIAL_BOMS_CREATE", "MATERIAL_WORKFLOWS_VIEW", "MATERIAL_WORKFLOWS_CREATE"].some(can),
    },
    {
      scope: "products", title: "Products", subtitle: "ผลิตสินค้าสำเร็จรูป", icon: Package,
      description: "กำหนดสูตรประกอบและลำดับการผลิตสินค้า ตั้งแต่วัสดุที่ใช้จนได้สินค้าสำเร็จรูป",
      input: "Materials", inputHint: "วัสดุและชิ้นงานที่ใช้ประกอบ",
      output: "Products", outputHint: "สินค้าสำเร็จรูปที่ต้องการผลิต",
      workflow: "เรียงขั้นตอนประกอบและผลิตสินค้าสำเร็จรูป",
      allowed: can("PRODUCTS_VIEW") && ["BOMS_VIEW", "BOMS_CREATE", "PRODUCT_WORKFLOWS_VIEW", "PRODUCT_WORKFLOWS_CREATE"].some(can),
    },
  ];

  return (
    <div className="@container min-w-0 space-y-7 pb-4">
      <header className="flex flex-col gap-5 border-b border-border pb-6 @3xl:flex-row @3xl:items-end @3xl:justify-between">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><GitBranch className="size-4" aria-hidden="true" />ข้อมูลหลักการผลิต</p>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">BOM &amp; Workflow</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">กำหนดว่าใช้วัสดุอะไร และผลิตอย่างไร<br className="hidden @lg:block" />เริ่มจากเลือกประเภทของปลายทางที่ต้องการผลิต</p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-lg border border-border bg-surface px-4 py-3 @3xl:self-auto">
          <FileText className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
          <div><p className="text-xs font-medium text-fg">สูตรและขั้นตอนมีเวอร์ชันแยกกัน</p><p className="mt-1 text-xs text-fg-muted">เก็บประวัติทุกเวอร์ชันก่อนเปิดใช้งาน</p></div>
        </div>
      </header>

      <section aria-labelledby="workspace-heading">
        <div className="mb-4 flex items-center gap-2"><Boxes className="size-4 text-fg-muted" aria-hidden="true" /><h2 id="workspace-heading" className="text-sm font-semibold text-fg">เลือกปลายทางที่ต้องการกำหนดสูตร</h2></div>
        <div className="grid min-w-0 gap-5 @3xl:grid-cols-2">{workspaces.map((workspace) => <WorkspaceCard key={workspace.scope} workspace={workspace} />)}</div>
      </section>

      <section aria-labelledby="getting-started-heading" className="rounded-xl border border-border bg-surface px-5 py-5 @lg:px-7">
        <h2 id="getting-started-heading" className="text-sm font-semibold text-fg">เริ่มต้นกำหนดสูตรการผลิต</h2>
        <ol className="mt-5 grid gap-5 @3xl:grid-cols-3">
          {[
            { title: "เลือก Material หรือสินค้า", description: "เลือกข้อมูลปลายทางที่ต้องการผลิตจากรายการที่มีอยู่" },
            { title: "สร้าง BOM และ Workflow", description: "เพิ่มส่วนประกอบและลำดับขั้นตอน บันทึกเป็นเวอร์ชันร่าง" },
            { title: "ตรวจสอบและเปิดใช้", description: "เปิดใช้เวอร์ชันที่พร้อม โดยเก็บเวอร์ชันก่อนหน้าไว้ในประวัติ" },
          ].map((step, index) => <li key={step.title} className="flex min-w-0 gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-semibold tabular-nums text-fg-secondary">{index + 1}</span><div><h3 className="text-sm font-medium text-fg">{step.title}</h3><p className="mt-1 text-xs leading-relaxed text-fg-muted">{step.description}</p></div></li>)}
        </ol>
      </section>
    </div>
  );
}
