import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMatrixRows,
  cellState,
  countVisibleMenus,
  cycleOverride,
  effectivePermission,
  sameOverrides,
  diffRoleActions,
  diffAccess,
  filterRows,
  groupState,
  openToAll,
  setOpenFor,
  toAccessMap,
  toggleCell,
  toggleCells,
  toggleRoleAction,
} from "./permission-matrix";
import type { MatrixMenu, MatrixPermission } from "./api/permission-access";

const ACTIVE = ["1", "2"];

function menu(id: string, parentId: string | null, extra: Partial<MatrixMenu> = {}): MatrixMenu {
  return {
    id,
    parentId,
    code: `M${id}`,
    nameTh: `เมนู ${id}`,
    nameEn: `Menu ${id}`,
    menuType: parentId ? "SUB" : "MAIN",
    path: parentId ? `/m${id}` : null,
    icon: null,
    sortOrder: Number(id),
    isActive: true,
    isVisible: true,
    ...extra,
  };
}

function permission(id: string, menuId: string, actionCode: string, extra: Partial<MatrixPermission> = {}): MatrixPermission {
  return {
    id,
    code: `P${id}`,
    description: null,
    menuId,
    actionId: actionCode,
    actionCode,
    isActive: true,
    accessScope: "ALL",
    departmentIds: [],
    ...extra,
  };
}

const menus = [menu("10", null), menu("11", "10"), menu("12", "10")];
const permissions = [
  permission("100", "11", "READ"),
  permission("101", "11", "CREATE"),
  permission("102", "12", "READ", { accessScope: "DEPARTMENTS", departmentIds: ["2"] }),
];

test("cellState distinguishes all, open and closed", () => {
  const map = toAccessMap(permissions);
  assert.equal(cellState(map["100"], "1"), "all");
  assert.equal(cellState(map["102"], "2"), "open");
  assert.equal(cellState(map["102"], "1"), "closed");
});

test("closing an ALL permission keeps every other active department", () => {
  assert.deepEqual(setOpenFor({ accessScope: "ALL", departmentIds: [] }, "1", false, ACTIVE), {
    accessScope: "DEPARTMENTS",
    departmentIds: ["2"],
  });
});

test("opening a closed permission adds only that department", () => {
  assert.deepEqual(
    setOpenFor({ accessScope: "DEPARTMENTS", departmentIds: [] }, "1", true, ACTIVE),
    { accessScope: "DEPARTMENTS", departmentIds: ["1"] },
  );
});

test("opening another action also opens READ of the same menu", () => {
  const start = toAccessMap([
    permission("100", "11", "READ", { accessScope: "DEPARTMENTS", departmentIds: [] }),
    permission("101", "11", "CREATE", { accessScope: "DEPARTMENTS", departmentIds: [] }),
  ]);
  const next = toggleCell(start, permissions, "101", "1", true, ACTIVE);
  assert.equal(cellState(next["101"], "1"), "open");
  assert.equal(cellState(next["100"], "1"), "open");
});

test("closing READ closes every action of the menu for that department", () => {
  const next = toggleCell(toAccessMap(permissions), permissions, "100", "1", false, ACTIVE);
  assert.equal(cellState(next["100"], "1"), "closed");
  assert.equal(cellState(next["101"], "1"), "closed");
  assert.equal(cellState(next["101"], "2"), "open");
});

test("diffAccess returns only changed permissions with sorted departments", () => {
  const original = toAccessMap(permissions);
  const changed = toggleCell(original, permissions, "102", "1", true, ACTIVE);
  assert.deepEqual(diffAccess(original, changed), [
    { permissionId: "102", accessScope: "DEPARTMENTS", departmentIds: ["1", "2"] },
  ]);
  assert.deepEqual(diffAccess(original, openToAll(original, ["100"])), []);
});

