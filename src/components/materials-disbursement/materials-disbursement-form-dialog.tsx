"use client";

import * as React from "react";
import { toast } from "sonner";
import { IssueReportInlineForm } from "@/components/issue-reports/issue-report-inline-form";
import {
  Plus,
  Trash2,
  PackageMinus,
  Factory,
  AlertTriangle,
  ClipboardList,
  Boxes,
  Loader2,
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
} from "@/app/(dashboard)/materials/disbursements/actions";
import type {
  MaterialsDisbursement,
  MaterialsDisbursementLookups,
  DisbursementType,
  IssueReportRef,
} from "@/lib/api/materials-disbursement";
import { ISSUE_DOCUMENT_TYPES, labelOf } from "@/lib/issue-reports";
import { formatNumber } from "@/lib/utils";

// Stock cut must reference the issue report that justifies it (replaces the old
// file attachment). Options come from the disbursement lookups so this does not
// need the separate issue-report view permission.
function IssueReportPicker({
  options,
  value,
  onChange,
  onCreate,
  creatingSlot,
  error,
}: {
  options: IssueReportRef[];
  value: string;
  onChange: (id: string) => void;
  /** Open the create-issue-report dialog; omitted when the user cannot create. */
  onCreate?: () => void;
  /** Inline create form shown in place of the select while creating. */
  creatingSlot?: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="md-issue-report">รายการแจ้งปัญหา</Label>
        <div className="flex items-center gap-2">
          {onCreate && !creatingSlot && (
            <Button type="button" variant="outline" size="sm" onClick={onCreate}>
              <Plus className="size-4" /> แจ้งปัญหาใหม่
            </Button>
          )}
          <Badge variant="danger">จำเป็น</Badge>
        </div>
      </div>
      {creatingSlot ? (
        creatingSlot
      ) : options.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-2/40 p-3 text-sm text-fg-secondary">
          ยังไม่มีรายการแจ้งปัญหาที่เปิดอยู่{onCreate ? " — กด \"แจ้งปัญหาใหม่\" เพื่อสร้างได้เลย" : " — ให้ผู้มีสิทธิ์แจ้งปัญหาก่อน"}
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="md-issue-report" aria-invalid={!!error} aria-describedby={error ? "md-issue-report-error" : undefined}>
            <SelectValue placeholder="เลือกรายการแจ้งปัญหา" />
          </SelectTrigger>
          <SelectContent searchPlaceholder="ค้นหาเลขที่แจ้ง เลขเอกสาร หรือหัวข้อ...">
            {options.map((report) => (
              <SelectItem
                key={report.id}
                value={report.id}
                textValue={`${report.reportNo} ${report.documentNo ?? ""} ${report.title}`}
              >
                {report.reportNo} · {report.title} ({labelOf(ISSUE_DOCUMENT_TYPES, report.documentType)}
                {report.documentNo ? ` ${report.documentNo}` : ""})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <FieldError id="md-issue-report-error" message={error} />
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
}
interface FormErrors {
  date?: string;
  issueReport?: string;
  rows: Record<string, RowErrors>;
}

interface DisbursementItemDraft {
  key: string;
  materialId: string;
  requestedQuantity: string;
}

function newItemDraft(): DisbursementItemDraft {
  return { key: nextItemKey(), materialId: "", requestedQuantity: "" };
}

// Cycled per-row accent theme — same pattern as products-wizard-dialog.tsx's
// BOM_ROW_ACCENTS (the border-l-{color} cascade bug it worked around is fixed
// project-wide as of the 2026-09-10 @layer base fix, see AGENTS.md) — purely
// a glance-level aid so 3+ item rows are visually distinguishable from each
// other, on top of (not instead of) the numbered badge + material name.
const ROW_ACCENTS = [
  { badge: "bg-primary-soft text-primary", strip: "border-l-primary" },
  { badge: "bg-success-soft text-success-fg", strip: "border-l-success" },
  { badge: "bg-warning-soft text-warning-fg", strip: "border-l-warning" },
  { badge: "bg-info-soft text-info-fg", strip: "border-l-info" },
] as const;

const TYPE_META: Record<DisbursementType, { icon: typeof Factory; tone: string; label: string }> = {
  production: { icon: Factory, tone: "bg-primary-soft text-primary", label: "เบิกเพื่อผลิต" },
  stock_cut: { icon: PackageMinus, tone: "bg-warning-soft text-warning-fg", label: "ตัดสต็อก" },
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
  canCreateIssueReport = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: MaterialsDisbursementLookups;
  disbursement?: MaterialsDisbursement | null;
  onSaved: () => void;
  /** Show "บันทึกและตัดสต็อก" (save, then confirm/cut FIFO in one click). */
  canConfirm?: boolean;
  /** Show "แจ้งปัญหาใหม่" so the issue report can be created from this form. */
  canCreateIssueReport?: boolean;
}) {
  const isEdit = !!disbursement;
  const [disbursementType, setDisbursementType] = React.useState<DisbursementType>(
    disbursement?.disbursementType ?? "production"
  );
  const [disbursementDate, setDisbursementDate] = React.useState(disbursement?.disbursementDate ?? todayIso());
  const [issueReportId, setIssueReportId] = React.useState(disbursement?.issueReportId ?? "");
  // Keep the currently-linked report selectable even if it has since been closed.
  const [createdReports, setCreatedReports] = React.useState<IssueReportRef[]>([]);
  const [creatingIssue, setCreatingIssue] = React.useState(false);
  const issueReportOptions = React.useMemo(() => {
    // A report created here also comes back in lookups once the page refreshes;
    // de-duplicate by id so each option (and React key) appears once.
    const byId = new Map<string, IssueReportRef>();
    for (const report of [...createdReports, ...lookups.issueReports]) {
      if (!byId.has(report.id)) byId.set(report.id, report);
    }
    const known = [...byId.values()];
    const current = disbursement?.issueReport;
    return current && !known.some((r) => r.id === current.id) ? [current, ...known] : known;
  }, [createdReports, disbursement?.issueReport, lookups.issueReports]);
  const [items, setItems] = React.useState<DisbursementItemDraft[]>(() =>
    disbursement && disbursement.items.length > 0
      ? disbursement.items.map((item) => ({
          key: nextItemKey(),
          materialId: item.materialId,
          requestedQuantity: item.requestedQuantity,
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
    if (disbursementType === "stock_cut" && !issueReportId) {
      errors.issueReport = "กรุณาเลือกรายการแจ้งปัญหา";
    }
    const seen = new Set<string>();
    for (const item of items) {
      const row: RowErrors = {};
      if (!item.materialId) row.material = "กรุณาเลือกวัสดุ";
      else if (seen.has(item.materialId)) row.material = "เลือกวัสดุซ้ำกันไม่ได้";
      else seen.add(item.materialId);
      const qty = Number(item.requestedQuantity);
      if (!item.requestedQuantity || Number.isNaN(qty) || qty <= 0) row.qty = "จำนวนที่จ่ายออกต้องมากกว่า 0";
      if (Object.keys(row).length > 0) errors.rows[item.key] = row;
    }
    return errors;
  }

  function hasErrors(e: FormErrors): boolean {
    return !!e.date || !!e.issueReport || Object.keys(e.rows).length > 0;
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
    const payload = {
      disbursementType,
      disbursementDate,
      ...(disbursementType === "stock_cut" ? { issueReportId } : {}),
      items: items.map((item) => ({
        materialId: item.materialId,
        requestedQuantity: item.requestedQuantity,
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
              <IssueReportPicker
                options={issueReportOptions}
                value={issueReportId}
                onChange={setIssueReportId}
                onCreate={canCreateIssueReport ? () => setCreatingIssue(true) : undefined}
                creatingSlot={
                  creatingIssue ? (
                    <IssueReportInlineForm
                      idPrefix="md-new-issue"
                      documentType="MATERIAL_DISBURSEMENT"
                      documentNo={disbursement?.disbursementNo}
                      onCancel={() => setCreatingIssue(false)}
                      onCreated={(report) => {
                        setCreatingIssue(false);
                        setCreatedReports((prev) => [report, ...prev]);
                        setIssueReportId(report.id);
                      }}
                    />
                  ) : undefined
                }
                error={errors.issueReport}
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
                          <Label htmlFor={`md-material-${item.key}`}>วัสดุ</Label>
                          {lookups.materials.length === 0 ? (
                            <MasterDataEmptyLink href="/materials/catalog" resourceLabel="วัสดุ" />
                          ) : (
                            <Select
                              value={item.materialId}
                              onValueChange={(v) => updateItem(item.key, { materialId: v })}
                            >
                              <SelectTrigger
                                id={`md-material-${item.key}`}
                                aria-invalid={!!errors.rows[item.key]?.material}
                                aria-describedby={
                                  errors.rows[item.key]?.material ? `md-material-${item.key}-error` : undefined
                                }
                              >
                                <SelectValue placeholder="เลือกวัสดุ" />
                              </SelectTrigger>
                              <SelectContent>
                                {materialOptionsFor(item.key).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.code} · {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <FieldError id={`md-material-${item.key}-error`} message={errors.rows[item.key]?.material} />
                          {items.length > 1 && (
                            <p className="text-xs text-fg-muted">วัสดุที่เลือกในรายการอื่นแล้วจะไม่แสดงซ้ำที่นี่</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`md-qty-${item.key}`}>จำนวนที่จ่ายออก</Label>
                          <Input
                            id={`md-qty-${item.key}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.0001"
                            value={item.requestedQuantity}
                            onChange={(e) => updateItem(item.key, { requestedQuantity: e.target.value })}
                            placeholder="0"
                            aria-invalid={!!errors.rows[item.key]?.qty}
                            aria-describedby={errors.rows[item.key]?.qty ? `md-qty-${item.key}-error` : undefined}
                          />
                          <FieldError id={`md-qty-${item.key}-error`} message={errors.rows[item.key]?.qty} />
                          {material && (
                            <p className={overAvailable ? "text-xs font-medium text-danger-fg" : "text-xs text-fg-muted"}>
                              คงเหลือ {formatNumber(available ?? 0)}
                              {overAvailable ? " — เกินจำนวนคงเหลือ" : ""}
                            </p>
                          )}
                        </div>
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
                    {disbursementDate
                      ? new Date(disbursementDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "ยังไม่ระบุวันที่"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-3 text-center">
                <div>
                  <p className="text-lg font-semibold tabular-nums text-fg">{filledItems.length}</p>
                  <p className="text-xs text-fg-muted">รายการวัสดุ</p>
                </div>
                <div className="border-l border-border">
                  <p className="text-lg font-semibold tabular-nums text-fg">{formatNumber(totalQuantity)}</p>
                  <p className="text-xs text-fg-muted">จำนวนรวม</p>
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
                <p className="flex items-start gap-1.5 rounded-md bg-danger-soft p-2 text-xs text-danger-fg">
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
