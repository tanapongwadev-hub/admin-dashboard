import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { getMaterialLotFlow, getMaterialTraceabilityReport } from "@/lib/api/material-traceability";
import { listMaterials } from "@/lib/api/materials";
import { loadProductMaterialCatalog } from "@/lib/product-materials";
import { MaterialTraceabilityView } from "@/components/material-traceability/material-traceability-view";
import { readMaterialTraceabilityFilters, filtersToParams } from "@/lib/filters/material-traceability-filters";

const DEFAULT_PAGE_SIZE = 50;
// Matches cps-api's own `limit` cap (QueryMaterialTraceabilityDto Max(200)) —
// keep the page-size selector's own option list in
// material-traceability-view.tsx in sync with this set.
const VALID_PAGE_SIZES = [20, 50, 100, 200];

// URL matches cps-api's own seeded menu path (/materials/materials-report,
// code MATERIALS_REPORT) exactly — see AGENTS.md ADR-005. This was a real,
// permission-gated menu item that previously fell through to the [...rest]
// catch-all placeholder. Gated on MATERIALS_RECEIVING_VIEW OR
// MATERIALS_DISBURSEMENT_VIEW (an OR, not an AND — a warehouse role that can
// only see one of the two flows can still open this joint report), matching
// cps-api's `@RequireAnyPermissions` on every /material-traceability route
// (see cps-api/API_ENDPOINTS.md § 17).
export default async function MaterialsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const canView =
    !!session &&
    (session.user.isSuperAdmin ||
      session.permissions.includes("MATERIALS_RECEIVING_VIEW") ||
      session.permissions.includes("MATERIALS_DISBURSEMENT_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงรายงานสอบกลับวัสดุ</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูรายงานนี้ต้องมีสิทธิ์ Materials Receiving View หรือ Materials Disbursement View อย่างน้อยหนึ่งอย่าง
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const urlParams = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => !!entry[1])
  );
  const filters = readMaterialTraceabilityFilters(urlParams);
  const page = Math.max(1, Number(params.page) || 1);
  const requestedLimit = Number(params.limit);
  const limit = VALID_PAGE_SIZES.includes(requestedLimit) ? requestedLimit : DEFAULT_PAGE_SIZE;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  // Material options for the select-box filter. Needs MATERIAL_VIEW; a viewer
  // without it (or a failed lookup) gets an empty list and the filter bar falls
  // back to the free-text code search.
  const materialOptionsPromise = loadProductMaterialCatalog((p) =>
    listMaterials(accessToken, { page: p, limit: 100, sortBy: "code", sortOrder: "asc" })
  )
    .then(({ diagramMaterials }) => {
      // Dedupe by code — the filter value is the material code, so two rows
      // sharing one code must not appear twice.
      const byCode = new Map<string, { value: string; label: string }>();
      for (const m of diagramMaterials) {
        if (!byCode.has(m.code)) byCode.set(m.code, { value: m.code, label: `${m.code} · ${m.name}` });
      }
      return [...byCode.values()];
    })
    .catch(() => []);

  // Lot-to-disbursement map only while a single material is filtered; a
  // failed trace just hides the panel, it never breaks the report.
  const lotFlowPromise = filters.materialCode
    ? getMaterialLotFlow(accessToken, filters.materialCode).catch(() => null)
    : Promise.resolve(null);

  const [report, materialOptions, lotFlow] = await Promise.all([
    getMaterialTraceabilityReport(accessToken, {
      ...filtersToParams(filters),
      page,
      limit,
    }),
    materialOptionsPromise,
    lotFlowPromise,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <MaterialTraceabilityView report={report} materialOptions={materialOptions} lotFlow={lotFlow} />
    </div>
  );
}
