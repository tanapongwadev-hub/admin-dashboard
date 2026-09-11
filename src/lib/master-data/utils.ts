import type { GenericActionResult } from "./types";

// Reads the entity back out of a `createCrudActions` success result without
// knowing the resource's literal `resultKey` at the type level.
export function getEntityFromResult<TEntity>(
  result: GenericActionResult<TEntity>,
  resultKey: string
): TEntity | undefined {
  if (result.status !== "success") return undefined;
  return (result as Record<string, unknown>)[resultKey] as TEntity | undefined;
}
