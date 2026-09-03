import { arrayMove } from "@dnd-kit/sortable";
import type { ManagementMenuNode, ReorderMenuItem } from "./api/menus";

// Client-side mirror of cps-api's MAX_MENU_DEPTH (see
// cps-api/src/modules/menus/menu-tree-ordering.ts). The backend counts
// depth starting at 1 for root items; FlatMenuNode.depth here is 0-indexed,
// so the deepest allowed depth is MAX_MENU_DEPTH - 1.
export const MAX_MENU_DEPTH = 4;
export const MAX_FLAT_DEPTH = MAX_MENU_DEPTH - 1;

export interface FlatMenuNode {
  id: string;
  parentId: string | null;
  code: string;
  nameTh: string;
  nameEn: string;
  menuType: ManagementMenuNode["menuType"];
  path: string | null;
  icon: string | null;
  isVisible: boolean;
  isActive: boolean;
  depth: number;
}

// Depth-first flatten. Order matters: a node and its whole subtree always
// occupy a contiguous run, which is what lets drag-and-drop move a parent
// and its children as one block just by moving array positions.
export function flattenMenuTree(nodes: ManagementMenuNode[], parentId: string | null = null, depth = 0): FlatMenuNode[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      parentId,
      code: node.code,
      nameTh: node.nameTh,
      nameEn: node.nameEn,
      menuType: node.menuType,
      path: node.path,
      icon: node.icon,
      isVisible: node.isVisible,
      isActive: node.isActive,
      depth,
    },
    ...flattenMenuTree(node.children, node.id, depth + 1),
  ]);
}

export function collectDescendantIds(items: FlatMenuNode[], id: string): Set<string> {
  const activeIndex = items.findIndex((item) => item.id === id);
  if (activeIndex === -1) return new Set();
  const activeDepth = items[activeIndex].depth;
  const ids = new Set<string>();
  for (let i = activeIndex + 1; i < items.length; i += 1) {
    if (items[i].depth <= activeDepth) break;
    ids.add(items[i].id);
  }
  return ids;
}

export function getSubtreeDepth(items: FlatMenuNode[], id: string): number {
  const activeItem = items.find((item) => item.id === id);
  if (!activeItem) return 0;

  const descendantIds = collectDescendantIds(items, id);
  return items.reduce(
    (deepest, item) =>
      descendantIds.has(item.id)
        ? Math.max(deepest, item.depth - activeItem.depth)
        : deepest,
    0
  );
}

export interface DragProjection {
  depth: number;
  maxDepth: number;
  minDepth: number;
  parentId: string | null;
}

// The standard dnd-kit "sortable tree" projection: horizontal drag offset
// shifts the dragged row's depth, clamped between what the row above allows
// (one level deeper than it, at most) and what the row below requires (at
// least as deep as it, so we don't strand it as an orphaned root).
// `items` contains the active row at its current position (its children are
// hidden during drag, see menu-tree-editor.tsx). Move it to `overIndex` before
// inspecting its neighbours so parent projection uses the drop destination,
// not the source branch.
export function getDragProjection(
  items: FlatMenuNode[],
  activeIndex: number,
  activeDepth: number,
  dragOffsetX: number,
  indentWidth: number,
  overIndex: number,
  subtreeDepth = 0
): DragProjection | null {
  const projectedItems = arrayMove(items, activeIndex, overIndex);
  const previousItem = projectedItems[overIndex - 1];
  const nextItem = projectedItems[overIndex + 1];
  const dragDepthDelta = Math.round(dragOffsetX / indentWidth);
  const projectedDepth = activeDepth + dragDepthDelta;

  // A BUTTON menu can't accept children (cps-api rejects it), so the deepest
  // a row can nest under one is as its sibling, not its child.
  const previousAllowsChildren = previousItem ? canHaveChildren(previousItem) : true;
  const maxDepth = previousItem
    ? Math.min(
        previousAllowsChildren ? previousItem.depth + 1 : previousItem.depth,
        MAX_FLAT_DEPTH - subtreeDepth
      )
    : 0;
  const minDepth = nextItem ? nextItem.depth : 0;

  // The active subtree cannot fit at this insertion boundary: lowering the
  // minimum would make the following row look like a descendant of the moved
  // branch in the flattened depth-first order.
  if (minDepth > maxDepth) return null;

  let depth = projectedDepth;
  if (depth > maxDepth) depth = maxDepth;
  if (depth < minDepth) depth = minDepth;

  let parentId: string | null = null;
  if (depth !== 0) {
    if (!previousItem) {
      parentId = null;
    } else if (depth === previousItem.depth) {
      parentId = previousItem.parentId;
    } else if (depth > previousItem.depth) {
      parentId = previousItem.id;
    } else {
      for (let i = overIndex - 1; i >= 0; i -= 1) {
        if (projectedItems[i].depth === depth) {
          parentId = projectedItems[i].parentId;
          break;
        }
      }
    }
  }

  return { depth, maxDepth, minDepth, parentId };
}

// A BUTTON-type menu can't have children (cps-api rejects it) — used to
// block dropping any row onto/inside a BUTTON row.
export function canHaveChildren(node: { menuType: ManagementMenuNode["menuType"] }): boolean {
  return node.menuType !== "BUTTON";
}

// Rebuilds the FULL flattened order (including the dragged item's hidden
// descendants) after a drop: reorders the visible siblings, applies the
// projected depth/parent to the dragged item, and reinserts its descendant
// subtree immediately after it with depth shifted by the same delta.
export function applyMoveNode(
  fullItems: FlatMenuNode[],
  visibleItems: FlatMenuNode[],
  activeId: string,
  overId: string,
  projection: DragProjection
): FlatMenuNode[] {
  const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
  const overIndex = visibleItems.findIndex((item) => item.id === overId);
  const activeItem = fullItems.find((item) => item.id === activeId);
  if (activeIndex === -1 || overIndex === -1 || !activeItem) return fullItems;

  const depthDelta = projection.depth - activeItem.depth;
  const descendantIds = collectDescendantIds(fullItems, activeId);
  const descendants = fullItems
    .filter((item) => descendantIds.has(item.id))
    .map((item) => ({ ...item, depth: item.depth + depthDelta }));

  const updatedActive: FlatMenuNode = { ...activeItem, depth: projection.depth, parentId: projection.parentId };
  const reorderedVisible = arrayMove(visibleItems, activeIndex, overIndex);
  const newIndex = reorderedVisible.findIndex((item) => item.id === activeId);
  const finalVisible = [
    ...reorderedVisible.slice(0, newIndex),
    updatedActive,
    ...reorderedVisible.slice(newIndex + 1),
  ];

  const insertAt = newIndex + 1;
  return [...finalVisible.slice(0, insertAt), ...descendants, ...finalVisible.slice(insertAt)];
}

// Recompute contiguous 0-based sortOrder per parent from final visual
// order — cps-api's reorder endpoint rejects gaps or duplicate sibling
// sortOrders (see menu-tree-ordering.ts#validateAndProjectMenuLayout).
export function toReorderItems(items: FlatMenuNode[]): ReorderMenuItem[] {
  const counters = new Map<string | null, number>();
  return items.map((item) => {
    const sortOrder = counters.get(item.parentId) ?? 0;
    counters.set(item.parentId, sortOrder + 1);
    return { id: item.id, parentId: item.parentId, sortOrder };
  });
}
