"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { RotateCcw, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { menuIcon } from "@/lib/menu-icons";
import {
  flattenMenuTree,
  collectDescendantIds,
  getDragProjection,
  getSubtreeDepth,
  applyMoveNode,
  toReorderItems,
  type FlatMenuNode,
} from "@/lib/menu-tree";
import { MenuTreeRow, MenuTreeDragPreview, INDENT_WIDTH } from "@/components/menus/menu-tree-row";
import { saveMenuOrderAction, refreshMenuTreeAction } from "@/app/(dashboard)/menus/actions";
import type { ManagementMenuNode } from "@/lib/api/menus";

export function MenuTreeEditor({
  initialMenus,
  initialVersion,
}: {
  initialMenus: ManagementMenuNode[];
  initialVersion: string;
}) {
  const [items, setItems] = React.useState<FlatMenuNode[]>(() => flattenMenuTree(initialMenus));
  const [savedItems, setSavedItems] = React.useState<FlatMenuNode[]>(items);
  const [version, setVersion] = React.useState(initialVersion);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [offsetX, setOffsetX] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeItem = activeId ? (items.find((item) => item.id === activeId) ?? null) : null;
  const hiddenIds = activeId ? collectDescendantIds(items, activeId) : new Set<string>();
  const visibleItems = items.filter((item) => !hiddenIds.has(item.id));

  // Resolved once here (not inside MenuTreeRow) — picking an icon via
  // menuIcon() and rendering <Icon/> in the same component trips the React
  // Compiler's "components created during render" check. See
  // src/lib/menu-icons.ts's ResolvedMenuNode comment for the same pattern
  // used by the sidebar.
  const resolvedVisible = React.useMemo(
    () => visibleItems.map((item) => ({ item, Icon: menuIcon(item.icon) })),
    [visibleItems]
  );

  const projection = React.useMemo(() => {
    if (!activeId || !overId || activeId === overId) return null;
    const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
    const overIndex = visibleItems.findIndex((item) => item.id === overId);
    if (activeIndex === -1 || overIndex === -1) return null;
    return getDragProjection(
      visibleItems,
      activeIndex,
      items.find((item) => item.id === activeId)!.depth,
      offsetX,
      INDENT_WIDTH,
      overIndex,
      getSubtreeDepth(items, activeId)
    );
  }, [activeId, overId, offsetX, visibleItems, items]);

  const dirty = items !== savedItems;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setOverId(String(event.active.id));
    setOffsetX(0);
  }

  function handleDragMove(event: DragMoveEvent) {
    setOffsetX(event.delta.x);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeItemId = activeId;
    const overItemId = event.over ? String(event.over.id) : null;

    if (activeItemId && overItemId && overItemId !== activeItemId && projection) {
      setItems((current) => applyMoveNode(current, visibleItems, activeItemId, overItemId, projection));
    }

    setActiveId(null);
    setOverId(null);
    setOffsetX(0);
  }

  function handleReset() {
    setItems(savedItems);
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveMenuOrderAction(version, toReorderItems(items));
    setSaving(false);

    if (result.status === "success") {
      setVersion(result.version);
      setSavedItems(items);
      toast.success("Menu order saved");
      return;
    }

    if (result.status === "conflict") {
      toast.error(result.message);
      const refreshed = await refreshMenuTreeAction();
      if (refreshed.status === "success") {
        const freshItems = flattenMenuTree(refreshed.menus);
        setItems(freshItems);
        setSavedItems(freshItems);
        setVersion(refreshed.version);
      }
      return;
    }

    toast.error(result.message);
  }

  const activeIcon = activeItem ? menuIcon(activeItem.icon) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <p className="text-xs text-fg-muted">
          {dirty ? "You have unsaved changes." : "No unsaved changes."}
          {projection && activeItem && (
            <span className="ml-2 text-fg-secondary">
              {projection.parentId
                ? `Will nest under "${items.find((i) => i.id === projection.parentId)?.nameEn}"`
                : "Will become a top-level menu"}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!dirty || saving}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save changes
          </Button>
        </div>
      </div>

      <DndContext
        id="menu-tree-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
          setOffsetX(0);
        }}
      >
        <SortableContext items={visibleItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-2">
            {resolvedVisible.map(({ item, Icon }) => (
              <MenuTreeRow key={item.id} item={item} Icon={Icon} isOver={item.id === overId && item.id !== activeId} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem && activeIcon ? <MenuTreeDragPreview name={activeItem.nameEn} Icon={activeIcon} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
