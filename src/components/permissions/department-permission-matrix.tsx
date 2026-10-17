"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  Info,
  Loader2,
  Minus,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  buildMatrixRows,
  cellState,
  countVisibleMenus,
  diffAccess,
  filterRows,
  groupState,
  openToAll,
  toAccessMap,
  toggleCell,
  toggleCells,
  type AccessMap,
  type CellState,
  type MatrixRow,
} from "@/lib/permission-matrix";
import type { MatrixPermission, PermissionMatrix } from "@/lib/api/permission-access";
import {
  refreshPermissionMatrixAction,
  savePermissionAccessAction,
} from "@/app/(dashboard)/system/permissions/actions";

const INDENT = 18;

const CELL_STYLE: Record<CellState, { className: string; label: string }> = {
  open: { className: "bg-success-soft text-success-fg border-transparent", label: "เปิดให้แผนกนี้" },
  all: { className: "bg-info-soft text-info-fg border-transparent", label: "เปิดทุกแผนก" },
  closed: { className: "bg-surface text-fg-muted border-border", label: "ปิด" },
};

function CellIcon({ state }: { state: CellState }) {
  if (state === "open") return <Check className="size-4" aria-hidden />;
  if (state === "all") return <Globe2 className="size-4" aria-hidden />;
  return <Minus className="size-4" aria-hidden />;
}

