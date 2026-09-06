"use client";

import * as React from "react";
import Image from "next/image";
import { Package, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import type { Product } from "@/lib/api/products";
import type { Bom, BomStatus } from "@/lib/api/boms";
import type { ProductWorkflow, ProductWorkflowStatus } from "@/lib/api/product-workflows";
import type { Material } from "@/lib/api/materials";
import { listBomsByProductAction, listProductWorkflowsByProductAction } from "@/app/(dashboard)/products/actions";
import { ProductBomDiagram } from "@/components/products/products-bom-diagram";
import {
  productTypeLabel,
  locationLabel,
  customerLabel,
  modelLabel,
  unitLabel,
  deliveryLabel,
  loadingPointLabel,
  processLineLabel,
  scaleLabel,
  packingLabel,
  lotSizeLabel,
} from "@/components/products/products-table";

// BOM section — see AGENTS.md § Products. `status` is a real cps-api enum
// (DRAFT/ACTIVE/INACTIVE, see boms.entity.ts), not something this app
// invents; label/variant here are just the Thai display mapping.
const BOM_STATUS_DISPLAY: Record<BomStatus, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "ร่าง", variant: "warning" },
  ACTIVE: { label: "เปิดใช้งาน", variant: "success" },
  INACTIVE: { label: "ปิดใช้งาน", variant: "neutral" },
};

// Workflow section — see AGENTS.md § Products. Same DRAFT/ACTIVE/INACTIVE
// shape as BOMs (a separate resource — records production steps, not
// materials), so the display mapping mirrors BOM_STATUS_DISPLAY exactly.
const WORKFLOW_STATUS_DISPLAY: Record<ProductWorkflowStatus, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "ร่าง", variant: "warning" },
  ACTIVE: { label: "เปิดใช้งาน", variant: "success" },
  INACTIVE: { label: "ปิดใช้งาน", variant: "neutral" },
};

// Mirrors material-pc-details-dialog.tsx's Hero + Data Sheet pattern exactly
// (same DataSheetRow/SectionLabel shape, same layout rhythm) so moving
// between the two resources' "view full record" dialogs feels identical.
function DataSheetRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[36%] py-2.5 pl-5 pr-3 text-left align-top text-[12.5px] font-normal text-fg-muted">
        {label}
      </th>
      <td className="py-2.5 pr-5 text-left align-top text-[13px] font-medium text-fg break-words">{value}</td>
    </tr>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{children}</h3>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

