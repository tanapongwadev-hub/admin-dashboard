import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMoveNode,
  canHaveChildren,
  collectDescendantIds,
  flattenMenuTree,
  getDragProjection,
  getSubtreeDepth,
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

// ---------------------------------------------------------------------------
// flattenMenuTree — DFS flatten with parentId + depth tracking
// ---------------------------------------------------------------------------

test("flattenMenuTree produces a DFS pre-order with parentId and depth for every node", () => {
  const items = flattenMenuTree([
    menu("a", null, [
      menu("a-1", "a", [menu("a-1-1", "a-1")]),
      menu("a-2", "a"),
    ]),
    menu("b", null),
  ]);

  // DFS pre-order: a, a-1, a-1-1, a-2, b
  assert.deepEqual(
    items.map((i) => ({ id: i.id, parentId: i.parentId, depth: i.depth })),
    [
      { id: "a", parentId: null, depth: 0 },
      { id: "a-1", parentId: "a", depth: 1 },
      { id: "a-1-1", parentId: "a-1", depth: 2 },
      { id: "a-2", parentId: "a", depth: 1 },
      { id: "b", parentId: null, depth: 0 },
    ]
  );
});

test("flattenMenuTree handles deep nesting and empty leaves", () => {
  const items = flattenMenuTree([menu("root", null, [menu("a", "root", [menu("b", "a", [menu("c", "b")])])])]);
  assert.equal(items.length, 4);
  assert.equal(items[items.length - 1].depth, 3);
});

// ---------------------------------------------------------------------------
// collectDescendantIds — every node below + self? (returns descendants only)
// ---------------------------------------------------------------------------

test("collectDescendantIds returns empty Set when the id is not found", () => {
  const items = flattenMenuTree([menu("a", null, [menu("a-1", "a")])]);
  assert.equal(collectDescendantIds(items, "missing").size, 0);
});

test("collectDescendantIds returns the subtree of the id, stopping at the next sibling at the same depth", () => {
  // root
  //   a
  //     a-1
  //     a-2
  //   b
  // Flat DFS pre-order: root (d=0), a (d=1), a-1 (d=2), a-2 (d=2), b (d=1)
  const items = flattenMenuTree([
    menu("root", null, [
      menu("a", "root", [menu("a-1", "a"), menu("a-2", "a")]),
      menu("b", "root"),
    ]),
  ]);
  const aIndex = items.findIndex((i) => i.id === "a");
  const ids = collectDescendantIds(items, "a");
  // a's subtree = a-1, a-2 (b is excluded because it's at the same depth
  // as a — the loop breaks when items[i].depth <= activeDepth).
  assert.deepEqual([...ids].sort(), ["a-1", "a-2"]);
  // a sits at index 1 in the flat list (root is index 0).
  assert.equal(aIndex, 1);
});

test("collectDescendantIds stops at the right depth — returns the whole nested chain when the id is a deep ancestor", () => {
  // root → a → a-1 → a-1-1
  const items = flattenMenuTree([menu("root", null, [menu("a", "root", [menu("a-1", "a", [menu("a-1-1", "a-1")])])])]);
  const ids = collectDescendantIds(items, "a");
  assert.deepEqual([...ids].sort(), ["a-1", "a-1-1"]);
});

// ---------------------------------------------------------------------------
// getSubtreeDepth — how deep is the dragged subtree
// ---------------------------------------------------------------------------

test("getSubtreeDepth returns 0 when the id is not found", () => {
  const items = flattenMenuTree([menu("a", null)]);
  assert.equal(getSubtreeDepth(items, "missing"), 0);
});

test("getSubtreeDepth returns 0 for a leaf", () => {
  const items = flattenMenuTree([menu("a", null, [menu("a-1", "a")])]);
  assert.equal(getSubtreeDepth(items, "a-1"), 0);
});

test("getSubtreeDepth returns the deepest descendant level relative to the active node", () => {
  // root → branch → level-2 → level-3 (branch is depth 0, level-3 is depth 2,
  // so the deepest descendant is 2 levels below branch).
  const items = flattenMenuTree([
    menu("root", null, [
      menu("branch", "root", [
        menu("level-2", "branch", [
          menu("level-3", "level-2"),
        ]),
      ]),
    ]),
  ]);
  assert.equal(getSubtreeDepth(items, "branch"), 2);
});

// ---------------------------------------------------------------------------
// canHaveChildren — BUTTON menus are leaf-only
// ---------------------------------------------------------------------------

test("canHaveChildren returns true for MAIN and SUB menus", () => {
  assert.equal(canHaveChildren({ menuType: "MAIN" }), true);
  assert.equal(canHaveChildren({ menuType: "SUB" }), true);
});

