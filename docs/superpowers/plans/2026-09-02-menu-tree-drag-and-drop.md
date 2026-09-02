# Menu Tree Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive Menu Management tree editor that stages nested cross-level moves and persists the complete arrangement atomically through cps-api.

**Architecture:** cps-api adds a complete management-tree read model plus a versioned transactional reorder command. The Next.js page loads that model server-side, performs all tree projection and validation through pure client functions, and uses Atlassian Pragmatic Drag and Drop only for pointer/touch input; an equivalent Radix Move dialog remains available without dragging.

**Tech Stack:** NestJS 11, TypeORM 0.3, Jest 30, Next.js 16.3.4 App Router, React 19.2, TypeScript 5 strict, Tailwind CSS 4, Radix UI, Vitest/Testing Library, `@atlaskit/pragmatic-drag-and-drop`.

**Spec:** `docs/superpowers/specs/2026-09-02-menu-tree-drag-and-drop-design.md`

## Global Constraints

- The root menu is level 1 and maximum menu depth is exactly 4.
- `BUTTON` records retain their type, can move, and can never have children.
- Non-button roots are `MAIN`; nested non-button records are `SUB`.
- The reorder request contains every database menu exactly once and sibling `sortOrder` values are contiguous and zero-based.
- No database write occurs before **Save arrangement**; the API update is one transaction protected by an opaque version check.
- Existing `GET /menus/tree`, `/auth/me`, and sidebar permission behavior must not change.
- Use existing dashboard tokens and UI primitives; do not add raw colors or a second component system.
- Pointer dragging is never the only way to move an item; **Move to…** must expose equivalent outcomes.
- Admin Dashboard uses `pnpm` only and must follow its `AGENTS.md`; every user-visible frontend code task updates `AGENTS.md` in the same task.
- Read the relevant Next.js 16 guide in `node_modules/next/dist/docs/` immediately before implementing frontend route, Server Action, or client-navigation behavior.

---

### Task 1: Define and validate the reorder contract in cps-api

**Files:**
- Create: `D:/project-cps/New/cps-api/src/modules/menus/dto/reorder-menus.dto.ts`
- Create: `D:/project-cps/New/cps-api/src/modules/menus/dto/reorder-menus.dto.spec.ts`

**Interfaces:**
- Produces: `ReorderMenuItemDto { id: string; parentId: string | null; sortOrder: number }`
- Produces: `ReorderMenusDto { version: string; items: ReorderMenuItemDto[] }`
- Consumes later: `MenusService.reorder(dto: ReorderMenusDto)` in Task 3.

- [ ] **Step 1: Write failing DTO validation tests**

Use `CustomValidationPipe` to prove a valid payload transforms successfully and these payloads fail: empty version, empty items, duplicate shape errors, non-string IDs, invalid non-null parent IDs, negative order, and decimal order.

```ts
const valid = {
  version: 'sha256:abc',
  items: [
    { id: '1', parentId: null, sortOrder: 0 },
    { id: '2', parentId: '1', sortOrder: 0 },
  ],
};

it('rejects a fractional sort order', async () => {
  await expect(
    pipe.transform(
      { ...valid, items: [{ id: '1', parentId: null, sortOrder: 0.5 }] },
      { type: 'body', metatype: ReorderMenusDto },
    ),
  ).rejects.toBeInstanceOf(BadRequestException);
});
```

- [ ] **Step 2: Run the DTO spec and confirm RED**

Run from `D:/project-cps/New/cps-api`:

```bash
pnpm test -- --runInBand src/modules/menus/dto/reorder-menus.dto.spec.ts
```

Expected: FAIL because `ReorderMenusDto` does not exist.

- [ ] **Step 3: Implement the DTOs with nested validation**

```ts
export class ReorderMenuItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @IsNotEmpty()
  parentId: string | null;

  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderMenusDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderMenuItemDto)
  items: ReorderMenuItemDto[];
}
```

- [ ] **Step 4: Run the DTO spec and confirm GREEN**

Run the command from Step 2. Expected: PASS with all DTO cases green.

- [ ] **Step 5: Commit the contract**

```bash
git add src/modules/menus/dto/reorder-menus.dto.ts src/modules/menus/dto/reorder-menus.dto.spec.ts
git commit -m "feat(menus): define tree reorder contract"
```

---

### Task 2: Implement pure menu-layout projection and validation