export function DepartmentPermissionMatrix({ initialMatrix }: { initialMatrix: PermissionMatrix }) {
  const [matrix, setMatrix] = React.useState(initialMatrix);
  const [saved, setSaved] = React.useState<AccessMap>(() => toAccessMap(initialMatrix.permissions));
  const [access, setAccess] = React.useState<AccessMap>(saved);
  const activeDepartments = React.useMemo(
    () =>
      matrix.departments
        .filter((department) => department.isActive && !department.parentId)
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
    [matrix.departments],
  );
  const activeDepartmentIds = React.useMemo(
    () => activeDepartments.map((department) => department.id),
    [activeDepartments],
  );
  const [departmentId, setDepartmentId] = React.useState(activeDepartments[0]?.id ?? "");
  const [query, setQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [reloading, setReloading] = React.useState(false);

  const rows = React.useMemo(
    () => buildMatrixRows(matrix.menus, matrix.permissions),
    [matrix.menus, matrix.permissions],
  );
  const rowById = React.useMemo(() => new Map(rows.map((row) => [row.menu.id, row])), [rows]);
  const actions = React.useMemo(() => {
    const used = new Set(matrix.permissions.map((permission) => permission.actionCode));
    return matrix.actions.filter((action) => used.has(action.code));
  }, [matrix.actions, matrix.permissions]);

  const changes = React.useMemo(() => diffAccess(saved, access), [saved, access]);
  const changedIds = React.useMemo(() => new Set(changes.map((item) => item.permissionId)), [changes]);
  const narrowedFromAll = changes.filter(
    (item) => saved[item.permissionId]?.accessScope === "ALL" && item.accessScope === "DEPARTMENTS",
  ).length;

  const searching = query.trim().length > 0;
  const visibleRows = React.useMemo(() => {
    const filtered = filterRows(rows, query);
    if (searching) return filtered;
    return filtered.filter((row) => {
      let parentId = row.parentId;
      while (parentId) {
        if (collapsed.has(parentId)) return false;
        parentId = rowById.get(parentId)?.parentId ?? null;
      }
      return true;
    });
  }, [rows, rowById, query, searching, collapsed]);

  const department = activeDepartments.find((item) => item.id === departmentId);
  const visibleMenuCount = departmentId ? countVisibleMenus(rows, access, departmentId) : 0;

  function replaceMatrix(next: PermissionMatrix) {
    const map = toAccessMap(next.permissions);
    setMatrix(next);
    setSaved(map);
    setAccess(map);
  }

  function toggle(permission: MatrixPermission) {
    if (!departmentId) return;
    const open = cellState(access[permission.id], departmentId) === "closed";
    setAccess((current) =>
      toggleCell(current, matrix.permissions, permission.id, departmentId, open, activeDepartmentIds),
    );
  }

  function toggleGroup(permissionIds: string[], open: boolean) {
    if (!departmentId) return;
    setAccess((current) =>
      toggleCells(current, matrix.permissions, permissionIds, departmentId, open, activeDepartmentIds),
    );
  }

  function toggleCollapsed(menuId: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(menuId)) next.delete(menuId);
      else next.add(menuId);
      return next;
    });
  }

  async function reload() {
    setReloading(true);
    const result = await refreshPermissionMatrixAction();
    setReloading(false);
    if (result.status === "success") {
      replaceMatrix(result.matrix);
      toast.success("โหลดข้อมูลสิทธิ์ล่าสุดแล้ว");
    } else {
      toast.error(result.message);
    }
  }

  async function handleSave() {
    if (!reason.trim()) return;
    setSaving(true);
    const result = await savePermissionAccessAction(matrix.version, reason.trim(), changes);
    setSaving(false);
    if (result.status === "success") {
      replaceMatrix(result.matrix);
      setSaveOpen(false);
      setReason("");
      toast.success(`บันทึกสิทธิ์แล้ว ${changes.length} รายการ`);
      return;
    }
    if (result.status === "conflict") {
      setSaveOpen(false);
      toast.error(result.message, {
        action: { label: "โหลดข้อมูลล่าสุด", onClick: () => void reload() },
      });
      return;
    }
    toast.error(result.message);
  }

  if (activeDepartments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-fg-muted">
        ยังไม่มีแผนกที่เปิดใช้งาน ต้องสร้างแผนกก่อนจึงจะกำหนดสิทธิ์ตามแผนกได้
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-col gap-1.5">
            <Label htmlFor="permission-department">กลุ่มแผนก</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="permission-department" className="w-full sm:w-64">
                <SelectValue placeholder="เลือกแผนก" />
              </SelectTrigger>
              <SelectContent searchPlaceholder="ค้นหาแผนก">
                {activeDepartments.map((item) => (
                  <SelectItem key={item.id} value={item.id} textValue={`${item.nameEn} ${item.nameTh}`}>
                    {item.nameEn} · {item.nameTh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SearchInput
            id="permission-menu-search"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาเมนู"
            srLabel="ค้นหาเมนู"
            className="w-full sm:w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-fg-secondary">
            {department ? `${department.code} เห็น ${visibleMenuCount} เมนู` : null}
          </span>
          {changes.length > 0 && <Badge variant="warning">เปลี่ยน {changes.length} รายการ</Badge>}
          <Button variant="ghost" size="sm" onClick={reload} disabled={reloading || saving}>
            {reloading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            โหลดใหม่
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAccess(saved)}
            disabled={changes.length === 0 || saving}
          >
            <RotateCcw className="size-4" />
            รีเซ็ต
          </Button>
          <Button size="sm" onClick={() => setSaveOpen(true)} disabled={changes.length === 0 || saving}>
            <Save className="size-4" />
            บันทึก
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-secondary">
        {(["open", "all", "closed"] as const).map((state) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-flex size-6 items-center justify-center rounded-md border", CELL_STYLE[state].className)}>
              <CellIcon state={state} />
            </span>
            {CELL_STYLE[state].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <Info className="size-4 text-info" aria-hidden />
          เปิด action อื่นจะเปิด &quot;ดู&quot; ให้อัตโนมัติ ปิด &quot;ดู&quot; จะปิดทุก action ของเมนูนั้น · Super Admin เห็นทุกเมนูเสมอ
        </span>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 min-w-52 border-b border-border bg-surface-2 px-4 py-2.5 text-left font-semibold text-fg">
                เมนู
              </th>
              {actions.map((action) => (
                <th
                  key={action.id}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-border bg-surface-2 px-2 py-2.5 text-center text-xs font-semibold text-fg-secondary"
                >
                  {action.nameTh}
                  <span className="block font-mono text-[10px] font-normal text-fg-muted">{action.code}</span>
                </th>
              ))}
              <th className="sticky top-0 z-10 border-b border-border bg-surface-2 px-3 py-2.5 text-right text-xs font-semibold text-fg-secondary">
                ทุกแผนก
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={actions.length + 2} className="px-4 py-12 text-center text-fg-muted">
                  ไม่พบเมนูที่ค้นหา
                </td>
              </tr>
            )}
            {visibleRows.map((row) => (
              <MatrixTableRow
                key={row.menu.id}
                row={row}
                actions={actions.map((action) => action.code)}
                access={access}
                departmentId={departmentId}
                departmentCode={department?.code ?? ""}
                changedIds={changedIds}
                collapsed={collapsed.has(row.menu.id)}
                showToggle={!searching && row.childIds.length > 0}
                onToggleCollapsed={() => toggleCollapsed(row.menu.id)}
                onToggleCell={toggle}
                onToggleGroup={toggleGroup}
                onOpenToAll={(ids) => setAccess((current) => openToAll(current, ids))}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={saveOpen} onOpenChange={(open) => !saving && setSaveOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>บันทึกการเปลี่ยนสิทธิ์</DialogTitle>
            <DialogDescription>
              เปลี่ยน {changes.length} สิทธิ์ มีผลกับผู้ใช้ทันทีในการเรียก API ครั้งถัดไป เมนูในแถบด้านข้างจะอัปเดตเมื่อผู้ใช้รีเฟรชหน้า
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-4">
            {narrowedFromAll > 0 && (
              <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-fg">
                มี {narrowedFromAll} สิทธิ์ที่เปลี่ยนจาก &quot;เปิดทุกแผนก&quot; เป็นเฉพาะแผนกที่เลือก แผนกที่สร้างใหม่ภายหลังจะไม่ได้สิทธิ์เหล่านี้อัตโนมัติ
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="permission-change-reason">เหตุผล</Label>
              <Textarea
                id="permission-change-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="เช่น แยกเมนูคลังให้แผนก WE ตามโครงสร้างงานใหม่"
                aria-describedby="permission-change-reason-hint"
              />
              <p id="permission-change-reason-hint" className="text-xs text-fg-muted">
                บันทึกใน Audit Log คู่กับรายการที่เปลี่ยน
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSave} disabled={saving || !reason.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MatrixTableRow({
  row,
  actions,
  access,
  departmentId,
  departmentCode,
  changedIds,
  collapsed,
  showToggle,
  onToggleCollapsed,
  onToggleCell,
  onToggleGroup,
  onOpenToAll,
}: {
  row: MatrixRow;
  actions: string[];
  access: AccessMap;
  departmentId: string;
  departmentCode: string;
  changedIds: Set<string>;
  collapsed: boolean;
  showToggle: boolean;
  onToggleCollapsed: () => void;
  onToggleCell: (permission: MatrixPermission) => void;
  onToggleGroup: (permissionIds: string[], open: boolean) => void;
  onOpenToAll: (permissionIds: string[]) => void;
}) {
  const { menu } = row;
  const ownPermissions = Object.values(row.permissionsByAction);
  const restricted = ownPermissions.filter((permission) => access[permission.id]?.accessScope !== "ALL");
  const dimmed = !menu.isActive || !menu.isVisible;

  return (
    <tr className="group hover:bg-surface-2/60">
      <th
        scope="row"
        className="sticky left-0 z-[5] border-b border-border bg-surface px-4 py-2 text-left font-normal group-hover:bg-surface-2"
      >
        <div className="flex items-center gap-1.5" style={{ paddingLeft: row.depth * INDENT }}>
          {showToggle ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "ขยาย" : "ย่อ"} ${menu.nameTh}`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg"
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          ) : (
            <span className="size-6 shrink-0" />
          )}
          <div className={cn("min-w-0", dimmed && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={cn("text-fg", row.depth === 0 && "font-semibold")}>{menu.nameTh}</span>
              {!menu.isActive && <Badge>ปิดใช้งาน</Badge>}
              {menu.isActive && !menu.isVisible && <Badge>ซ่อน</Badge>}
              {menu.menuType === "BUTTON" && <Badge variant="info">ปุ่ม</Badge>}
            </div>
            <span className="block truncate font-mono text-[11px] text-fg-muted">{menu.path || menu.code}</span>
          </div>
        </div>
      </th>
      {actions.map((actionCode) => {
        const permission = row.permissionsByAction[actionCode];
        const subtreeIds = row.subtreePermissionIds[actionCode] ?? [];
        return (
          <td key={actionCode} className="border-b border-border px-2 py-2 text-center">
            {permission ? (
              <PermissionCell
                permission={permission}
                state={cellState(access[permission.id], departmentId)}
                changed={changedIds.has(permission.id)}
                menuName={menu.nameTh}
                departmentCode={departmentCode}
                onToggle={() => onToggleCell(permission)}
              />
            ) : row.childIds.length > 0 && subtreeIds.length > 0 ? (
              <Checkbox
                checked={groupState(access, subtreeIds, departmentId)}
                onCheckedChange={(checked) => onToggleGroup(subtreeIds, checked === true)}
                aria-label={`${menu.nameTh} ทั้งกลุ่ม – ${actionCode} – แผนก ${departmentCode}`}
                title="ตั้งค่าทุกเมนูย่อยในกลุ่มนี้"
              />
            ) : (
              <span className="text-fg-muted" aria-hidden>
                —
              </span>
            )}
          </td>
        );
      })}
      <td className="border-b border-border px-3 py-2 text-right">
        {ownPermissions.length === 0 && row.childIds.length === 0 && (
          <span
            className="text-xs text-fg-muted"
            title="เมนูนี้ไม่มีสิทธิ์ของตัวเอง ผู้ใช้ทั่วไปจะไม่เห็นในแถบเมนู แม้หน้าจะใช้สิทธิ์ของเมนูอื่น"
          >
            ไม่มีสิทธิ์ของเมนูนี้
          </span>
        )}
        {restricted.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenToAll(restricted.map((permission) => permission.id))}
            title="ให้ทุกแผนกใช้ทุก action ของเมนูนี้"
          >
            <Globe2 className="size-4" />
            เปิดทุกแผนก
          </Button>
        )}
      </td>
    </tr>
  );
}

function PermissionCell({
  permission,
  state,
  changed,
  menuName,
  departmentCode,
  onToggle,
}: {
  permission: MatrixPermission;
  state: CellState;
  changed: boolean;
  menuName: string;
  departmentCode: string;
  onToggle: () => void;
}) {
  const style = CELL_STYLE[state];
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={state !== "closed"}
      aria-label={`${menuName} – ${permission.actionCode} – แผนก ${departmentCode}: ${style.label}${changed ? " (ยังไม่บันทึก)" : ""}`}
      title={`${permission.code}${permission.description ? ` · ${permission.description}` : ""}${permission.isActive ? "" : " (สิทธิ์ปิดใช้งาน)"}`}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        style.className,
        changed && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
        !permission.isActive && "opacity-50",
      )}
    >
      <CellIcon state={state} />
    </button>
  );
}
