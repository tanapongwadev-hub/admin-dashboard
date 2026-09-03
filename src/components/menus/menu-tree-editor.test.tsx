import test from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MenuTreeEditor } from "./menu-tree-editor";
import type { ManagementMenuNode } from "@/lib/api/menus";

const menus: ManagementMenuNode[] = [
  {
    id: "menu-1",
    parentId: null,
    code: "MENU_1",
    nameTh: "เมนูหนึ่ง",
    nameEn: "Menu one",
    menuType: "MAIN",
    path: "/menu-1",
    icon: null,
    sortOrder: 0,
    isVisible: true,
    isActive: true,
    children: [],
  },
];

function describedById(html: string): string | undefined {
  return html.match(/aria-describedby="([^"]+)"/)?.[1];
}

test("uses the same drag instructions id across server renders", () => {
  const first = describedById(
    renderToString(
      <MenuTreeEditor initialMenus={menus} initialVersion="sha256:first" />
    )
  );
  const second = describedById(
    renderToString(
      <MenuTreeEditor initialMenus={menus} initialVersion="sha256:second" />
    )
  );

  assert.equal(first, "menu-tree-dnd");
  assert.equal(second, "menu-tree-dnd");
});
