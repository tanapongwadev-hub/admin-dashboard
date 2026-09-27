import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MasterDataEmptyLink } from "./master-data-empty-link";

test("renders an accessible link to the matching master-data page", () => {
  const html = renderToStaticMarkup(
    <MasterDataEmptyLink href="/master-data/units" resourceLabel="หน่วยนับ" />,
  );

  assert.match(html, /href="\/master-data\/units"/);
  assert.match(html, /ยังไม่มีหน่วยนับ — ไปเพิ่มข้อมูล/);
  assert.match(html, /aria-label="ยังไม่มีหน่วยนับ ไปเพิ่มข้อมูลที่ Master Data"/);
});
