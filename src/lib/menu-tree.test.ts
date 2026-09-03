import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMoveNode,
  flattenMenuTree,
  getDragProjection,
  toReorderItems,
} from "./menu-tree";
import type { ManagementMenuNode } from "./api/menus";

function menu(
  id: string,
  parentId: string | null,
  children: ManagementMenuNode[] = []
): ManagementMenuNode {
  return {
    id,
    parentId,
    code: id.toUpperCase(),
    nameTh: id,
    nameEn: id,
    menuType: parentId ? "SUB" : "MAIN",
    path: `/${id}`,
    icon: null,
    sortOrder: 0,
    isVisible: true,
    isActive: true,
    children,
  };
}

test("projects a dragged child against its destination parent", () => {
  const items = flattenMenuTree([
    menu("root-a", null, [menu("child-a", "root-a")]),
    menu("root-b", null, [menu("child-b", "root-b")]),
  ]);
  const activeIndex = items.findIndex((item) => item.id === "child-a");
  const overIndex = items.findIndex((item) => item.id === "child-b");

  const projection = getDragProjection(
    items,
    activeIndex,
    items[activeIndex].depth,
    0,
    32,
    overIndex
  );
  assert.ok(projection);
  const moved = applyMoveNode(
    items,
    items,
    "child-a",
    "child-b",
    projection
  );

  assert.deepEqual(
    toReorderItems(moved).find((item) => item.id === "child-a"),
    { id: "child-a", parentId: "root-b", sortOrder: 1 }
  );
});

test("keeps the deepest descendant within the maximum menu depth", () => {
  const fullItems = flattenMenuTree([
    menu("branch", null, [
      menu("level-2", "branch", [
        menu("level-3", "level-2", [menu("level-4", "level-3")]),
      ]),
    ]),
    menu("target", null),
  ]);
  const visibleItems = fullItems.filter(
    (item) => item.id === "branch" || item.id === "target"
  );

  const projection = getDragProjection(
    visibleItems,
    0,
    0,
    32,
    32,
    1,
    3
  );

  assert.ok(projection);
  assert.equal(projection.depth, 0);
});

test("rejects a drop when subtree depth conflicts with the insertion boundary", () => {
  const fullItems = flattenMenuTree([
    menu("branch", null, [
      menu("level-2", "branch", [
        menu("level-3", "level-2", [menu("level-4", "level-3")]),
      ]),
    ]),
    menu("container", null, [
      menu("group", "container", [
        menu("target-a", "group"),
        menu("target-b", "group"),
      ]),
    ]),
  ]);
  const visibleItems = fullItems.filter(
    (item) =>
      !["level-2", "level-3", "level-4"].includes(item.id)
  );

  const projection = getDragProjection(
    visibleItems,
    0,
    0,
    0,
    32,
    visibleItems.findIndex((item) => item.id === "target-a"),
    3
  );

  assert.equal(projection, null);
});
