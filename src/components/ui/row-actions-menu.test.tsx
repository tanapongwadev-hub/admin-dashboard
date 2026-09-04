import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Pencil, Ban } from "lucide-react";
import { RowActionsMenu } from "./row-actions-menu";

test("renders a single Meatballs trigger with an accessible label naming the row", () => {
  const html = renderToStaticMarkup(
    <RowActionsMenu
      itemLabel="ทดสอบวัสดุ"
      actions={[{ label: "แก้ไข", icon: Pencil, onSelect: () => undefined, variant: "default" }]}
    />
  );

  assert.match(html, /aria-label="ตัวเลือกสำหรับ ทดสอบวัสดุ"/);
  assert.match(html, /lucide-ellipsis/);
  // No MoreHorizontal (three-dot-in-a-row) icon — Ellipsis only.
  assert.doesNotMatch(html, /lucide-more-horizontal/);
});

test("renders nothing at all when there are no permitted actions for the row", () => {
  const html = renderToStaticMarkup(<RowActionsMenu itemLabel="ทดสอบวัสดุ" actions={[]} />);
  assert.equal(html, "");
});

test("the trigger label changes per row so screen readers can distinguish rows", () => {
  const first = renderToStaticMarkup(
    <RowActionsMenu itemLabel="แถวที่ 1" actions={[{ label: "แก้ไข", onSelect: () => undefined }]} />
  );
  const second = renderToStaticMarkup(
    <RowActionsMenu itemLabel="แถวที่ 2" actions={[{ label: "แก้ไข", onSelect: () => undefined }]} />
  );

  assert.match(first, /aria-label="ตัวเลือกสำหรับ แถวที่ 1"/);
  assert.match(second, /aria-label="ตัวเลือกสำหรับ แถวที่ 2"/);
});

test("a single non-danger action still renders the trigger (regression: empty-array check must not swallow real actions)", () => {
  const html = renderToStaticMarkup(
    <RowActionsMenu itemLabel="ทดสอบ" actions={[{ label: "ดูรายละเอียด", icon: Ban, onSelect: () => undefined }]} />
  );
  assert.match(html, /aria-label="ตัวเลือกสำหรับ ทดสอบ"/);
});
