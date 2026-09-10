import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";

// The one real seam behind all 7 "simple master" resources' Server Actions
// (categories, loading-points, delivery-types, reject-reasons,
// material-models, suppliers, units — see AGENTS.md § the master-data CRUD
// recipe, and create-resource-api.ts for this factory's counterpart in the
// API-client layer). Every one of those resources' `actions.ts` files had
// the same cookie-read, 409→"conflict" mapping, session-expiry redirect,
// and best-effort revalidatePath — differing only in the Thai conflict
// message and which field name the created/updated entity comes back
// under. This factory is that shared implementation.
//
// Deliberately scoped to the simple-master "create/update/deactivate/
// restore, one entity, one revalidate path" shape — Materials PC,
// Products, and Material Receiving each have real extra behavior (image
// upload, BOM/workflow sub-resources, multi-step confirm flows) that this
// shape doesn't cover. Don't force those through this factory.

export type CrudActionResult<K extends string, TEntity> =
  | ({ status: "success" } & Record<K, TEntity>)
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

interface CrudActionsConfig<TEntity, TPayload, TUpdatePayload, K extends string> {
  api: {
    create: (accessToken: string, payload: TPayload) => Promise<TEntity>;
    update: (accessToken: string, id: string, payload: TUpdatePayload) => Promise<TEntity>;
    deactivate: (accessToken: string, id: string) => Promise<TEntity>;
    restore: (accessToken: string, id: string) => Promise<TEntity>;
  };
  // Key the returned entity is nested under on success, e.g. "loadingPoint"
  // so a caller reads `result.loadingPoint` — kept per-resource (not a
  // fixed generic key like `data`) so this refactor doesn't touch any
  // existing client component that already reads `result.<resourceName>`.
  resultKey: K;
  revalidatePath: string;
  // Thai message shown on a 409 (another editor's `updatedAt` won the
  // race) — the only piece of copy every resource genuinely needs its own
  // wording for ("ข้อมูลจุดขนถ่ายนี้ถูกอัปเดต..." vs "...หน่วยนับนี้...").
  conflictMessage: string;
}

async function requireAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

/**
 * Builds the 4 `perform*` helpers (accessToken passed explicitly — the
 * testable inner functions, see AGENTS.md's `perform*` + public-wrapper
 * pattern) and the 4 public Server-Action wrappers (read the cookie
 * themselves, sign the user out immediately if it's missing) for one
 * simple-master resource.
 *
 * The public wrappers are returned as plain closures here — they still
 * have to be re-declared as literal `export async function` bodies in
 * each resource's own `"use server"` actions.ts file (Next's Server
 * Actions transform operates on function declarations physically present
 * in a `"use server"` file, not on re-exported references), but each
 * declaration is a one-line delegation to the closure this factory
 * returns — see any `master-data/<resource>/actions.ts` for the pattern.
 */
export function createCrudActions<TEntity, TPayload, TUpdatePayload, const K extends string>(
  config: CrudActionsConfig<TEntity, TPayload, TUpdatePayload, K>
) {
  type Result = CrudActionResult<K, TEntity>;

  function errorResult(err: unknown): Exclude<Result, { status: "success" }> {
    // Session expired mid-action (401) --> sign the user out immediately
    // instead of returning a dead-end error toast. See lib/session-expiry.ts.
    redirectIfSessionExpired(err);
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return { status: "conflict", message: config.conflictMessage };
      }
      const body = err.body as { message?: string | string[] } | undefined;
      const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
      return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
    }
    return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
  }

  function success(entity: TEntity): Result {
    // Best-effort — a revalidation failure must never downgrade a
    // successful save to an error (see AGENTS.md's `perform*` pattern
    // note on why this is a separate try-catch from the API call's own).
    try {
      revalidatePath(config.revalidatePath);
    } catch {
      /* best-effort */
    }
    return { status: "success", [config.resultKey]: entity } as Result;
  }

  async function performCreate(accessToken: string, payload: TPayload): Promise<Result> {
    try {
      return success(await config.api.create(accessToken, payload));
    } catch (err) {
      return errorResult(err);
    }
  }

  async function performUpdate(accessToken: string, id: string, payload: TUpdatePayload): Promise<Result> {
    try {
      return success(await config.api.update(accessToken, id, payload));
    } catch (err) {
      return errorResult(err);
    }
  }

  async function performDeactivate(accessToken: string, id: string): Promise<Result> {
    try {
      return success(await config.api.deactivate(accessToken, id));
    } catch (err) {
      return errorResult(err);
    }
  }

  async function performRestore(accessToken: string, id: string): Promise<Result> {
    try {
      return success(await config.api.restore(accessToken, id));
    } catch (err) {
      return errorResult(err);
    }
  }

  async function create(payload: TPayload): Promise<Result> {
    const accessToken = await requireAccessToken();
    if (!accessToken) redirectMissingSession();
    return performCreate(accessToken, payload);
  }

  async function update(id: string, payload: TUpdatePayload): Promise<Result> {
    const accessToken = await requireAccessToken();
    if (!accessToken) redirectMissingSession();
    return performUpdate(accessToken, id, payload);
  }

  async function deactivate(id: string): Promise<Result> {
    const accessToken = await requireAccessToken();
    if (!accessToken) redirectMissingSession();
    return performDeactivate(accessToken, id);
  }

  async function restore(id: string): Promise<Result> {
    const accessToken = await requireAccessToken();
    if (!accessToken) redirectMissingSession();
    return performRestore(accessToken, id);
  }

  return { performCreate, performUpdate, performDeactivate, performRestore, create, update, deactivate, restore };
}