// Inner view — extracted so SSR tests can render it directly (Radix Dialog's
// Portal doesn't appear in renderToStaticMarkup output; see AGENTS.md §
// Row actions for the same limitation and how existing tests handle it).
export function ProductsDetailsView({
  product,
  canEdit = false,
  canViewBom = false,
  canViewWorkflow = false,
  materials = [],
  onEdit,
  onClose,
}: {
  product: Product;
  canEdit?: boolean;
  // Omitted (false) means the BOM section doesn't render at all, same as
  // Materials PC's stock section when the viewer lacks its own view
  // permission — not shown as empty/denied, just absent.
  canViewBom?: boolean;
  // Same "absent, not denied" treatment for the Workflow tab.
  canViewWorkflow?: boolean;
  // For ProductBomDiagram's material-image lookup (BomItem carries a name/
  // code but not an image path) — the same list the wizard's BOM item
  // picker already uses, see AGENTS.md § Products. Defaults to [] so every
  // existing call site (and any future one that doesn't care about the
  // diagram) doesn't have to pass it.
  materials?: Material[];
  onEdit?: (product: Product) => void;
  onClose: () => void;
}) {
  const imagePath = product.productImagePath?.trim() || null;
  const unit = unitLabel(product);

  // Keyed by productId (not just the result) so switching to a different
  // product is detected by comparison rather than by an explicit "reset to
  // loading" setState call at the top of the effect — the latter is a
  // synchronous setState-in-effect (flagged by this project's lint config;
  // see the "derive, don't effect" principle in AGENTS.md § Sidebar
  // permissions for the same reasoning elsewhere). The only setState calls
  // here happen inside the .then() callback, genuinely after an async gap.
  const [bomsResult, setBomsResult] = React.useState<
    | { productId: string; status: "success"; boms: Bom[] }
    | { productId: string; status: "error"; message: string }
    | null
  >(null);

  React.useEffect(() => {
    if (!canViewBom) return;
    let cancelled = false;
    listBomsByProductAction(product.id).then((result) => {
      if (cancelled) return;
      setBomsResult(
        result.status === "success"
          ? { productId: product.id, status: "success", boms: result.boms }
          : { productId: product.id, status: "error", message: result.message }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, canViewBom]);

  const isCurrentBomsResult = bomsResult?.productId === product.id;
  const boms = isCurrentBomsResult && bomsResult.status === "success" ? bomsResult.boms : null;
  const bomsError = isCurrentBomsResult && bomsResult.status === "error" ? bomsResult.message : null;

  const [workflowsResult, setWorkflowsResult] = React.useState<
    | { productId: string; status: "success"; workflows: ProductWorkflow[] }
    | { productId: string; status: "error"; message: string }
    | null
  >(null);

  React.useEffect(() => {
    if (!canViewWorkflow) return;
    let cancelled = false;
    listProductWorkflowsByProductAction(product.id).then((result) => {
      if (cancelled) return;
      setWorkflowsResult(
        result.status === "success"
          ? { productId: product.id, status: "success", workflows: result.workflows }
          : { productId: product.id, status: "error", message: result.message }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [product.id, canViewWorkflow]);

  const isCurrentWorkflowsResult = workflowsResult?.productId === product.id;
  const workflows = isCurrentWorkflowsResult && workflowsResult.status === "success" ? workflowsResult.workflows : null;
  const workflowsError = isCurrentWorkflowsResult && workflowsResult.status === "error" ? workflowsResult.message : null;

  function handleEdit() {
    if (!onEdit) return;
    onEdit(product);
    onClose();
  }

  return (
    <div className="flex h-full flex-col">
      {/* HERO SECTION — image (left) + identity (right), same 320×240 4:3
          frame as Materials PC's dialog. Read-only display here (edit-mode
          image replacement lives in ProductsFormDialog, see
          products-form-dialog.tsx#ProductImagePicker) — no lightbox in this
          particular dialog, unlike the table/card thumbnails which open
          ProductsImagePreview. */}
      <header className="shrink-0 border-b border-border px-6 py-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2 sm:h-[240px] sm:w-[320px]">
            {imagePath ? (
              <Image
                src={imagePath}
                alt={`Product image: ${product.name}`}
                fill
                sizes="(min-width: 640px) 320px, 100vw"
                className="object-contain p-3"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-fg-muted"
                role="img"
                aria-label={`ไม่มีรูปภาพสำหรับ ${product.name}`}
              >
                <Package className="size-10" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
            <p className="font-mono text-xs tracking-[0.05em] text-fg-muted">{product.code}</p>
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-fg">{product.name}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={product.isActive ? "success" : "neutral"} dot>
                {product.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
              </Badge>
              <Badge variant="neutral">{productTypeLabel(product)}</Badge>
            </div>

            {/* Safety/min stock in the hero — same spot Materials PC's stock
                number sits in, since these are the closest equivalent
                "headline numbers" Products has (no live stock-on-hand
                tracking exists for finished products — see AGENTS.md §
                Products). */}
            <div className="mt-2 flex flex-wrap items-center gap-5 border-t border-border pt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Safety Stock</span>
                <span className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-fg">
                  {formatNumber(product.safetyStock)}
                </span>
                {unit !== "—" && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted">Min Stock</span>
                <span className="text-2xl font-bold leading-none tabular-nums tracking-[-0.02em] text-fg">
                  {formatNumber(product.minStock)}
                </span>
                {unit !== "—" && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* TABS — "ข้อมูล" (the Data Sheet + activity line that used to just
          sit in one long scroll below the hero) and "BOM" (its own tab now,
          not stacked in the same view — see AGENTS.md § Products). The BOM
          tab is omitted entirely without BOMS_VIEW, same "absent, not
          denied" treatment used everywhere else in this app. */}
      <Tabs
        defaultValue="info"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Bigger, bolder, and underline-style so the active tab is
            unmistakable at a glance — the default TabsList/TabsTrigger
            styling (a small pill toggle) reads more like a segmented
            control than a real section switch, easy to miss next to the
            hero above it. */}
        <TabsList className="sticky top-0 z-10 -mt-1 h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-surface p-0">
          <TabsTrigger
            value="info"
            className="rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm font-semibold text-fg-muted data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            ข้อมูล
          </TabsTrigger>
          {canViewBom && (
            <TabsTrigger
              value="bom"
              className="ml-4 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm font-semibold text-fg-muted data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              BOM
            </TabsTrigger>
          )}
          {canViewWorkflow && (
            <TabsTrigger
              value="workflow"
              className="ml-4 rounded-none border-b-2 border-transparent px-1 pb-2.5 pt-1 text-sm font-semibold text-fg-muted data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              กระบวนการผลิต
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="flex flex-col gap-5">
          {/* DATA SHEET — every field, not just the card's 6 essentials
              (ประเภทสินค้า/สถานที่/ลูกค้า/รุ่น/หน่วย/ประเภทการจัดส่ง already
              shown inline on the card) — this is where จุดขึ้นสินค้า/
              สายการผลิต/มาตราส่วน/แพ็ก/ล็อต actually get to be seen at all,
              since Products has no prose fields the way Materials has
              specification/description to fill the rest of this tab with. */}
          <div>
            <SectionLabel>ข้อมูลจำเพาะ</SectionLabel>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <tbody>
                  <DataSheetRow label="ประเภทสินค้า" value={productTypeLabel(product)} />
                  <DataSheetRow label="สถานที่" value={locationLabel(product)} />
                  <DataSheetRow label="ลูกค้า" value={customerLabel(product)} />
                  <DataSheetRow label="รุ่น" value={modelLabel(product)} />
                  <DataSheetRow label="หน่วย" value={unitLabel(product)} />
                  <DataSheetRow label="ประเภทการจัดส่ง" value={deliveryLabel(product)} />
                  <DataSheetRow label="จุดขึ้นสินค้า" value={loadingPointLabel(product)} />
                  <DataSheetRow label="สายการผลิต" value={processLineLabel(product)} />
                  <DataSheetRow label="มาตราส่วน" value={scaleLabel(product)} />
                  <DataSheetRow label="แพ็ก" value={packingLabel(product)} />
                  <DataSheetRow label="ล็อต" value={lotSizeLabel(product)} />
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-fg-muted">
            เพิ่มเมื่อ <span className="text-fg-secondary">{formatDateTime(product.createdAt)}</span>
            <span className="mx-2 text-border-strong">·</span>
            แก้ไขล่าสุด <span className="text-fg-secondary">{formatDateTime(product.updatedAt)}</span>
          </p>
        </TabsContent>

        {canViewBom && (
          <TabsContent value="bom">
            {/* Every BOM version cps-api has for this product
                (GET /boms/product/:productId, newest first per the
                backend's own ordering), each version's full item list. */}
            {bomsError ? (
              <p className="text-sm text-danger">{bomsError}</p>
            ) : boms === null ? (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> กำลังโหลด BOM...
              </p>
            ) : boms.length === 0 ? (
              <p className="text-sm text-fg-muted">ยังไม่มี BOM สำหรับสินค้านี้</p>
            ) : (
              <div className="flex flex-col gap-3">
                {boms.map((bom) => {
                  const status = BOM_STATUS_DISPLAY[bom.status];
                  return (
                    <div key={bom.id} className="overflow-hidden rounded-lg border border-border">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-fg">{bom.version}</span>
                          <Badge variant={status.variant} dot>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-fg-muted">{bom.items.length} รายการ</span>
                          {bom.items.length > 0 && (
                            <ProductBomDiagram product={product} items={bom.items} materials={materials} />
                          )}
                        </div>
                      </div>
                      {bom.specification && (
                        <p className="border-b border-border px-4 py-2 text-xs text-fg-secondary">{bom.specification}</p>
                      )}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-fg-muted">
                            <th className="px-4 py-2 font-medium">วัตถุดิบ</th>
                            <th className="px-4 py-2 font-medium">จำนวน</th>
                            <th className="px-4 py-2 font-medium">สูญเสีย</th>
                            <th className="px-4 py-2 font-medium">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bom.items.map((item) => (
                            <tr key={item.id} className="border-b border-border last:border-b-0">
                              <td className="px-4 py-2 text-fg">
                                {item.materialCode} · {item.materialName}
                                {item.isScrap && (
                                  <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">
                                    เศษ
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-2 tabular-nums text-fg-secondary">
                                {formatNumber(item.quantity)} {item.unitNameTh}
                              </td>
                              <td className="px-4 py-2 tabular-nums text-fg-secondary">
                                {item.wastagePercent != null ? `${item.wastagePercent}%` : "—"}
                              </td>
                              <td className="px-4 py-2 text-fg-secondary">{item.remark || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {canViewWorkflow && (
          <TabsContent value="workflow">
            {/* Every workflow version cps-api has for this product
                (GET /product-workflows/product/:productId, newest first),
                each version's ordered step list. */}
            {workflowsError ? (
              <p className="text-sm text-danger">{workflowsError}</p>
            ) : workflows === null ? (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> กำลังโหลดกระบวนการผลิต...
              </p>
            ) : workflows.length === 0 ? (
              <p className="text-sm text-fg-muted">ยังไม่มีกระบวนการผลิตสำหรับสินค้านี้</p>
            ) : (
              <div className="flex flex-col gap-3">
                {workflows.map((workflow) => {
                  const status = WORKFLOW_STATUS_DISPLAY[workflow.status];
                  return (
                    <div key={workflow.id} className="overflow-hidden rounded-lg border border-border">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-fg">{workflow.version}</span>
                          <Badge variant={status.variant} dot>
                            {status.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-fg-muted">{workflow.steps.length} ขั้นตอน</span>
                      </div>
                      {workflow.remark && (
                        <p className="border-b border-border px-4 py-2 text-xs text-fg-secondary">{workflow.remark}</p>
                      )}
                      <ol className="flex flex-col">
                        {workflow.steps.map((step, index) => (
                          <li
                            key={step.id}
                            className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                          >
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-fg">{step.stepName}</p>
                              {step.description && <p className="mt-0.5 text-xs text-fg-muted">{step.description}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          ปิด
        </Button>
        {canEdit && onEdit && (
          <Button variant="primary" onClick={handleEdit}>
            แก้ไข
          </Button>
        )}
      </footer>
    </div>
  );
}

export function ProductsDetailsDialog({
  product,
  canEdit = false,
  canViewBom = false,
  canViewWorkflow = false,
  materials = [],
  onEdit,
  onOpenChange,
}: {
  product: Product | null;
  canEdit?: boolean;
  canViewBom?: boolean;
  canViewWorkflow?: boolean;
  materials?: Material[];
  onEdit?: (product: Product) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="p-0">
        <ProductsDetailsView
          product={product}
          canEdit={canEdit}
          canViewBom={canViewBom}
          canViewWorkflow={canViewWorkflow}
          materials={materials}
          onEdit={onEdit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