**Files:**
- Create: `D:/project-cps/New/cps-api/src/modules/menus/menu-tree-ordering.ts`
- Create: `D:/project-cps/New/cps-api/src/modules/menus/menu-tree-ordering.spec.ts`

**Interfaces:**
- Produces: `ManagementMenuNode`, `ProjectedMenuLayout`, `MAX_MENU_DEPTH`.
- Produces: `buildManagementTree(records: Menu[]): ManagementMenuNode[]`.
- Produces: `computeMenuTreeVersion(records: Menu[]): string`.
- Produces: `validateAndProjectMenuLayout(records: Menu[], items: ReorderMenuItemDto[]): ProjectedMenuLayout[]`.
- Throws: `MenuLayoutValidationError` with a user-safe `.message`.

- [ ] **Step 1: Write failing pure-function tests**

Create fixtures containing two roots, a three-level branch, and a button. Test:

```ts
expect(buildManagementTree(records)[0].children[0].id).toBe('2');
expect(computeMenuTreeVersion([...records].reverse())).toBe(
  computeMenuTreeVersion(records),
);
expect(
  validateAndProjectMenuLayout(records, crossLevelItems),
).toContainEqual({ id: '4', parentId: '2', sortOrder: 1, menuType: 'SUB' });
```

Add explicit rejection cases for duplicate/missing/extra IDs, unknown parent, self-parent, multi-node cycle, depth 5, button with children, duplicate sibling order, and non-contiguous sibling order. Add one case proving a moved subtree retains its descendants and remains at depth 4 or less.

- [ ] **Step 2: Run the ordering spec and confirm RED**

```bash
pnpm test -- --runInBand src/modules/menus/menu-tree-ordering.spec.ts
```

Expected: FAIL because the ordering module does not exist.

- [ ] **Step 3: Implement deterministic tree/version helpers**

Normalize every version entry before hashing so database return order cannot affect concurrency checks:

```ts
const versionInput = records
  .map((menu) => ({
    id: menu.id,
    parentId: menu.parentId ?? null,
    sortOrder: menu.sortOrder,
    menuType: menu.menuType,
    updatedAt: new Date(menu.updatedAt).toISOString(),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

return `sha256:${createHash('sha256')
  .update(JSON.stringify(versionInput))
  .digest('hex')}`;
```

Build the management tree without filtering `isVisible` or `isActive`. Sort every sibling group by `sortOrder`, then `id` for deterministic output.

- [ ] **Step 4: Implement graph validation and projection**

Build `byId`, `childrenByParent`, and `incomingById` maps. Require exact ID-set equality before graph traversal. Walk every root with a `visiting` set and depth counter; after walking, require that the visited count equals the database record count.

```ts
const menuType = existing.menuType === 'BUTTON'
  ? 'BUTTON'
  : item.parentId === null
    ? 'MAIN'
    : 'SUB';
```

Reject any `BUTTON` whose ID has children and reject sibling orders unless their sorted values equal `[0, 1, ..., n - 1]`.

- [ ] **Step 5: Run the ordering spec and confirm GREEN**

Run the command from Step 2. Expected: PASS for valid cross-level projection and every invalid graph.

- [ ] **Step 6: Commit the pure ordering domain**

```bash
git add src/modules/menus/menu-tree-ordering.ts src/modules/menus/menu-tree-ordering.spec.ts
git commit -m "feat(menus): validate nested menu layouts"
```

---

### Task 3: Add management-tree and atomic reorder endpoints

**Files:**
- Modify: `D:/project-cps/New/cps-api/src/modules/menus/menus.service.ts`
- Modify: `D:/project-cps/New/cps-api/src/modules/menus/menus.service.spec.ts`
- Modify: `D:/project-cps/New/cps-api/src/modules/menus/menus.controller.ts`
- Create: `D:/project-cps/New/cps-api/src/modules/menus/menus.controller.spec.ts`
- Modify: `D:/project-cps/New/cps-api/API_ENDPOINTS.md`

**Interfaces:**
- Consumes: Task 1 DTOs and Task 2 ordering helpers.
- Produces: `GET /menus/management-tree -> { version, menus }`.
- Produces: `PATCH /menus/reorder` accepting `ReorderMenusDto` and returning `{ version, updatedCount }`.

- [ ] **Step 1: Extend service mocks and write failing read tests**

