"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff, CircleSlash, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { FlatMenuNode } from "@/lib/menu-tree";

export const INDENT_WIDTH = 28;

const typeBadgeVariant = {
  MAIN: "primary",
  SUB: "neutral",
  BUTTON: "outline",
} as const;

export function MenuTreeRow({
  item,
  Icon,
  isOver,
}: {
  item: FlatMenuNode;
  Icon: LucideIcon;
  isOver: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: item.depth * INDENT_WIDTH,
      }}
      className={cn("relative", isDragging && "z-10 opacity-40")}
    >
      {isOver && !isDragging && (
        <span className="absolute -top-0.5 right-0 left-0 h-0.5 rounded-full bg-primary" style={{ marginLeft: item.depth * INDENT_WIDTH }} />
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-transparent bg-surface px-2 py-2 transition-colors",
          isOver && !isDragging && "border-primary/30 bg-primary-soft/40"
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`ลากเพื่อจัดลำดับ ${item.nameEn}`}
          className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-fg-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-secondary">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-fg">{item.nameEn}</p>
            <span className="truncate text-xs text-fg-muted">{item.nameTh}</span>
          </div>
          <p className="truncate font-mono text-[11px] text-fg-muted">{item.code}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {!item.isActive && (
            <span title="ไม่ใช้งาน" className="text-danger">
              <CircleSlash className="h-3.5 w-3.5" />
            </span>
          )}
          {!item.isVisible && (
            <span title="ซ่อนจากแถบเมนู" className="text-fg-muted">
              <EyeOff className="h-3.5 w-3.5" />
            </span>
          )}
          <Badge variant={typeBadgeVariant[item.menuType]} className="text-[10px]">
            {item.menuType}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Standalone drop-in for DragOverlay — receives Icon as a prop for the same
// reason MenuTreeRow does (see menu-icons.ts's ResolvedMenuNode comment):
// picking an icon via menuIcon() and rendering <Icon/> in the same
// component trips react-hooks/static-components.
export function MenuTreeDragPreview({ name, Icon }: { name: string; Icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-2 py-2 shadow-lg">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-fg-secondary">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="text-sm font-medium text-fg">{name}</p>
    </div>
  );
}
