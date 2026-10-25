"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  PackageMinus,
  Factory,
  AlertTriangle,
  ClipboardList,
  Boxes,
  FileText,
  Loader2,
  ImageIcon,
  UploadCloud,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MasterDataEmptyLink } from "@/components/ui/master-data-empty-link";
import {
  createMaterialsDisbursementAction,
  updateMaterialsDisbursementAction,
  confirmMaterialsDisbursementAction,
  uploadDisbursementAttachmentAction,
} from "@/app/(dashboard)/materials/disbursements/actions";
import type {
  MaterialsDisbursement,
  MaterialsDisbursementLookups,
  DisbursementType,
} from "@/lib/api/materials-disbursement";
import { formatNumber } from "@/lib/utils";

const STOCK_CUT_REASONS = [
  "วัสดุชำรุด/เสียหาย",
  "วัสดุหมดอายุ/เสื่อมสภาพ",
  "วัสดุสูญหาย",
  "ปรับปรุงยอดจากการนับสต็อก",
  "ใช้เป็นตัวอย่าง/ทดสอบ",
];
const OTHER_REASON = "อื่นๆ";
// Server Actions body limit is 6 MB (next.config.ts), so keep the client cap at 5 MB.
const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

// Drop-zone + file list (multiple attachments). The native input stays focusable
// but visually hidden, the label makes the whole zone clickable, files can also
// be dragged in. Images get a thumbnail, PDFs an icon; already-saved files
// (`existing`) can be opened or removed, new files are uploaded on submit.
const ATTACHMENT_MAX_COUNT = 10;

// Small thumbnail tile. New files are read as a data URL (not a memoized
// object URL revoked in cleanup, which breaks under React StrictMode).
function Thumb({ src, isPdf }: { src: string | null; isPdf: boolean }) {
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
      {src && !isPdf ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : isPdf ? (
        <FileText className="size-5 text-danger" />
      ) : (
        <ImageIcon className="size-5 text-success" />
      )}
    </span>
  );
}

function NewFileThumb({ file }: { file: File }) {
  const [loaded, setLoaded] = React.useState<{ file: File; src: string } | null>(null);
  React.useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    let active = true;
    const reader = new FileReader();
    reader.onload = () => {
      if (active && typeof reader.result === "string") setLoaded({ file, src: reader.result });
    };
    reader.readAsDataURL(file);
    return () => {
      active = false;
      reader.abort();
    };
  }, [file]);
  const src = loaded && loaded.file === file ? loaded.src : null;
  return <Thumb src={src} isPdf={file.type === "application/pdf"} />;
}

