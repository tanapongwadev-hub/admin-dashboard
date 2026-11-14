"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Pencil, Ban, RotateCcw, ImageOff, Eye, PackagePlus, ClipboardList, ArrowDownToLine, ArrowUpFromLine, Network, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu, type RowAction } from "@/components/ui/row-actions-menu";
import type { ViewMode } from "@/hooks/use-view-mode";
import type { Material, StockBalance } from "@/lib/api/materials";

export interface MaterialCollectionProps {
  materials: Material[];
  groupRelated?: boolean;
  collectionHeader?: ReactNode;
  view: ViewMode;
  canEdit: boolean;
  canDelete: boolean;
  // null when the current user lacks MATERIALS_RECEIVING_VIEW — the card's
  // stock section is omitted entirely in that case (see AGENTS.md § Materials PC).
  stockByMaterialId: Record<string, StockBalance> | null;
  onEdit: (material: Material) => void;
  onToggleStatus: (material: Material) => void;
  // Opens the shared MaterialPcDetailsDialog (see material-pc-details-dialog.tsx)
  // with every field on the material — every view shows only the essentials
  // inline and defers the full record to this dialog on demand.
  onViewDetails: (material: Material) => void;
  // Navigates to /materials/materials-receiving with this material's code
  // pre-selected in the create dialog — lets a viewer jump straight from
  // "I'm looking at MAT-A" to "receive more of MAT-A" without re-picking the
  // material from scratch. Not permission-gated here: a viewer without
  // MATERIALS_RECEIVING_CREATE just lands on a receiving list they can't
  // create from, same as navigating there directly via the sidebar.
  onReceive: (material: Material) => void;
  // false for Materials that may only be received from closing production (they own a BOM).
  isReceivable?: (material: Material) => boolean;
  // Navigates to /materials/materials-receiving with this material's code
  // as a persistent list filter (?materialCode=, no ?open=create) — "view
  // history", distinct from onReceive's "go create a new receiving" intent.
  onViewReceivingHistory: (material: Material) => void;
  // Navigates to /materials/materials-disbursement with this material's
  // code as a persistent list filter — same shape as onViewReceivingHistory.
  onViewDisbursementHistory: (material: Material) => void;
  // Opens MaterialBomUsageDialog — which BOM/Product uses this material.
  onViewBomUsage: (material: Material) => void;
  onDeletePermanent?: (material: Material) => void;
}

// Props for a single-row renderer (Editorial card or List item) — same
// fields as MaterialCollectionProps minus the list-level "materials"/"view",
// plus a per-row "material" and the parent's "onPreview" so the photo
// buttons can open the lightbox shared across view modes.
export type MaterialRowProps = Omit<MaterialCollectionProps, "materials" | "view"> & {
  material: Material;
  onPreview: (material: Material) => void;
};
export type StockTone = "muted" | "warning" | "primary";

export function MaterialStatus({ material }: { material: Material }) {
  return (
    <Badge variant={material.isActive ? "success" : "neutral"} dot>
      {material.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}
    </Badge>
  );
}

const TYPE_BADGE_VARIANT: Record<string, "primary" | "info" | "warning"> = {
  PC: "primary",
  OF: "info",
  OF_MAT: "warning",
};
export function MaterialTypeTag({ material }: { material: Material }) {
  if (!material.type) return null;
  const label = material.type === "OF_MAT" ? "OF-MAT" : material.type;
  return (
    <Badge variant={TYPE_BADGE_VARIANT[material.type] ?? "neutral"} className="shrink-0">
      {label}
    </Badge>
  );
}

export function locationTypeLabel(material: Material): string {
  if (material.locationType === "internal") return "Internal (ภายใน)";
  if (material.locationType === "external") return "External (ภายนอก)";
  return "—";
}

// Derived once per row — used by Editorial + List views to color the stock
// hero. Backend has no min/max threshold field, so this is a simple heuristic:
// 0 → muted, 1-9 → warning, 10+ → primary. If cps-api ever ships a stock
// threshold, replace this with the real value (don't keep both).
// Exported so the details dialog can color its stock card identically.
export function getStockTone(quantity: number, minimumStock = 0): StockTone {
  if (quantity <= 0) return "muted";
  if (quantity < minimumStock) return "warning";
  return "primary";
}