Add `manager.getRepository`, a chainable locked query builder, and `manager.save` to the query-runner mock. Prove `findManagementTree()` uses `menuRepository.find()` with no active/visible filter and returns hidden and inactive nodes plus a stable version.

```ts
await expect(service.findManagementTree()).resolves.toMatchObject({
  version: expect.stringMatching(/^sha256:/),
  menus: [{ id: '1', children: expect.any(Array) }],
});
```

- [ ] **Step 2: Write failing transactional reorder tests**

Test success, stale version, validation failure, and write failure. Assert stale/invalid requests call `rollbackTransaction` and never call `manager.save`; assert success calls `manager.save` only with changed records, then commits and returns a new version.

- [ ] **Step 3: Run service tests and confirm RED**

```bash
pnpm test -- --runInBand src/modules/menus/menus.service.spec.ts
```

Expected: FAIL because the new methods do not exist.

- [ ] **Step 4: Implement service orchestration**

`reorder()` must connect and start a transaction before reading. Read all `Menu` rows through the transaction manager with `pessimistic_write`, compare versions, validate the complete layout, save only changed records, commit, and return the version computed from the post-save merged record set.

```ts
if (computeMenuTreeVersion(lockedMenus) !== dto.version) {
  throw new ConflictException(
    'Menu arrangement has changed. Refresh before saving again.',
  );
}
```

Always rollback in `catch` and release in `finally`, following the service's existing transaction pattern.

- [ ] **Step 5: Run service tests and confirm GREEN**

Run the command from Step 3. Expected: PASS, including no-partial-write assertions.

- [ ] **Step 6: Write failing controller route/guard tests**

Test that `findManagementTree()` delegates to the service, `reorder(dto)` passes the DTO unchanged, and class metadata still requires `RoleCode.SUPER_ADMIN`. Verify static routes are declared before `@Patch(':id')`.

- [ ] **Step 7: Add controller routes and rerun controller tests**

```ts
@Get('management-tree')
findManagementTree() {
  return this.menusService.findManagementTree();
}

@Patch('reorder')
reorder(@Body() dto: ReorderMenusDto) {
  return this.menusService.reorder(dto);
}
```

Run:

```bash
pnpm test -- --runInBand src/modules/menus/menus.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Document and verify cps-api**

Add the two exact endpoint contracts, validation rules, depth limit, version conflict behavior, and example request/response to `API_ENDPOINTS.md`.

```bash
pnpm test -- --runInBand src/modules/menus
pnpm build
pnpm exec eslint "src/modules/menus/**/*.ts"
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 9: Commit the backend endpoints**

```bash
git add src/modules/menus API_ENDPOINTS.md
git commit -m "feat(menus): reorder menu tree atomically"
```

---

### Task 4: Add frontend test support and pure tree operations

**Files:**
- Modify: `D:/project-cps/New/admin-dashboard/package.json`
- Modify: `D:/project-cps/New/admin-dashboard/pnpm-lock.yaml`
- Create: `D:/project-cps/New/admin-dashboard/vitest.config.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/test/setup.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/lib/menu-management-types.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-operations.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-operations.test.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-editor-state.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-editor-state.test.ts`
- Modify: `D:/project-cps/New/admin-dashboard/AGENTS.md`

**Interfaces:**
- Produces: `ManagementMenuNode`, `ManagementMenuTreeResponse`, `ReorderMenuItem`, and `ReorderMenusPayload` from one dependency-free shared type module.
- Produces: `DropPosition = "before" | "inside" | "after"`.
- Produces: `MoveIntent { sourceId: string; targetId: string; position: DropPosition }`.
- Produces: `moveMenuBranch(tree, intent, maxDepth = 4): MoveResult`.
- Produces: `normalizeTreeOrder(tree): ManagementMenuNode[]`.
- Produces: `toReorderItems(tree): ReorderMenuItem[]`.
- Produces: `MenuEditorState` and `menuEditorReducer` for move/undo/discard/reset-after-save.

- [ ] **Step 1: Install focused test and drag dependencies**

