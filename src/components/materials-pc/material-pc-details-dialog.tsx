"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, ImageOff, Scissors, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Material, MaterialLookup, StockBalance } from "@/lib/api/materials";
import { MaterialPcImagePreview } from "./material-pc-image-preview";
import {
  unitLabel, modelLabel, deliveryLabel, materialTypeLabel,
  loadingPointLabel, processLineLabel, supplierNames,
  getStockTone, getStockHealthLabel,
} from "./material-pc-table";

type PhotoMaterial = Pick<Material, "code" | "name" | "imagePath">;

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border py-3 last:border-b-0">
      <dt className="mb-1 text-xs text-fg-muted">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{value || "—"}</dd>
    </div>
  );
}

function MaterialPhoto({ material, onPreview }: { material: PhotoMaterial; onPreview: (material: PhotoMaterial) => void }) {
  const path = material.imagePath?.trim();
  return path ? (
    <button type="button" onClick={() => onPreview(material)} aria-label={`ดูรูปภาพ ${material.name} ขนาดเต็ม`}
      className="group relative block aspect-[4/3] max-h-64 w-full overflow-hidden rounded-lg border border-border bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Image src={path} alt={`รูปภาพ ${material.name}`} fill sizes="(min-width: 640px) 400px, 100vw" className="object-contain p-3" />
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg-secondary group-hover:text-primary">
        <ZoomIn className="size-3.5" aria-hidden="true" />ดูรูปเต็ม
      </span>
    </button>
  ) : (
    <div className="flex aspect-[4/3] max-h-64 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2">
      <div className="flex flex-col items-center gap-2 text-fg-muted"><ImageOff className="size-7" aria-hidden="true" /><p className="text-xs">ยังไม่มีรูปภาพ</p></div>
    </div>
  );
}

