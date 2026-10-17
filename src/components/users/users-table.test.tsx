import { test } from "node:test";
import assert from "node:assert/strict";
import type { UserListItem } from "@/lib/api/users";
import { buildUsersChips, readUsersFilters } from "@/lib/filters/users-filters";
import { assignmentLabel, getUserRowActions, userDisplayName } from "./users-table";

function user(overrides: Partial<UserListItem> = {}): UserListItem {
  return {
    id: "7",
    username: "operator1",
    email: null,
    firstName: "สมชาย",
    lastName: "ใจดี",
    telephone: null,
    isActive: true,
    isLocked: false,
    lastLoginAt: null,
    createdAt: "2026-10-17T00:00:00.000Z",
    assignments: [
      {
        id: "10",
        departmentId: "2",
        roleId: "4",
        isActive: true,
        department: { id: "2", code: "WE", nameTh: "เชื่อม" },
        role: { id: "4", code: "OPERATOR", nameTh: "พนักงาน", scopeType: "DEPARTMENT" },
      },
    ],
    ...overrides,
  };
}

const noop = () => undefined;
const handlers = {
  onEdit: noop,
  onResetPassword: noop,
  onToggleStatus: noop,
  onDelete: noop,
  onOpenOverrides: noop,
};

test("active user gets edit, reset, overrides, then danger deactivate and delete", () => {
  const actions = getUserRowActions(user(), false, handlers);
  assert.deepEqual(
    actions.map((action) => [action.label, action.variant ?? "default"]),
    [
      ["แก้ไขข้อมูลและแผนก", "default"],
      ["รีเซ็ตรหัสผ่าน", "default"],
      ["สิทธิ์รายคน", "default"],
      ["ระงับการใช้งาน", "danger"],
      ["ลบผู้ใช้", "danger"],
    ],
  );
});

test("inactive user is restored with a non-danger action", () => {
  const actions = getUserRowActions(user({ isActive: false }), false, handlers);
  assert.equal(actions.find((action) => action.label === "เปิดใช้งาน")?.variant, undefined);
});

test("own account cannot be deactivated or deleted", () => {
  const labels = getUserRowActions(user(), true, handlers).map((action) => action.label);
  assert.ok(!labels.includes("ระงับการใช้งาน"));
  assert.ok(!labels.includes("ลบผู้ใช้"));
});

test("super admin has no per-person overrides action", () => {
  const superAdmin = user({
    assignments: [
      {
        id: "1",
        departmentId: null,
        roleId: "1",
        isActive: true,
        department: null,
        role: { id: "1", code: "SUPER_ADMIN", nameTh: "ผู้ดูแลระบบ", scopeType: "SYSTEM" },
      },
    ],
  });
  const labels = getUserRowActions(superAdmin, false, handlers).map((action) => action.label);
  assert.ok(!labels.includes("สิทธิ์รายคน"));
  assert.equal(assignmentLabel(superAdmin.assignments[0]), "ผู้ดูแลระบบ");
});

test("labels fall back to the username and show the department code", () => {
  assert.equal(userDisplayName(user({ firstName: null, lastName: null })), "operator1");
  assert.equal(assignmentLabel(user().assignments[0]), "WE · พนักงาน");
});

test("filters read only known statuses and build a status chip", () => {
  assert.deepEqual(readUsersFilters(new URLSearchParams("status=bogus&search= a ")), {
    search: "a",
    status: "all",
  });
  assert.deepEqual(buildUsersChips(readUsersFilters(new URLSearchParams("status=inactive"))), [
    { key: "status", label: "สถานะ: ระงับการใช้งาน" },
  ]);
});
