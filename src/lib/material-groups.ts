import type { Material } from "@/lib/api/materials";

export interface MaterialGroup {
  id: string;
  main: Material;
  members: Material[];
}

/** Match either member, then include the whole family before pagination. */
export function groupMaterials(matches: Material[], catalog: Material[] = matches): MaterialGroup[] {
  const byId = new Map(catalog.map((material) => [material.id, material]));
  for (const material of matches) byId.set(material.id, { ...byId.get(material.id), ...material });
  const parentById = new Map<string, string>();
  for (const material of byId.values()) {
    if (material.processingMaterialId && material.processingMaterialId !== material.id && byId.has(material.processingMaterialId)) {
      parentById.set(material.processingMaterialId, material.id);
    }
  }
  function rootId(id: string): string {
    const visited = new Set<string>();
    while (parentById.has(id)) {
      if (visited.has(id)) return [...visited].sort()[0];
      visited.add(id);
      id = parentById.get(id)!;
    }
    return id;
  }
  const families = new Map<string, Material[]>();
  for (const material of byId.values()) {
    const id = rootId(material.id);
    const members = families.get(id) ?? [];
    members.push(material);
    families.set(id, members);
  }
  const orderedIds = [...new Set(matches.map((material) => rootId(material.id)))];
  return orderedIds.map((id) => {
    const main = byId.get(id)!;
    return { id, main, members: [main, ...families.get(id)!.filter((member) => member.id !== id)] };
  });
}