```bash
pnpm add @atlaskit/pragmatic-drag-and-drop
pnpm add -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Configure jsdom, `@` alias, and `@testing-library/jest-dom/vitest` setup. Do not add React Spectrum, dnd-kit, or a second UI system.

Define the management read/write types in `src/lib/menu-management-types.ts`; both the API layer and client tree code import from this file so neither layer depends on the other.

- [ ] **Step 2: Write failing pure-operation tests**

Cover before/inside/after, child-to-root, root-to-child, cross-branch subtree preservation, self/descendant block, button-parent block, projected depth 5 block, normalization, and payload generation in the operations spec. In the state spec cover successful-move history, ignored invalid moves, undo, discard, save-baseline reset, and the 30-snapshot history cap.

```ts
expect(moveMenuBranch(tree, {
  sourceId: 'products',
  targetId: 'materials',
  position: 'inside',
})).toMatchObject({ ok: true });

expect(moveMenuBranch(tree, {
  sourceId: 'materials',
  targetId: 'material-receiving',
  position: 'inside',
})).toEqual({ ok: false, reason: 'descendant' });
```

- [ ] **Step 3: Run tests and confirm RED**

```bash
pnpm test -- src/components/menu-management/menu-tree-operations.test.ts src/components/menu-management/menu-tree-editor-state.test.ts
```

Expected: FAIL because the operations module does not exist.

- [ ] **Step 4: Implement immutable tree operations and reducer**

Remove the source branch, find its destination in the source-free tree, insert it, then normalize all sibling arrays. Before insertion calculate `destinationDepth + subtreeHeight - 1`; return `{ ok: false, reason: "depth" }` when greater than 4.

```ts
export type MoveResult =
  | { ok: true; tree: ManagementMenuNode[]; announcement: string }
  | { ok: false; reason: 'self' | 'descendant' | 'depth' | 'button-parent' | 'missing' };
```

Implement the reducer in `menu-tree-editor-state.ts`; it stores snapshots only for successful moves and caps undo history at 30 entries.

- [ ] **Step 5: Run tests and confirm GREEN**

Run the command from Step 3. Expected: PASS for every move and reducer case.

- [ ] **Step 6: Update canonical project documentation and verify**

Update Stack with Pragmatic Drag and Drop/Vitest, Project Structure with the new menu-management folder, and Recent Changes with the pure tree engine/test harness. This is the last file edit in this task.

```bash
pnpm test -- src/components/menu-management/menu-tree-operations.test.ts
npx tsc --noEmit -p tsconfig.json
pnpm lint
git diff --check
```

Expected: tests/typecheck exit 0 and lint has no errors (the three known React Compiler warnings may remain).

- [ ] **Step 7: Commit the frontend tree engine**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test src/lib/menu-management-types.ts src/components/menu-management/menu-tree-operations.ts src/components/menu-management/menu-tree-operations.test.ts src/components/menu-management/menu-tree-editor-state.ts src/components/menu-management/menu-tree-editor-state.test.ts AGENTS.md
git commit -m "feat(menus): add tested tree move engine"
```

---

### Task 5: Add typed menu API, Server Action, and explicit route

**Files:**
- Create: `D:/project-cps/New/admin-dashboard/src/lib/api/menus.ts`
- Modify: `D:/project-cps/New/admin-dashboard/src/lib/api/index.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/app/(dashboard)/dashboard/menus/actions.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/app/(dashboard)/dashboard/menus/page.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/app/(dashboard)/dashboard/menus/error.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/lib/api/menus.test.ts`
- Modify: `D:/project-cps/New/admin-dashboard/AGENTS.md`

**Interfaces:**
- Consumes and re-exports where useful: Task 4's `ManagementMenuNode`, `ManagementMenuTreeResponse`, `ReorderMenuItem`, and `ReorderMenusPayload`.
- Produces: `getManagementMenuTree(accessToken)` and `reorderMenus(accessToken, payload)`.
- Produces: `saveMenuArrangementAction(payload): Promise<SaveMenuArrangementResult>`.
- Page passes `{ initialMenus, initialVersion }` to Task 8's `MenuTreeEditor`.

- [ ] **Step 1: Read current Next.js server-data and Server Action docs**

Read the relevant files under `node_modules/next/dist/docs/` for App Router data fetching, cookies, and Server Actions. Record any Next.js 16 breaking convention in the task notes before writing code.

- [ ] **Step 2: Write failing API wrapper tests**

Mock `global.fetch`. Assert both requests use bearer auth, management read uses `cache: "no-store"`, reorder serializes the payload, and a 409 remains an `ApiError` with status 409.

```ts
await reorderMenus('token', payload);
expect(fetch).toHaveBeenCalledWith(
  expect.stringContaining('/menus/reorder'),
  expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: expect.objectContaining({ Authorization: 'Bearer token' }),
  }),
);
```