test("buildMatrixRows orders parents before children and collects subtree ids", () => {
  const rows = buildMatrixRows(menus, permissions);
  assert.deepEqual(rows.map((row) => [row.menu.id, row.depth]), [
    ["10", 0],
    ["11", 1],
    ["12", 1],
  ]);
  assert.deepEqual([...rows[0].subtreePermissionIds.READ].sort(), ["100", "102"]);
  assert.deepEqual(rows[0].subtreePermissionIds.CREATE, ["101"]);
});

test("filterRows keeps ancestors of matches", () => {
  const rows = buildMatrixRows(menus, permissions);
  assert.deepEqual(filterRows(rows, "M12").map((row) => row.menu.id), ["10", "12"]);
});

test("group toggles and state cover the whole subtree", () => {
  const rows = buildMatrixRows(menus, permissions);
  const ids = rows[0].subtreePermissionIds.READ;
  const map = toAccessMap(permissions);
  assert.equal(groupState(map, ids, "1"), "indeterminate");
  const closed = toggleCells(map, permissions, ids, "1", false, ACTIVE);
  assert.equal(groupState(closed, ids, "1"), false);
  assert.equal(countVisibleMenus(rows, closed, "1"), 0);
  assert.equal(countVisibleMenus(rows, map, "1"), 1);
  assert.equal(countVisibleMenus(rows, map, "2"), 2);
});

test("role toggles keep READ as the base action", () => {
  assert.deepEqual(toggleRoleAction([], "CREATE", true), ["CREATE", "READ"]);
  assert.deepEqual(toggleRoleAction(["READ", "CREATE"], "READ", false), []);
  assert.deepEqual(toggleRoleAction(["READ", "CREATE"], "CREATE", false), ["READ"]);
});

test("diffRoleActions ignores order and reports changed roles only", () => {
  assert.deepEqual(
    diffRoleActions({ "2": ["READ", "CREATE"], "3": ["READ"] }, { "2": ["CREATE", "READ"], "3": ["READ", "UPDATE"] }),
    [{ roleId: "3", actionCodes: ["READ", "UPDATE"] }],
  );
});

test("effectivePermission follows DENY > ALLOW > role ∩ department", () => {
  const access = toAccessMap([
    permission("200", "11", "READ", { accessScope: "DEPARTMENTS", departmentIds: ["2"] }),
  ]);
  const base = { departmentId: "1", roleActionCodes: ["READ"], access, overrides: {}, now: 0 };
  const read = permission("200", "11", "READ");
  assert.deepEqual(effectivePermission(read, base), { granted: false, reason: "DEPARTMENT_BLOCKED" });
  assert.deepEqual(
    effectivePermission(read, { ...base, overrides: { "200": { effect: "ALLOW", expiresAt: null } } }),
    { granted: true, reason: "USER_ALLOW" },
  );
  assert.deepEqual(effectivePermission(read, { ...base, departmentId: "2" }), { granted: true, reason: "ROLE" });
  assert.deepEqual(
    effectivePermission(read, { ...base, departmentId: "2", overrides: { "200": { effect: "DENY", expiresAt: null } } }),
    { granted: false, reason: "USER_DENY" },
  );
  assert.deepEqual(
    effectivePermission(read, {
      ...base,
      now: Date.parse("2030-01-01"),
      overrides: { "200": { effect: "ALLOW", expiresAt: "2029-01-01T00:00:00.000Z" } },
    }),
    { granted: false, reason: "DEPARTMENT_BLOCKED" },
  );
  assert.deepEqual(
    effectivePermission(read, { ...base, departmentId: "2", roleActionCodes: [] }),
    { granted: false, reason: "ROLE_LACKS_ACTION" },
  );
});

test("cycleOverride goes none → ALLOW → DENY → none", () => {
  const a = cycleOverride({}, "1");
  assert.equal(a["1"].effect, "ALLOW");
  const b = cycleOverride(a, "1");
  assert.equal(b["1"].effect, "DENY");
  assert.deepEqual(cycleOverride(b, "1"), {});
  assert.equal(sameOverrides(a, { "1": { effect: "ALLOW", expiresAt: null } }), true);
});
