import type { Material, PaginatedResult } from "./api/materials";

type MaterialPageFetcher = (page: number) => Promise<PaginatedResult<Material>>;

/**
 * Loads the complete material catalog for Products. The BOM diagram needs
 * inactive historical materials as well as rows beyond the API's 100-item
 * page limit, while the BOM editor must continue offering active rows only.
 */
export async function loadProductMaterialCatalog(fetchPage: MaterialPageFetcher): Promise<{
  diagramMaterials: Material[];
  activeMaterials: Material[];
}> {
  const firstPage = await fetchPage(1);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, firstPage.meta.totalPages - 1) }, (_, index) => fetchPage(index + 2))
  );
  const diagramMaterials = [firstPage, ...remainingPages].flatMap((page) => page.items);

  return {
    diagramMaterials,
    activeMaterials: diagramMaterials.filter((material) => material.isActive),
  };
}