function AttachmentPicker({
  files,
  existing,
  onAdd,
  onRemoveFile,
  onRemoveExisting,
  error,
}: {
  error?: string;
  files: File[];
  existing: { url: string; name: string }[];
  onAdd: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExisting: (index: number) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [preview, setPreview] = React.useState<{ src: string; name: string } | null>(null);
  const total = files.length + existing.length;

  // Click a row to preview: images open in a lightbox, PDFs in a new tab.
  function previewExisting(item: { url: string; name: string }) {
    if (item.name.toLowerCase().endsWith(".pdf")) window.open(item.url, "_blank", "noopener");
    else setPreview({ src: item.url, name: item.name });
  }
  function previewFile(file: File) {
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview({ src: reader.result, name: file.name });
    };
    reader.readAsDataURL(file);
  }

  function accept(list: FileList | null) {
    if (!list || list.length === 0) return;
    const valid: File[] = [];
    let room = ATTACHMENT_MAX_COUNT - total;
    for (const next of Array.from(list)) {
      if (!ATTACHMENT_TYPES.includes(next.type)) {
        toast.error(`${next.name}: รองรับเฉพาะไฟล์ JPEG, PNG, WebP หรือ PDF`);
        continue;
      }
      if (next.size > ATTACHMENT_MAX_BYTES) {
        toast.error(`${next.name}: ไฟล์แนบต้องมีขนาดไม่เกิน 5 MB`);
        continue;
      }
      if (room <= 0) {
        toast.error(`แนบไฟล์ได้สูงสุด ${ATTACHMENT_MAX_COUNT} ไฟล์`);
        break;
      }
      valid.push(next);
      room -= 1;
    }
    if (valid.length > 0) onAdd(valid);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="md-attachment">ไฟล์แนบ{total > 0 ? ` (${total})` : ""}</Label>
        <Badge variant="danger">จำเป็น</Badge>
      </div>
      <input
        id="md-attachment"
        type="file"
        multiple
        className="peer sr-only"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          accept(e.target.files);
          e.target.value = "";
        }}
      />
      <label
        htmlFor="md-attachment"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
          dragging
            ? "border-primary bg-primary-soft"
            : error
              ? "border-danger bg-danger-soft/40"
              : total > 0
                ? "border-success/50 bg-success-soft/40"
                : "border-border-strong bg-surface-2/40 hover:border-primary hover:bg-primary-soft/50"
        }`}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
          <UploadCloud className="size-5 text-fg-muted" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-fg">
            {total > 0 ? "เพิ่มไฟล์อีก" : "คลิกเพื่อเลือกไฟล์ หรือลากมาวางที่นี่"}
          </span>
          <span className="block text-xs text-fg-muted">
            เลือกได้หลายไฟล์ (สูงสุด {ATTACHMENT_MAX_COUNT}) · รูปภาพ (JPEG, PNG, WebP) หรือ PDF · ไฟล์ละไม่เกิน 5 MB
          </span>
        </span>
      </label>
      {total > 0 && (
        <ul className="space-y-1.5">
          {existing.map((item, index) => (
            <li
              key={`existing-${item.url}-${index}`}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-2"
            >
              <button
                type="button"
                onClick={() => previewExisting(item)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left hover:bg-surface-2"
                aria-label={`ดูตัวอย่าง ${item.name}`}
              >
                <Thumb src={item.url} isPdf={item.name.toLowerCase().endsWith(".pdf")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{item.name}</span>
                  <span className="text-xs font-medium text-primary underline">ดูตัวอย่าง</span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`ลบไฟล์ ${item.name}`}
                onClick={() => onRemoveExisting(index)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
          {files.map((file, index) => (
            <li
              key={`new-${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-2"
            >
              <button
                type="button"
                onClick={() => previewFile(file)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left hover:bg-surface-2"
                aria-label={`ดูตัวอย่าง ${file.name}`}
              >
                <NewFileThumb file={file} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{file.name}</span>
                  <span className="block text-xs text-fg-muted">
                    {formatFileSize(file.size)} · ยังไม่ได้อัปโหลด ·{" "}
                    <span className="font-medium text-primary underline">ดูตัวอย่าง</span>
                  </span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`ลบไฟล์ ${file.name}`}
                onClick={() => onRemoveFile(index)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <FieldError message={error} />
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent size="xl" className="flex max-h-[90dvh] flex-col">
          <DialogHeader>
            <DialogTitle className="truncate text-base">{preview?.name}</DialogTitle>
            <DialogDescription className="sr-only">ตัวอย่างไฟล์แนบ</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-surface-2 p-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.src} alt={preview.name} className="max-h-[70dvh] max-w-full object-contain" />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Unique even when Fast Refresh resets the module counter but keeps component state.
let itemKeySeed = 0;
function nextItemKey(): string {
  itemKeySeed += 1;
  return `row-${itemKeySeed}-${Math.random().toString(36).slice(2, 8)}`;
}

interface RowErrors {
  material?: string;
  qty?: string;
  reason?: string;
  note?: string;
}
interface FormErrors {
  date?: string;
  attachment?: string;
  rows: Record<string, RowErrors>;
}

interface DisbursementItemDraft {
  key: string;
  materialId: string;
  requestedQuantity: string;
  reason: string;
  reasonNote: string;
}

function newItemDraft(): DisbursementItemDraft {
  return { key: nextItemKey(), materialId: "", requestedQuantity: "", reason: "", reasonNote: "" };
}

// Cycled per-row accent theme — same pattern as products-wizard-dialog.tsx's
// BOM_ROW_ACCENTS (the border-l-{color} cascade bug it worked around is fixed
// project-wide as of the 2026-09-10 @layer base fix, see AGENTS.md) — purely
// a glance-level aid so 3+ item rows are visually distinguishable from each
// other, on top of (not instead of) the numbered badge + material name.
const ROW_ACCENTS = [
  { badge: "bg-primary-soft text-primary", strip: "border-l-primary" },
  { badge: "bg-success-soft text-success", strip: "border-l-success" },
  { badge: "bg-warning-soft text-warning", strip: "border-l-warning" },
  { badge: "bg-info-soft text-info", strip: "border-l-info" },
] as const;

const TYPE_META: Record<DisbursementType, { icon: typeof Factory; tone: string; label: string }> = {
  production: { icon: Factory, tone: "bg-primary-soft text-primary", label: "เบิกเพื่อผลิต" },
  stock_cut: { icon: PackageMinus, tone: "bg-warning-soft text-warning", label: "ตัดสต็อก" },
};

// Create + edit share this one dialog (edit is only ever reachable while
// disbursement.status === "draft" — see getMaterialsDisbursementRowActions in
// materials-disbursement-table.tsx). No `updatedAt` optimistic-concurrency
// field to carry forward here (see AGENTS.md § Material Disbursement — the
// backend has no such field on this update DTO, unlike Materials Receiving).
//
// Plain useState, not react-hook-form — same reasoning as
// materials-receiving-form-dialog.tsx: the parent remounts this component via
// a `key` change on every open (see materials-disbursement-client.tsx),
// so there's no reset-on-open effect to trip this project's
// set-state-in-effect lint rule.
export function MaterialsDisbursementFormDialog({
  open,
  onOpenChange,
  lookups,
  disbursement,
  onSaved,
  canConfirm = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: MaterialsDisbursementLookups;
  disbursement?: MaterialsDisbursement | null;
  onSaved: () => void;
  /** Show "บันทึกและตัดสต็อก" (save, then confirm/cut FIFO in one click). */
  canConfirm?: boolean;
}) {
  const isEdit = !!disbursement;
  const [disbursementType, setDisbursementType] = React.useState<DisbursementType>(
    disbursement?.disbursementType ?? "production"
  );
  const [disbursementDate, setDisbursementDate] = React.useState(disbursement?.disbursementDate ?? todayIso());
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [keptAttachments, setKeptAttachments] = React.useState<{ url: string; name: string }[]>(() =>
    disbursement?.attachments && disbursement.attachments.length > 0
      ? disbursement.attachments
      : disbursement?.attachmentUrl
        ? [{ url: disbursement.attachmentUrl, name: disbursement.attachmentName ?? "ไฟล์แนบ" }]
        : []
  );
  const [items, setItems] = React.useState<DisbursementItemDraft[]>(() =>
    disbursement && disbursement.items.length > 0
      ? disbursement.items.map((item) => ({
          key: nextItemKey(),
          materialId: item.materialId,
          requestedQuantity: item.requestedQuantity,
          reason: item.reason ?? "",
          reasonNote: item.reasonNote ?? "",
        }))
      : [newItemDraft()]
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);
  const [confirmingAfterSave, setConfirmingAfterSave] = React.useState(false);

  function materialOptionsFor(rowKey: string) {
    const usedElsewhere = new Set(
      items.filter((i) => i.key !== rowKey && i.materialId !== "").map((i) => i.materialId)
    );
    return lookups.materials.filter((m) => !usedElsewhere.has(m.id));
  }

  function updateItem(key: string, patch: Partial<DisbursementItemDraft>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev));
  }

  function addItem() {
    setItems((prev) => [...prev, newItemDraft()]);
  }

  // Per-field messages, shown by <FieldError> under each control. They appear
  // only after the first submit attempt and then track the live values.
  function validate(): FormErrors {
    const errors: FormErrors = { rows: {} };
    if (!disbursementDate) errors.date = "กรุณาระบุวันที่จ่ายออก";
    else if (disbursementDate > todayIso()) errors.date = "วันที่จ่ายออกต้องไม่เกินวันนี้";
    if (disbursementType === "stock_cut" && newFiles.length === 0 && keptAttachments.length === 0) {
      errors.attachment = "กรุณาแนบไฟล์ (รูปภาพหรือ PDF)";
    }
    const seen = new Set<string>();
    for (const item of items) {
      const row: RowErrors = {};
      if (!item.materialId) row.material = "กรุณาเลือกวัสดุ";
      else if (seen.has(item.materialId)) row.material = "เลือกวัสดุซ้ำกันไม่ได้";
      else seen.add(item.materialId);
      const qty = Number(item.requestedQuantity);
      if (!item.requestedQuantity || Number.isNaN(qty) || qty <= 0) row.qty = "จำนวนที่จ่ายออกต้องมากกว่า 0";
      if (disbursementType === "stock_cut") {
        if (!item.reason) row.reason = "กรุณาเลือกเหตุผล";
        else if (item.reason === OTHER_REASON && !item.reasonNote.trim()) row.note = "กรุณาพิมพ์เหตุผล";
      }
      if (Object.keys(row).length > 0) errors.rows[item.key] = row;
    }
    return errors;
  }

  function hasErrors(e: FormErrors): boolean {
    return !!e.date || !!e.attachment || Object.keys(e.rows).length > 0;
  }

  const errors: FormErrors = attempted ? validate() : { rows: {} };

  async function handleSubmit(confirmAfterSave = false) {
    setAttempted(true);
    if (hasErrors(validate())) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
      return;
    }
    setIsSubmitting(true);
    setConfirmingAfterSave(confirmAfterSave);
    let attachments: { url: string; name: string }[] = [];
    if (disbursementType === "stock_cut") {
      attachments = [...keptAttachments];
      for (const file of newFiles) {
        const form = new FormData();
        form.append("file", file);
        const uploaded = await uploadDisbursementAttachmentAction(form);
        if (uploaded.status === "error") {
          setIsSubmitting(false);
          toast.error(`${file.name}: ${uploaded.message}`);
          return;
        }
        attachments.push({ url: uploaded.attachment.attachmentUrl, name: uploaded.attachment.attachmentName });
      }
    }
    const payload = {
      disbursementType,
      disbursementDate,
      ...(disbursementType === "stock_cut" ? { attachments } : {}),
      items: items.map((item) => ({
        materialId: item.materialId,
        requestedQuantity: item.requestedQuantity,
        ...(disbursementType === "stock_cut"
          ? {
              reason: item.reason,
              reasonNote: item.reason === OTHER_REASON ? item.reasonNote.trim() : undefined,
            }
          : {}),
      })),
    };
    const result = isEdit
      ? await updateMaterialsDisbursementAction(disbursement!.id, payload)
      : await createMaterialsDisbursementAction(payload);
    if (result.status === "success" && confirmAfterSave) {
      // Save + cut stock in one click: confirm the document we just saved.
      const confirmed = await confirmMaterialsDisbursementAction(result.disbursement.id);
      setIsSubmitting(false);
      onSaved();
      if (confirmed.status === "success") {
        toast.success("บันทึกและตัดสต็อกแล้ว", { description: confirmed.disbursement.disbursementNo });
        onOpenChange(false);
      } else {
        // Saved as a draft but the FIFO cut failed (e.g. not enough stock).
        toast.error(`บันทึกเป็นร่างแล้ว แต่ตัดสต็อกไม่สำเร็จ: ${confirmed.message}`);
        onOpenChange(false);
      }
      return;
    }
    setIsSubmitting(false);
    if (result.status === "success") {
      toast.success(isEdit ? "บันทึกการแก้ไขแล้ว" : "สร้างรายการจ่ายออกแล้ว", {
        description: result.disbursement.disbursementNo,
      });
      onSaved();
      onOpenChange(false);
      return;
    }
    toast.error(result.message);
  }

  const typeMeta = TYPE_META[disbursementType];
  const TypeIcon = typeMeta.icon;

  // Live summary — same "reflect what's about to be saved" role as Materials
  // Receiving's LotTicket/box-tile preview (see AGENTS.md § Material
  // Receiving dialog redesign), scaled to this resource's shape: a running
  // item count + total requested quantity + a compact list of picked
  // materials, so the right column always answers "what am I about to save?"
  // at a glance instead of only after scrolling the left column's rows.
  const filledItems = items.filter((item) => item.materialId && item.requestedQuantity);
  const totalQuantity = filledItems.reduce((sum, item) => sum + (Number(item.requestedQuantity) || 0), 0);
  const anyOverAvailable = filledItems.some((item) => {
    const material = lookups.materials.find((m) => m.id === item.materialId);
    if (!material) return false;
    const available = Number(material.availableStock);
    const requested = Number(item.requestedQuantity);
    return !Number.isNaN(available) && !Number.isNaN(requested) && requested > available;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent fullScreenOnMobile size="xl" className="flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${typeMeta.tone}`}>
              <TypeIcon className="size-5" />
            </span>
            <div>
              <DialogTitle>{isEdit ? "แก้ไขรายการจ่ายออก" : "สร้างรายการจ่ายออกวัสดุ"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? `แก้ไขร่าง ${disbursement!.disbursementNo} — แก้ไขได้เฉพาะขณะยังเป็นร่าง`
                  : "ระบบจะตัดสต็อกด้วยหลัก FIFO เมื่อกด \"ยืนยัน\" ในภายหลัง"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid flex-1 gap-5 overflow-y-auto px-6 py-5 [scrollbar-width:none] md:grid-cols-[1fr_280px] md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {/* Form column */}
          <div className="min-w-0 space-y-5 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="md-type">ประเภทการจ่ายออก</Label>
                <Select value={disbursementType} onValueChange={(v) => setDisbursementType(v as DisbursementType)}>
                  <SelectTrigger id="md-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {lookups.disbursementTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="md-date">วันที่จ่ายออก</Label>
                <Input
                  id="md-date"
                  type="date"
                  value={disbursementDate}
                  max={todayIso()}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  aria-invalid={!!errors.date}
                  aria-describedby={errors.date ? "md-date-error" : undefined}
                />
                <FieldError id="md-date-error" message={errors.date} />
              </div>
            </div>

            {disbursementType === "stock_cut" ? (
              <AttachmentPicker
                files={newFiles}
                existing={keptAttachments}
                onAdd={(added) => setNewFiles((prev) => [...prev, ...added])}
                onRemoveFile={(i) => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                onRemoveExisting={(i) => setKeptAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                error={errors.attachment}
              />
            ) : null}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>รายการวัสดุ</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4" /> เพิ่มรายการ
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => {
                  const material = lookups.materials.find((m) => m.id === item.materialId);
                  const available = material ? Number(material.availableStock) : null;
                  const requested = Number(item.requestedQuantity);
                  const overAvailable =
                    available !== null && !Number.isNaN(requested) && requested > available;
                  const accent = ROW_ACCENTS[index % ROW_ACCENTS.length];
                  return (
                    <div
                      key={item.key}
                      className={`overflow-hidden rounded-lg border border-border-strong border-l-4 ${accent.strip}`}
                    >
                      <div className="flex items-center justify-between bg-surface-2 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${accent.badge}`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-sm text-fg-secondary">
                            {material ? (
                              <>
                                <span className="font-mono text-xs text-fg-muted">{material.code}</span> {material.name}
                              </>
                            ) : (
                              <span className="italic text-fg-muted">ยังไม่ได้เลือกวัสดุ</span>
                            )}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.key)}
                          disabled={items.length <= 1}
                          aria-label="ลบรายการนี้"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 p-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label>วัสดุ</Label>
                          {lookups.materials.length === 0 ? (
                            <MasterDataEmptyLink href="/materials/catalog" resourceLabel="วัสดุ" />
                          ) : (
                            <Select
                              value={item.materialId}
                              onValueChange={(v) => updateItem(item.key, { materialId: v })}
                            >
                              <SelectTrigger><SelectValue placeholder="เลือกวัสดุ" /></SelectTrigger>
                              <SelectContent>
                                {materialOptionsFor(item.key).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.code} · {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FieldError message={errors.rows[item.key]?.material} />
                          <p className="text-xs text-fg-muted">วัสดุที่เลือกในรายการอื่นแล้วจะไม่แสดงซ้ำที่นี่</p>
                        </div>
                        <div className="space-y-1.5">
                          <Label>จำนวนที่จ่ายออก</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={item.requestedQuantity}
                            onChange={(e) => updateItem(item.key, { requestedQuantity: e.target.value })}
                            placeholder="0"
                            aria-invalid={!!errors.rows[item.key]?.qty}
                          />
                          <FieldError message={errors.rows[item.key]?.qty} />
                          {material && (
                            <p className={overAvailable ? "text-xs text-danger" : "text-xs text-fg-muted"}>
                              คงเหลือ {formatNumber(available ?? 0)}
                              {overAvailable ? " — เกินจำนวนคงเหลือ" : ""}
                            </p>
                          )}
                        </div>
                        {disbursementType === "stock_cut" && (
                          <>
                            <div className="space-y-1.5">
                              <Label>เหตุผลการตัดสต็อก</Label>
                              <Select
                                value={item.reason}
                                onValueChange={(v) => updateItem(item.key, { reason: v })}
                              >
                                <SelectTrigger><SelectValue placeholder="เลือกเหตุผล" /></SelectTrigger>
                                <SelectContent>
                                  {[...STOCK_CUT_REASONS, OTHER_REASON].map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FieldError message={errors.rows[item.key]?.reason} />
                            </div>
                            <div className="space-y-1.5">
                              <Label>
                                เหตุผล{item.reason === OTHER_REASON ? " (จำเป็น)" : ""}
                              </Label>
                              <Input
                                value={item.reasonNote}
                                onChange={(e) => updateItem(item.key, { reasonNote: e.target.value })}
                                placeholder={item.reason === OTHER_REASON ? "พิมพ์เหตุผล..." : "ระบุเพิ่มเติม (ถ้ามี)"}
                                aria-invalid={!!errors.rows[item.key]?.note}
                              />
                              <FieldError message={errors.rows[item.key]?.note} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Live summary column — hidden on mobile (the form itself is the
              summary there); a bg-surface-2/40 tinted card, same visual
              distinction technique the Material Receiving redesign uses for
              its right-hand ticket+boxes column. */}
          <div className="hidden md:block">
            <div className="sticky top-0 space-y-4 rounded-lg border border-border bg-surface-2/40 p-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ClipboardList className="size-4 text-fg-muted" />
                <h3 className="text-sm font-semibold text-fg">สรุปรายการ</h3>
              </div>

              <div className="flex items-center gap-2">
                <span className={`flex size-7 items-center justify-center rounded-md ${typeMeta.tone}`}>
                  <TypeIcon className="size-3.5" />
                </span>
                <div className="text-sm">
                  <p className="font-medium text-fg">{typeMeta.label}</p>
                  <p className="text-xs text-fg-muted">
                    {new Date(disbursementDate).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-3 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums text-fg">{filledItems.length}</p>
                  <p className="text-[11px] text-fg-muted">รายการวัสดุ</p>
                </div>
                <div className="border-l border-border">
                  <p className="text-lg font-semibold tabular-nums text-fg">{formatNumber(totalQuantity)}</p>
                  <p className="text-[11px] text-fg-muted">จำนวนรวม</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {filledItems.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-xs italic text-fg-muted">
                    <Boxes className="size-3.5" /> ยังไม่มีรายการที่กรอกครบ
                  </p>
                ) : (
                  filledItems.map((item) => {
                    const material = lookups.materials.find((m) => m.id === item.materialId);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-1.5 text-xs"
                      >
                        <span className="min-w-0 truncate text-fg-secondary">{material?.code ?? "—"}</span>
                        <span className="shrink-0 font-mono tabular-nums text-fg">
                          {formatNumber(Number(item.requestedQuantity) || 0)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {anyOverAvailable && (
                <p className="flex items-start gap-1.5 rounded-md bg-danger-soft p-2 text-xs text-danger">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  มีรายการที่จำนวนเกินคงเหลือ — ระบบจะตรวจสอบอีกครั้งตอนยืนยัน
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant={canConfirm ? "outline" : "primary"}
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            {isSubmitting && !confirmingAfterSave && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? "บันทึกการแก้ไข" : "บันทึกร่าง"}
          </Button>
          {canConfirm && (
            <Button type="button" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
              {isSubmitting && confirmingAfterSave ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PackageMinus className="size-4" />
              )}
              บันทึกและตัดสต็อก
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