function Identity({ material, shape }: { material: PhotoMaterial & { isActive: boolean }; shape: string }) {
  return (
    <div className="min-w-0 space-y-2 pt-4">
      <p className="break-all text-xs font-medium text-primary">{material.code}</p>
      <h3 className="break-words text-lg font-semibold leading-snug text-fg">{material.name}</h3>
      <div className="flex flex-wrap gap-2">
        <Badge variant="neutral">{shape}</Badge>
        <Badge variant={material.isActive ? "success" : "neutral"} dot>{material.isActive ? "ใช้งาน" : "ไม่ใช้งาน"}</Badge>
      </div>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

export function MaterialPcDetailsView({
  material, stockByMaterialId, units = [], models = [], loadingPoints = [], canEdit = false, onEdit, onClose,
}: {
  material: Material;
  stockByMaterialId: Record<string, StockBalance> | null;
  units?: MaterialLookup[];
  models?: MaterialLookup[];
  loadingPoints?: MaterialLookup[];
  canEdit?: boolean;
  onEdit?: (material: Material) => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = React.useState<PhotoMaterial | null>(null);
  const sectionId = React.useId();
  const isRaw = ["PIPE", "SHEET", "COIL"].includes(material.materialType);
  const output = material.processingMaterial;
  const unit = unitLabel(material);
  const outputUnit = units.find((item) => item.id === output?.unitId);
  const outputUnitLabel = outputUnit?.nameTh || outputUnit?.nameEn || outputUnit?.code || "—";
  const outputModel = models.find((item) => item.id === output?.modelId);
  const outputLoadingPoint = loadingPoints.find((item) => item.id === output?.loadingPointId);
  const balance = stockByMaterialId?.[material.id];
  const quantity = Number(balance?.quantity ?? 0);
  const health = getStockHealthLabel(getStockTone(quantity, Number(material.minimumStock)));
  const yieldQuantity = Number(material.ratio);
  const packing = Number(output?.packingQuantity);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-5 py-5 pr-12 sm:px-6">
        <h2 className="text-base font-semibold text-fg">รายละเอียด Materials</h2>
        <p className="mt-1 text-sm text-fg-muted">{isRaw ? "ข้อมูลวัตถุดิบและ Material ปลายทางที่เชื่อมโยง" : "ข้อมูลวัสดุและการจัดเก็บ"}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        <section aria-label="สต็อกวัสดุ" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <div>
            <p className="text-xs text-fg-muted">{isRaw ? "สต็อกวัตถุดิบก่อนแปรรูป" : "สต็อกคงเหลือ"}</p>
            {stockByMaterialId ? <p className="mt-1 text-xl font-semibold tabular-nums text-fg">{formatNumber(quantity)} <span className="text-sm font-normal text-fg-secondary">{unit}</span></p>
              : <p className="mt-1 text-sm text-fg-muted">ไม่มีสิทธิ์ดูสต็อก</p>}
          </div>
          {stockByMaterialId && <Badge variant={health.variant} dot>{health.label}</Badge>}
        </section>

        {isRaw && (
          <section aria-label="ข้อมูลการแปรรูป" className="mb-5 rounded-lg border border-primary/20 bg-primary-soft px-4 py-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Scissors className="size-4" aria-hidden="true" />ก่อนแปรรูป <ArrowRight className="size-4" aria-hidden="true" />หลังแปรรูป</div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-fg-secondary">จำนวนชิ้นต่อ 1 หน่วยต้นทาง</dt><dd className="mt-1 text-sm font-medium text-fg">{yieldQuantity > 0 ? `1 ${unit} → ${formatNumber(yieldQuantity)} ชิ้น` : "ยังไม่ระบุอัตราตัด"}</dd></div>
              <div><dt className="text-xs text-fg-secondary">การบรรจุหลังแปรรูป</dt><dd className="mt-1 text-sm font-medium text-fg">{packing > 0 ? `${formatNumber(packing)} ชิ้น / กล่อง` : "ยังไม่ระบุจำนวนบรรจุ"}</dd></div>
            </dl>
          </section>
        )}

        <div className={cn("grid items-start gap-5", isRaw && "sm:grid-cols-2")}>
          <section aria-labelledby={`${sectionId}-source`} className="min-w-0 rounded-xl border border-border bg-surface p-4">
            <h2 id={`${sectionId}-source`} className="mb-4 text-sm font-semibold text-fg">{isRaw ? "Material 1 · วัตถุดิบก่อนแปรรูป" : "ข้อมูล Material"}</h2>
            <MaterialPhoto material={material} onPreview={setPreview} />
            <Identity material={material} shape={material.materialType || "—"} />
            <dl className="mt-3">
              <Detail label="ประเภทวัสดุ" value={materialTypeLabel(material)} />
              <Detail label="Location Type" value={material.locationType === "external" ? "External (ภายนอก)" : "Internal (ภายใน)"} />
              <Detail label="หน่วย" value={unit} />
              <Detail label="ซัพพลายเออร์" value={supplierNames(material)} />
              {!isRaw && <Detail label="จำนวนต่อแพ็ก" value={material.packingQuantity ? formatNumber(material.packingQuantity) : "—"} />}
              <Detail label={isRaw ? "ขนาด / ข้อมูลจำเพาะก่อนแปรรูป" : "ข้อมูลจำเพาะ"} value={material.specification?.trim()} />
              <Detail label="รายละเอียด" value={material.description?.trim()} />
            </dl>
          </section>

          {isRaw && (
            <section aria-labelledby={`${sectionId}-output`} className="min-w-0 rounded-xl border border-border bg-surface p-4">
              <h2 id={`${sectionId}-output`} className="mb-4 text-sm font-semibold text-fg">Material 2 · ชิ้นงานหลังแปรรูป</h2>
              {output ? <>
                <MaterialPhoto material={{ ...output, imagePath: output.imagePath ?? null }} onPreview={setPreview} />
                <Identity material={{ ...output, imagePath: output.imagePath ?? null }} shape="PCS" />
                <dl className="mt-3">
                  <Detail label="หน่วยหลังแปรรูป" value={outputUnitLabel} />
                  <Detail label="Location Type" value={output.locationType === "external" ? "External (ภายนอก)" : "Internal (ภายใน)"} />
                  <Detail label="รุ่น" value={outputModel?.nameTh || outputModel?.nameEn || outputModel?.code || output.modelId} />
                  <Detail label="จุดขึ้นสินค้า" value={outputLoadingPoint?.nameTh || outputLoadingPoint?.nameEn || outputLoadingPoint?.code || output.loadingPointId} />
                  <Detail label="สายการผลิต" value={output.processLineName} />
                  <Detail label="มาตราส่วน" value={output.scale} />
                  <Detail label="จำนวนชิ้นต่อกล่อง" value={packing > 0 ? `${formatNumber(packing)} ชิ้น` : "—"} />
                  <Detail label="ขนาด / ข้อมูลจำเพาะหลังแปรรูป" value={output.specification?.trim()} />
                  <Detail label="แก้ไข Material ปลายทางล่าสุด" value={formatDateTime(output.updatedAt)} />
                </dl>
                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-fg-muted">สต็อกชิ้นงานจะเพิ่มเมื่อยืนยันในเมนูแปรรูปวัตถุดิบ</p>
              </> : <div className="py-10 text-center"><Scissors className="mx-auto mb-3 size-7 text-fg-muted" aria-hidden="true" /><p className="text-sm font-medium text-fg">ยังไม่ได้กำหนด Material หลังแปรรูป</p><p className="mt-2 text-xs leading-relaxed text-fg-muted">{canEdit ? "แก้ไขวัสดุเพื่อเพิ่มข้อมูลชิ้นงานปลายทาง" : "ติดต่อผู้ดูแลเพื่อเพิ่มข้อมูลชิ้นงานปลายทาง"}</p></div>}
            </section>
          )}
        </div>

        <details className="mt-5 rounded-lg border border-border bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">ข้อมูลการจัดเก็บและการดำเนินงาน</summary>
          <dl className="grid gap-x-6 border-t border-border px-4 sm:grid-cols-2">
            <Detail label="สต็อกขั้นต่ำ" value={`${formatNumber(Number(material.minimumStock))} ${unit}`} />
            <Detail label="รุ่น" value={modelLabel(material)} />
            <Detail label="ประเภทการจัดส่ง" value={deliveryLabel(material)} />
            <Detail label="จุดขึ้นสินค้า" value={loadingPointLabel(material)} />
            <Detail label="สายการผลิต" value={processLineLabel(material)} />
            <Detail label="มาตราส่วน" value={material.scale} />
          </dl>
        </details>

        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
          <div><dt className="text-fg-muted">เพิ่มเมื่อ</dt><dd className="mt-1 text-fg-secondary">{formatDateTime(material.createdAt)}</dd></div>
          <div><dt className="text-fg-muted">แก้ไขล่าสุด</dt><dd className="mt-1 text-fg-secondary">{formatDateTime(material.updatedAt)}</dd></div>
        </dl>
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface px-5 py-4 sm:px-6">
        <Button variant="outline" onClick={onClose}>ปิด</Button>
        {canEdit && onEdit && <Button onClick={() => { onEdit(material); onClose(); }}>แก้ไขวัสดุ</Button>}
      </footer>
      <MaterialPcImagePreview material={preview} onOpenChange={(open) => { if (!open) setPreview(null); }} />
    </div>
  );
}

export function MaterialPcDetailsDialog({
  material, stockByMaterialId, units, models, loadingPoints, canEdit = false, onEdit, onOpenChange,
}: {
  material: Material | null;
  stockByMaterialId: Record<string, StockBalance> | null;
  units?: MaterialLookup[];
  models?: MaterialLookup[];
  loadingPoints?: MaterialLookup[];
  canEdit?: boolean;
  onEdit?: (material: Material) => void;
  onOpenChange: (open: boolean) => void;
}) {
  if (!material) return null;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="overflow-hidden p-0">
        <DialogTitle className="sr-only">รายละเอียด Materials · {material.name}</DialogTitle>
        <DialogDescription className="sr-only">ข้อมูลวัสดุ สต็อก และ Material หลังแปรรูปที่เชื่อมโยง</DialogDescription>
        <MaterialPcDetailsView key={material.id} material={material} stockByMaterialId={stockByMaterialId} units={units} models={models} loadingPoints={loadingPoints}
          canEdit={canEdit} onEdit={onEdit} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