export function getStockHealthLabel(tone: StockTone): { label: string; variant: "success" | "warning" | "neutral" } {
  if (tone === "muted") return { label: "หมดสต็อก", variant: "neutral" };
  if (tone === "warning") return { label: "สต็อกต่ำ", variant: "warning" };
  return { label: "สต็อกปกติ", variant: "success" };
}

// Every supplier's name, not just a count — "2 ราย"/"2 ซัพฯ" told you how
// many but not which ones, so anyone checking sourcing had to open the edit
// dialog just to see the list. Joined for the compact card/list meta cells
// (which still truncate to one line with `title` for the full text on
// hover/focus); the table column has room to wrap, so it's rendered there
// unmodified.
export function supplierNames(material: Material): string {
  return material.suppliers.length > 0
    ? material.suppliers.map((s) => s.nameEn ?? s.nameTh ?? s.code).join(", ")
    : "—";
}

// Every field on `Material` gets a display label somewhere — the essentials
// (shape, unit, model, delivery, suppliers) inline in each view, the rest
// (loading point, process line, scale, packing, specification, description)
// only in MaterialPcDetailsDialog's full-record view (see
// material-pc-details-dialog.tsx). Exported/kept as pure functions so the
// dialog and the three inline renderers can't drift on how a field is
// formatted.
export function shapeLabel(material: Material): string {
  return material.ratio ? `${material.materialType} · ${material.ratio}` : material.materialType;
}

export function unitLabel(material: Material): string {
  return material.unit?.nameEn ?? material.unit?.code ?? "—";
}

export function modelLabel(material: Material): string {
  return material.model?.nameEn ?? material.model?.code ?? "—";
}

export function deliveryLabel(material: Material): string {
  return material.deliveryType?.nameEn ?? material.deliveryType?.code ?? "—";
}

export function materialTypeLabel(material: Material): string {
  return material.materialTypeMaster?.nameTh || material.materialTypeMaster?.code || "—";
}

export function loadingPointLabel(material: Material): string {
  return material.loadingPoint?.nameEn ?? material.loadingPoint?.code ?? "—";
}

export function processLineLabel(material: Material): string {
  return material.processLineName ?? "—";
}

export function specificationLabel(material: Material): string {
  return material.specification ?? "—";
}

export function descriptionLabel(material: Material): string {
  return material.description ?? "—";
}

// =====================================================================
// Shared thumbnail (used by table view). Editorial and List have their
// own sized variants below — see MaterialEditorialPhoto / MaterialListPhoto.
// =====================================================================
export function MaterialThumbnail({ material, onPreview }: { material: Material; onPreview: (material: Material) => void }) {
  const imagePath = material.imagePath?.trim() || null;
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const canShowImage = imagePath !== null && failedPath !== imagePath;

  if (!canShowImage) {
    return (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-fg-muted"
        role="img"
        aria-label={`ไม่มีรูปภาพสำหรับ ${material.name}`}
      >
        <ImageOff className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(material)}
      aria-label={`ดูรูปภาพเต็มของ ${material.name}`}
      className="relative block size-10 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-border bg-surface-2"
    >
      <Image
        src={imagePath}
        alt={`Material image: ${material.name}`}
        fill
        sizes="40px"
        className="object-cover"
        onError={() => setFailedPath(imagePath)}
      />
    </button>
  );
}

