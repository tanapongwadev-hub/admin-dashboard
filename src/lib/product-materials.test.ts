import test from "node:test";
import assert from "node:assert/strict";
import { loadProductMaterialCatalog } from "./product-materials";
import type { Material, PaginatedResult } from "./api/materials";

function material(id: string, isActive = true): Material {
  return { id, isActive } as Material;
}

test("loads every material page so BOM diagrams can resolve images beyond the first 100 rows", async () => {
  const requestedPages: number[] = [];
  const pages = new Map<number, PaginatedResult<Material>>([
    [
      1,
      {
        items: Array.from({ length: 100 }, (_, index) => material(String(index + 1))),
        meta: { page: 1, limit: 100, totalItems: 101, totalPages: 2 },
      },
    ],
    [
      2,
      {
        items: [material("101")],
        meta: { page: 2, limit: 100, totalItems: 101, totalPages: 2 },
      },
    ],
  ]);

  const catalog = await loadProductMaterialCatalog(async (page) => {
    requestedPages.push(page);
    return pages.get(page)!;
  });

  assert.deepEqual(requestedPages, [1, 2]);
  assert.equal(catalog.diagramMaterials.at(-1)?.id, "101");
});

test("keeps inactive materials for historical BOM images but excludes them from the BOM editor picker", async () => {
  const catalog = await loadProductMaterialCatalog(async () => ({
    items: [material("active"), material("inactive", false)],
    meta: { page: 1, limit: 100, totalItems: 2, totalPages: 1 },
  }));

  assert.deepEqual(catalog.diagramMaterials.map(({ id }) => id), ["active", "inactive"]);
  assert.deepEqual(catalog.activeMaterials.map(({ id }) => id), ["active"]);
});