- [ ] **Step 3: Run API tests and confirm RED**

```bash
pnpm test -- src/lib/api/menus.test.ts
```

Expected: FAIL because `src/lib/api/menus.ts` does not exist.

- [ ] **Step 4: Implement API types and wrappers**

Keep management types separate from the permission-filtered `MenuNode` in `auth.ts`, because management records include `parentId`, bilingual names, visibility, and activity.

```ts
export function getManagementMenuTree(accessToken: string) {
  return apiFetch<ManagementMenuTreeResponse>('/menus/management-tree', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
```

Export the new functions/types from the API barrel and rerun Step 3 to GREEN.

- [ ] **Step 5: Implement the Server Action result contract**

```ts
export type SaveMenuArrangementResult =
  | { status: 'success'; version: string; updatedCount: number }
  | { status: 'conflict'; message: string }
  | { status: 'error'; message: string };
```

Read `accessToken` from `cookies()`. Map API 409 to `conflict`, 401/403 to a permission/session message, other `ApiError` bodies to a safe server message, and transport failures to a retry message. Never return the token.

- [ ] **Step 6: Add the explicit page and error boundary**

The Server Component reads the cookie, redirects to `/login` when absent, fetches the management tree, and renders `MenuTreeEditor`. The client error boundary provides a **Try again** button using `reset()` and preserves dashboard chrome.

- [ ] **Step 7: Update AGENTS.md and verify**

Update Project Structure, API conventions, and Recent Changes after all code edits.

```bash
pnpm test -- src/lib/api/menus.test.ts
npx tsc --noEmit -p tsconfig.json
pnpm lint
pnpm build
git diff --check
```

Expected: all commands exit 0 except the documented lint warnings.

- [ ] **Step 8: Commit the frontend data boundary**

```bash
git add src/lib/api "src/app/(dashboard)/dashboard/menus" AGENTS.md
git commit -m "feat(menus): load and save management tree"
```

---

### Task 6: Build accessible tree rows and Move dialog without dragging

**Files:**
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-row.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/move-menu-dialog.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-row.test.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/move-menu-dialog.test.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/AGENTS.md`

**Interfaces:**
- Produces: `MenuTreeRow` with row/handle refs and visual `DropPosition` state.
- Produces: `MoveMenuDialog { open, menu, tree, onOpenChange, onMove }`.
- Consumes: Task 4 move validation and Task 5 `ManagementMenuNode`.

- [ ] **Step 1: Write failing row semantics/state tests**

Assert visible Thai name, code/path, type badge, hidden/inactive text badges, 44px-equivalent row/handle classes, accessible Expand and More names containing the menu name, and distinct before/inside/after indicators that are not color-only.

- [ ] **Step 2: Write failing Move dialog tests**

Assert the dialog has visible labels for destination and position, excludes the moved node and descendants from destination choices, marks depth-invalid/button destinations disabled, and calls:

```ts
onMove({
  sourceId: 'products',
  targetId: 'materials',
  position: 'inside',
});
```

Use Testing Library keyboard interaction to open and submit the form.

- [ ] **Step 3: Run component tests and confirm RED**

```bash
pnpm test -- src/components/menu-management/menu-tree-row.test.tsx src/components/menu-management/move-menu-dialog.test.tsx
```

Expected: FAIL because both components do not exist.

- [ ] **Step 4: Implement row presentation using existing primitives**

Use `Button`, `Badge`, `DropdownMenu`, and `menuIcon()`. Resolve the icon before rendering it as a component to satisfy `react-hooks/static-components`. Render nested semantic `<ul role="list">`/`<li>` structure; do not claim ARIA `tree` semantics without implementing the full tree keyboard pattern.

- [ ] **Step 5: Implement the Move dialog**

Use the existing Radix `Dialog`, `Select`, `Label`, and `Button`. Destination choices include **Top level** plus eligible nodes. Position choices are **First child**, **Before…**, and **After…**, with the relevant sibling selector. Validate again through `moveMenuBranch` before calling `onMove`.

- [ ] **Step 6: Run component tests and confirm GREEN**

Run Step 3. Expected: PASS; focus returns to the More trigger when Radix closes.

- [ ] **Step 7: Update AGENTS.md, verify, and commit**

Append the accessible row/dialog pattern to Components conventions and Recent Changes as the final edit.

```bash
pnpm test -- src/components/menu-management/menu-tree-row.test.tsx src/components/menu-management/move-menu-dialog.test.tsx
npx tsc --noEmit -p tsconfig.json
pnpm lint
git diff --check
git add src/components/menu-management AGENTS.md
git commit -m "feat(menus): add accessible menu move controls"
```

Expected: checks pass and commit contains only Task 6 files.

---

### Task 7: Wire nested pointer/touch drag behavior

**Files:**
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/use-menu-tree-drag.ts`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/use-menu-tree-drag.test.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-row.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-row.test.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/AGENTS.md`

**Interfaces:**
- Produces: `useMenuTreeDrag({ id, canAcceptChildren, onDropIntent, onHoverInside })`.
- Returns: `{ rowRef, handleRef, dragState, dropPosition }`.
- Emits only validated `MoveIntent`; Task 8 owns state mutation.

- [ ] **Step 1: Write failing drag adapter tests**

Mock Pragmatic Drag and Drop adapters. Verify `draggable` receives the row plus handle, `dropTargetForElements` rejects self/descendants/button parents, and the vertical hitbox maps top 25% to before, middle 50% to inside, and bottom 25% to after.

Test that Inside hover schedules expansion at 500ms and leaving/cancelling clears the timer.

- [ ] **Step 2: Run drag tests and confirm RED**

```bash
pnpm test -- src/components/menu-management/use-menu-tree-drag.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the drag hook with cleanup**