// Pure — exported for tests. Mirrors the backend's own MATERIAL_UPDATE (edit)
// vs MATERIAL_DELETE (disable/restore) permission split; enabling a disabled
// row is intentionally "default", not "danger" — it isn't destructive.
export function getMaterialRowActions(
  material: Material,
  canEdit: boolean,
  canDelete: boolean,
  handlers: {
    onEdit: (material: Material) => void;
    onToggleStatus: (material: Material) => void;
    // Optional so existing call sites/tests that only exercise
    // edit/disable behavior don't have to pass a no-op — omitting it just
    // means "ดูรายละเอียด" isn't in the resulting action list.
    onViewDetails?: (material: Material) => void;
    // Optional for the same reason — omitting it just means "รับเข้า"
    // isn't in the resulting action list.
    onReceive?: (material: Material) => void;
    isReceivable?: (material: Material) => boolean;
    // Optional — omitting any of these three just means that action isn't
    // in the resulting list (same "optional handler, no-op call sites don't
    // need a stub" convention as onViewDetails/onReceive above).
    onViewReceivingHistory?: (material: Material) => void;
    onViewDisbursementHistory?: (material: Material) => void;
    onViewBomUsage?: (material: Material) => void;
    onDeletePermanent?: (material: Material) => void;
  }
): RowAction[] {
  const actions: RowAction[] = [];
  if (handlers.onViewDetails) {
    actions.push({
      label: "ดูรายละเอียด",
      icon: Eye,
      onSelect: () => handlers.onViewDetails!(material),
      variant: "default",
    });
  }
  if (handlers.onReceive && handlers.isReceivable?.(material) !== false) {
    actions.push({
      label: "รับเข้า",
      icon: PackagePlus,
      onSelect: () => handlers.onReceive!(material),
      variant: "default",
    });
  }
  // Internal materials are produced, not received: offer the production-plan shortcut instead.
  if (handlers.onReceive && handlers.isReceivable?.(material) === false && material.locationType === "internal") {
    actions.push({
      label: "สร้างแผนผลิต",
      icon: ClipboardList,
      onSelect: () => handlers.onReceive!(material),
      variant: "default",
    });
  }
  // BOM owners are received only from production, so their manual receiving history is hidden too.
  if (handlers.onViewReceivingHistory && handlers.isReceivable?.(material) !== false) {
    actions.push({
      label: "รายการรับเข้า",
      icon: ArrowDownToLine,
      onSelect: () => handlers.onViewReceivingHistory!(material),
      variant: "default",
    });
  }
  if (handlers.onViewDisbursementHistory) {
    actions.push({
      label: "รายการจ่ายออก",
      icon: ArrowUpFromLine,
      onSelect: () => handlers.onViewDisbursementHistory!(material),
      variant: "default",
    });
  }
  if (handlers.onViewBomUsage) {
    actions.push({
      label: "BOM / Products",
      icon: Network,
      onSelect: () => handlers.onViewBomUsage!(material),
      variant: "default",
    });
  }
  if (canEdit) {
    actions.push({
      label: "แก้ไข",
      icon: Pencil,
      onSelect: () => handlers.onEdit(material),
      variant: "default",
    });
  }
  if (canDelete) {
    actions.push(
      material.isActive
        ? { label: "ปิดใช้งาน", icon: Ban, onSelect: () => handlers.onToggleStatus(material), variant: "danger" }
        : { label: "เปิดใช้งาน", icon: RotateCcw, onSelect: () => handlers.onToggleStatus(material), variant: "default" }
    );
  }
  if (canDelete && handlers.onDeletePermanent) {
    actions.push({ label: "ลบถาวร", icon: Trash2, onSelect: () => handlers.onDeletePermanent?.(material), variant: "danger" });
  }
  return actions;
}

export function MaterialActions({
  material,
  canEdit,
  canDelete,
  onEdit,
  onToggleStatus,
  onViewDetails,
  onReceive,
  isReceivable,
  onViewReceivingHistory,
  onViewDisbursementHistory,
  onViewBomUsage,
  onDeletePermanent,
}: Omit<MaterialCollectionProps, "materials" | "view" | "stockByMaterialId"> & { material: Material }) {
  return (
    <RowActionsMenu
      itemLabel={material.name}
      actions={getMaterialRowActions(material, canEdit, canDelete, {
        onEdit,
        onToggleStatus,
        onViewDetails,
        onReceive,
        isReceivable,
        onViewReceivingHistory,
        onViewDisbursementHistory,
        onViewBomUsage,
        onDeletePermanent,
      })}
    />
  );
}
