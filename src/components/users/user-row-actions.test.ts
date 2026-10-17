import test from "node:test";
import assert from "node:assert/strict";
import { assignableRoles, getUserRowActions, userDisplayName, userStatus } from "./user-row-actions";
import type { UserRow } from "@/lib/api/users";
import type { RoleSummary } from "@/lib/api/permission-access";

const user: UserRow = {
  id: "7",
  username: "somchai",
  email: null,
  firstName: "สมชาย",
  lastName: "ใจดี",
  isActive: true,
  isLocked: false,
  createdAt: "2026-10-01T00:00:00.000Z",
};

const noop = {
  onEdit: () => undefined,
  onAssignments: () => undefined,
  onResetPassword: () => undefined,
  onToggleStatus: () => undefined,
  onDelete: () => undefined,
};

test("another user's row offers edit, assignments, password, disable and delete", () => {
  assert.deepEqual(
    getUserRowActions(user, "1", noop).map((a) => [a.label, a.variant ?? "default"]),
    [
      ["แก้ไขข้อมูล", "default"],
      ["แผนกและ Role", "default"],
      ["ตั้งรหัสผ่านใหม่", "default"],
      ["ปิดใช้งาน", "danger"],
      ["ลบผู้ใช้ถาวร", "danger"],
    ],
  );
});

test("an inactive user is re-enabled with a non-destructive action", () => {
  const labels = getUserRowActions({ ...user, isActive: false }, "1", noop).map((a) => [a.label, a.variant ?? "default"]);
  assert.deepEqual(labels[3], ["เปิดใช้งาน", "default"]);
});

test("the signed-in admin cannot disable or delete their own account", () => {
  const labels = getUserRowActions(user, "7", noop).map((a) => a.label);
  assert.deepEqual(labels, ["แก้ไขข้อมูล", "แผนกและ Role", "ตั้งรหัสผ่านใหม่"]);
});

test("display name falls back to username, status prefers inactive over locked", () => {
  assert.equal(userDisplayName(user), "สมชาย ใจดี");
  assert.equal(userDisplayName({ ...user, firstName: null, lastName: null }), "somchai");
  assert.equal(userStatus({ isActive: false, isLocked: true }), "inactive");
  assert.equal(userStatus({ isActive: true, isLocked: true }), "locked");
  assert.equal(userStatus({ isActive: true, isLocked: false }), "active");
});

test("assignable roles exclude SUPER_ADMIN and inactive roles", () => {
  const role = (code: string, isActive = true) => ({ id: code, code, isActive }) as RoleSummary;
  assert.deepEqual(
    assignableRoles([role("SUPER_ADMIN"), role("USER"), role("OLD", false)]).map((r) => r.code),
    ["USER"],
  );
});