Combine `draggable`, `dropTargetForElements`, and `monitorForElements` cleanup functions in one effect. Use typed drag data `{ type: "cps-menu", id }`; `canDrop` must ignore all other drag types. Store timers in refs and clear them on leave, drop, cancellation, and unmount.

- [ ] **Step 4: Connect visual drag states**

`MenuTreeRow` shows `cursor-grab`/`active:cursor-grabbing`, lowers opacity on the source branch, and renders a labeled line for before/after or outlined row for inside. Collapse a dragged expanded branch and restore its prior expansion state after drop/cancel. Respect `motion-reduce:transition-none`.

- [ ] **Step 5: Run drag and row tests and confirm GREEN**

```bash
pnpm test -- src/components/menu-management/use-menu-tree-drag.test.tsx src/components/menu-management/menu-tree-row.test.tsx
```

Expected: PASS including timer cleanup and all three indicators.

- [ ] **Step 6: Update AGENTS.md, verify, and commit**

Document drag-handle-only behavior, hitboxes, and non-drag parity as the final edit.

```bash
npx tsc --noEmit -p tsconfig.json
pnpm lint
git diff --check
git add src/components/menu-management AGENTS.md
git commit -m "feat(menus): add nested drag and drop"
```

---

### Task 8: Assemble staged editor, save lifecycle, undo, and responsive page

