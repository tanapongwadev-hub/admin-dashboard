import { cookies } from 'next/headers';
import { getCurrentSession } from '@/lib/session';
import { listProducts } from '@/lib/api/products';
import { listMaterials } from '@/lib/api/materials';
import { listProcessSteps } from '@/lib/api/process-steps';
import { loadProductMaterialCatalog } from '@/lib/product-materials';
import { engineeringPermission, type EngineeringScope } from '@/lib/api/engineering';
import { EngineeringClient } from './engineering-client';
import { PermissionNotice } from '@/components/layout/permission-notice';

async function loadProcessSteps(token: string) {
  const query = { limit: 100, isActive: true, sortBy: 'code' as const, sortOrder: 'asc' as const };
  const first = await listProcessSteps(token, { ...query, page: 1 });
  const rest = await Promise.all(Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => listProcessSteps(token, { ...query, page: index + 2 })));
  return [first, ...rest].flatMap((page) => page.items);
}

export async function EngineeringPage({ scope }: { scope: EngineeringScope }) {
  const session = await getCurrentSession();
  const allowed = (code: string) => !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  const masterPermission = scope === 'materials' ? 'MATERIAL_VIEW' : 'PRODUCTS_VIEW';
  if (!allowed(masterPermission)) {
    const label = scope === 'materials' ? 'ดูข้อมูลวัสดุ' : 'ดูข้อมูลสินค้า';
    return (
      <PermissionNotice
        title="ยังไม่มีสิทธิ์เลือกข้อมูลปลายทาง"
        description={`หน้านี้ต้องเลือก${scope === 'materials' ? 'วัสดุ' : 'สินค้า'}ปลายทางก่อนกำหนด BOM และ Workflow แต่บัญชีของคุณยังไม่มีสิทธิ์ดูรายการนั้น`}
        required={[{ code: masterPermission, label }]}
      />
    );
  }
  const permissions = {
    bom: { view: allowed(engineeringPermission(scope, 'bom', 'VIEW')), create: allowed(engineeringPermission(scope, 'bom', 'CREATE')) && allowed('MATERIAL_VIEW'), activate: allowed(engineeringPermission(scope, 'bom', 'UPDATE')) },
    workflow: { view: allowed(engineeringPermission(scope, 'workflow', 'VIEW')), create: allowed(engineeringPermission(scope, 'workflow', 'CREATE')), activate: allowed(engineeringPermission(scope, 'workflow', 'UPDATE')) },
  };
  if (!(['bom', 'workflow'] as const).some((kind) => allowed(engineeringPermission(scope, kind, 'VIEW')) || allowed(engineeringPermission(scope, kind, 'CREATE')))) return (
    <PermissionNotice
      title="ไม่มีสิทธิ์จัดการ BOM หรือ Workflow"
      description="บัญชีของคุณเข้าหน้านี้ได้ แต่ยังไม่มีสิทธิ์ดูหรือสร้าง BOM และ Workflow ในส่วนนี้"
      required={[
        { code: engineeringPermission(scope, 'bom', 'VIEW'), label: 'ดู BOM' },
        { code: engineeringPermission(scope, 'workflow', 'VIEW'), label: 'ดู Workflow' },
      ]}
    />
  );
  const token = (await cookies()).get('accessToken')!.value;
  const [catalog, products, processSteps] = await Promise.all([
    allowed('MATERIAL_VIEW') ? loadProductMaterialCatalog((page) => listMaterials(token, { page, limit: 100, sortBy: 'code', sortOrder: 'asc' })) : Promise.resolve({ diagramMaterials: [], activeMaterials: [] }),
    scope === 'products' ? listProducts(token, { sortBy: 'code', sortOrder: 'asc' }).then((result) => result.items) : Promise.resolve([]),
    permissions.workflow.create ? loadProcessSteps(token) : Promise.resolve([]),
  ]);
  const owners = scope === 'materials'
    ? catalog.diagramMaterials.filter((material) => material.locationType === 'internal' && !['PIPE', 'SHEET', 'COIL'].includes(material.materialType))
    : products;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-fg">BOM & Workflow {scope === 'materials' ? 'Materials' : 'Products'}</h1>
        <p className="mt-1 text-sm text-fg-muted">กำหนดส่วนประกอบและลำดับขั้นตอน แยกเวอร์ชัน BOM และ Workflow ตามข้อมูลปลายทาง</p>
      </header>
      {allowed(engineeringPermission(scope, 'bom', 'CREATE')) && !allowed('MATERIAL_VIEW') && <p className="rounded-md bg-warning-soft p-3 text-sm text-fg">การเพิ่ม BOM ต้องมีสิทธิ์ดูวัสดุส่วนประกอบ กรุณาติดต่อผู้ดูแลระบบ</p>}
            <EngineeringClient scope={scope} owners={owners.map((owner) => ({ id: owner.id, code: owner.code, name: owner.name, isActive: owner.isActive }))} materials={catalog.activeMaterials} processSteps={processSteps} permissions={permissions} />
    </div>
  );
}