test("canHaveChildren returns false for BUTTON menus (no children allowed)", () => {
  assert.equal(canHaveChildren({ menuType: "BUTTON" }), false);
});

// ---------------------------------------------------------------------------
// applyMoveNode — rebuild full order with depth + parentId applied to
// the dragged row, descendants depth-shifted by the same delta
// ---------------------------------------------------------------------------

test("applyMoveNode returns the input unchanged when the active id is not found", () => {
  const items = flattenMenuTree([menu("a", null)]);
  const out = applyMoveNode(items, items, "missing", "a", { depth: 0, maxDepth: 0, minDepth: 0, parentId: null });
  assert.deepEqual(out, items);
});

test("applyMoveNode shifts descendants' depth by the same delta as the active row", () => {
  // a (depth 0)
  //   a-1 (depth 1)
  //     a-1-1 (depth 2)
  // a is moved under b (depth 0 → 1). a-1 and a-1-1 should each gain +1
  // depth.
  const items = flattenMenuTree([
    menu("a", null, [menu("a-1", "a", [menu("a-1-1", "a-1")])]),
    menu("b", null),
  ]);
  // Move `a` onto `b` (project as a child of b).
  const out = applyMoveNode(
    items,
    items,
    "a",
    "b",
    { depth: 1, maxDepth: 1, minDepth: 1, parentId: "b" }
  );

  // The reordered output starts with b, then a (now child of b), then
  // a-1, then a-1-1 — each at depth+1 from the original.
  const byId = new Map(out.map((i) => [i.id, i]));
  assert.equal(byId.get("b")?.depth, 0);
  assert.equal(byId.get("b")?.parentId, null);
  assert.equal(byId.get("a")?.depth, 1);
  assert.equal(byId.get("a")?.parentId, "b");
  assert.equal(byId.get("a-1")?.depth, 2);
  assert.equal(byId.get("a-1")?.parentId, "a");
  assert.equal(byId.get("a-1-1")?.depth, 3);
  assert.equal(byId.get("a-1-1")?.parentId, "a-1");
});

// ---------------------------------------------------------------------------
// toReorderItems — contiguous 0-based sortOrder per parent
// ---------------------------------------------------------------------------

test("toReorderItems numbers sortOrder 0..N per parentId, contiguous", () => {
  // a (parentId null), a-1 (parentId a), a-2 (parentId a), b (parentId null)
  const items = flattenMenuTree([
    menu("a", null, [menu("a-1", "a"), menu("a-2", "a")]),
    menu("b", null),
  ]);
  const reordered = toReorderItems(items);
  // a and b are both top-level (parentId null) — sortOrder 0 and 1.
  // a-1 and a-2 are both under parentId "a" — sortOrder 0 and 1.
  assert.deepEqual(reordered, [
    { id: "a", parentId: null, sortOrder: 0 },
    { id: "a-1", parentId: "a", sortOrder: 0 },
    { id: "a-2", parentId: "a", sortOrder: 1 },
    { id: "b", parentId: null, sortOrder: 1 },
  ]);
});

test("toReorderItems produces contiguous per-parent indices in input order, regardless of mix", () => {
  // `toReorderItems` doesn't re-sort — it walks the input in order and
  // assigns a 0-based sortOrder per (parentId) bucket, starting at 0 each
  // time it sees a new parentId. This test mixes the children with their
  // parent to verify that the buckets restart correctly on parentId changes
  // (not the document order).
  const items = flattenMenuTree([
    menu("root", null, [
      menu("a-1", "root"),
      menu("a-2", "root"),
      menu("a-3", "root"),
    ]),
  ]);
  // Original DFS order: [root, a-1, a-2, a-3]. Reorder the input to
  // [a-1, root, a-2, a-3] to verify per-parent buckets restart
  // independently — root's bucket (parentId null) starts at 0 once; a-1..a-3
  // form a separate bucket (parentId "root") starting at 0.
  const reordered = toReorderItems([items[1], items[0], items[2], items[3]]);
  assert.equal(reordered[0].id, "a-1");
  assert.equal(reordered[0].parentId, "root");
  assert.equal(reordered[0].sortOrder, 0);
  assert.equal(reordered[1].id, "root");
  assert.equal(reordered[1].parentId, null);
  assert.equal(reordered[1].sortOrder, 0);
  assert.equal(reordered[2].id, "a-2");
  assert.equal(reordered[2].parentId, "root");
  assert.equal(reordered[2].sortOrder, 1);
  assert.equal(reordered[3].id, "a-3");
  assert.equal(reordered[3].parentId, "root");
  assert.equal(reordered[3].sortOrder, 2);
});

test("toReorderItems returns an empty array for empty input", () => {
  assert.deepEqual(toReorderItems([]), []);
});