**Files:**
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-editor.tsx`
- Create: `D:/project-cps/New/admin-dashboard/src/components/menu-management/menu-tree-editor.test.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/src/app/(dashboard)/dashboard/menus/page.tsx`
- Modify: `D:/project-cps/New/admin-dashboard/AGENTS.md`

**Interfaces:**
- Produces: `MenuTreeEditor { initialMenus: ManagementMenuNode[]; initialVersion: string }`.
- Consumes: Tasks 4–7 plus `saveMenuArrangementAction` from Task 5.

- [ ] **Step 1: Write failing staged-editor tests**

Test initial clean state, successful drag/dialog move, dirty count, undo button and `Ctrl/Meta+Z`, discard confirmation, Save payload, success baseline reset, 409 preservation, generic retry error, live announcement, and `beforeunload` protection.

```ts
expect(saveMenuArrangementAction).toHaveBeenCalledWith({
  version: 'sha256:initial',
  items: expect.arrayContaining([
    { id: 'products', parentId: 'materials', sortOrder: 1 },
  ]),
});
```

- [ ] **Step 2: Run editor tests and confirm RED**

```bash
pnpm test -- src/components/menu-management/menu-tree-editor.test.tsx
```

Expected: FAIL because `MenuTreeEditor` does not exist.

- [ ] **Step 3: Implement staged state and controls**

Use `useReducer(menuEditorReducer, ...)`. Disable Save/Discard when clean; disable interactions while saving. A successful save dispatches `saved` with the server's new version and calls `router.refresh()`. A conflict/error leaves the tree and undo history untouched.

Use one visually hidden `aria-live="polite" aria-atomic="true"` region for move/save results. Toast copy must match button vocabulary: **Arrangement saved**, **Could not save arrangement**, **Refresh required**.

- [ ] **Step 4: Implement navigation protection and shortcuts**

Register `beforeunload` only while dirty. Intercept same-document anchor navigation in capture phase and use one confirmation with the copy “Discard unsaved menu arrangement?”; do not intercept modified clicks, downloads, external origins, hash-only changes, or Save/Discard actions. Remove every listener on cleanup.

- [ ] **Step 5: Implement the responsive composition**

Desktop shows names, code/path, type, and state badges. Tablet removes path. Mobile keeps the handle, name, status, and More action in a minimum 44px row. The header stacks actions below the title on narrow widths. Render helper copy explaining both drag and **Move to…**.

- [ ] **Step 6: Run editor/full component tests and confirm GREEN**

```bash
pnpm test -- src/components/menu-management
```

Expected: all menu-management tests pass.

- [ ] **Step 7: Update AGENTS.md and run frontend verification**

Update Project Structure, Menu Management conventions, and Recent Changes after the last code edit.

```bash
pnpm test
npx tsc --noEmit -p tsconfig.json
pnpm lint
pnpm build
git diff --check
```

Expected: tests/typecheck/build exit 0; lint has zero errors and only already-documented warnings.

- [ ] **Step 8: Commit the complete editor**

```bash
git add src/components/menu-management "src/app/(dashboard)/dashboard/menus/page.tsx" AGENTS.md
git commit -m "feat(menus): build responsive tree editor"
```

---

### Task 9: Cross-repository integration and authenticated browser QA

**Files:**
- Modify only if verification finds a defect: files introduced in Tasks 1–8.
- Modify after any frontend defect fix: `D:/project-cps/New/admin-dashboard/AGENTS.md`.
- Modify after any contract correction: `D:/project-cps/New/cps-api/API_ENDPOINTS.md`.

**Interfaces:**
- Verifies the complete management flow against the real local cps-api and database.

- [ ] **Step 1: Run fresh backend verification**

```bash
pnpm test -- --runInBand src/modules/menus
pnpm build
pnpm exec eslint "src/modules/menus/**/*.ts"
git diff --check
```

Expected: all commands exit 0 in `D:/project-cps/New/cps-api`.

- [ ] **Step 2: Run fresh frontend verification**

```bash
pnpm test
npx tsc --noEmit -p tsconfig.json
pnpm lint
pnpm build
git diff --check
```

Expected: all commands exit 0 in `D:/project-cps/New/admin-dashboard`, allowing only the three pre-existing React Compiler compatibility warnings if they still exist.

- [ ] **Step 3: Start both applications and authenticate as SUPER_ADMIN**

```bash
# cps-api
pnpm start:dev

# admin-dashboard, separate terminal
pnpm dev
```

Open `/dashboard/menus` and verify the management tree includes at least one hidden/inactive fixture when present while the normal sidebar remains permission-filtered.

- [ ] **Step 4: Exercise pointer and cross-level paths**

Verify before, after, inside, root-to-child, child-to-root, and whole-branch movement. Attempt self/descendant, depth-5, and button-parent drops and confirm each is blocked before Save. Confirm source collapse/restore and 500ms target expansion.

- [ ] **Step 5: Exercise non-drag and responsive paths**

At desktop, tablet, and mobile widths, move the same item through **Move to…** using keyboard only. Confirm 44px mobile targets, visible focus, focus restoration, status text, and screen-reader live messages. Confirm Escape cancels dragging and dialog interaction.

- [ ] **Step 6: Exercise save, undo, discard, and concurrency**

Undo a staged move, discard a second move, then save a third. Refresh and confirm `/auth/me` produces the saved sidebar order. Open a second session, save there first, then confirm the stale first session receives 409 and retains its staged tree. Simulate an API failure and confirm no partial database changes.

- [ ] **Step 7: Fix only verified defects using RED-GREEN tests**

For every defect, add the smallest failing test in the owning repository, reproduce RED, implement the fix, rerun GREEN, and update the repository's canonical documentation before committing.

- [ ] **Step 8: Final review and completion commit if needed**

Review both diffs for secrets, raw colors, unrelated changes, stale comments, and contract drift. If Task 9 produced fixes, commit them in their owning repository with focused messages. Do not create a cross-repository commit.
