# Menu Tree Drag-and-Drop Design

**Date:** 2026-09-02  
**Status:** Approved for implementation planning  
**Repositories:** `admin-dashboard`, `cps-api`

## Context

The real menu catalog is hierarchical and is already the source of the dashboard sidebar. The admin route `/dashboard/menus` currently falls through to a placeholder, while `cps-api` only supports updating one menu at a time. A nested drag-and-drop editor therefore needs both a real management page and an atomic backend operation; issuing many independent `PATCH /menus/:id` requests could leave the tree partially updated.

The editor is for `SUPER_ADMIN` users who need to reorder menus, move branches between parents, and recover hidden or inactive items. It must remain usable with mouse, touch, keyboard, and assistive technology.

## Goals

- Replace the `/dashboard/menus` placeholder with a responsive management page.
- Show the complete menu catalog, including hidden and inactive records.
- Reorder siblings and move a whole branch across parents or levels.
- Support a maximum depth of four levels, where a root is level 1.
- Stage changes locally and persist the complete arrangement only after the user selects **Save arrangement**.
- Save atomically and reject stale, invalid, cyclic, or incomplete trees.
- Offer an equivalent non-drag **Move to…** flow for touch, keyboard, and assistive-technology users.

## Non-goals

- Creating, editing, or deleting menu definitions and permissions in this delivery.
- Reordering several selected branches at once.
- Changing sidebar permission filtering; cps-api remains the authority for which menus a role can see.
- Adding drag-and-drop directly to the navigation sidebar. Dragging exists only in Menu Management.

## Chosen Approach

Use `@atlaskit/pragmatic-drag-and-drop` for pointer/touch drag primitives and build a CPS-specific React tree editor around it. This keeps the current Radix/Tailwind design system, provides the low-level operations needed for nested targets, and avoids importing a second complete component system.

Rejected alternatives:

1. **React Spectrum TreeView:** strong built-in drag accessibility, but it introduces a second visual/component system and makes exact CPS styling and Radix integration harder.
2. **Native HTML Drag and Drop only:** no new dependency, but inconsistent touch/browser behavior and substantial custom accessibility work make it the highest-risk option.

Accessibility does not depend on dragging. Each row has a single visible drag handle and a More menu. **Move to…** opens an existing Radix Dialog containing destination parent and exact position controls, providing every outcome that pointer dragging provides. Successful moves are announced in a polite live region and focus returns to the moved row's More trigger.

## Interaction Design

### Tree rows

Each row is at least 44px high and contains:

- an always-visible drag handle;
- expand/collapse control when children exist;
- menu icon, Thai name, English name or code, and path;
- type badge (`MAIN`, `SUB`, or `BUTTON`);
- distinct text/icon badges for hidden and inactive status;
- one More menu containing **Move to…**.

Rows use the existing design tokens. The signature visual is a restrained “routing rail”: indentation rails make the hierarchy legible, while the active drop indicator becomes either a horizontal insertion line or an outlined parent row. No raw colors or new typography are introduced.

### Drop operations

Every eligible row exposes three pointer drop zones:

- **Before:** same parent, immediately before the target.
- **Inside:** last child of the target.
- **After:** same parent, immediately after the target.

Dragging a branch temporarily collapses its descendants. A collapsed eligible target expands after a 500ms Inside hover. At drop, all descendants remain attached to the dragged node and the destination chain expands so the moved node stays visible.

A move is blocked before state mutation when it would:

- place a node inside itself or one of its descendants;
- exceed four levels after accounting for the height of the moved subtree;
- make a `BUTTON` the parent of another item.

`BUTTON` nodes retain their type when moved and may never have children. For non-button nodes, root placement produces `MAIN`; placement under another node produces `SUB`.

### Staged changes

Dropping or using **Move to…** updates client state only. The header shows the number of moved items and enables:

- **Save arrangement:** sends the complete normalized layout to the API.
- **Discard changes:** restores the server snapshot.
- `Ctrl/Command + Z`: undoes the most recent staged move.

Leaving the page with unsaved changes triggers a confirmation. Dragging can be cancelled with Escape. Motion is restrained and disabled or reduced under `prefers-reduced-motion`.

### Responsive behavior

Desktop shows all row metadata. Tablet hides lower-priority path text. Mobile keeps 44px touch targets, name, status, handle, and More menu; type/path details collapse. Dragging remains available on the handle, but helper copy points users to **Move to…** as the precise alternative and prevents conflict with vertical page scrolling.

## Frontend Architecture (`admin-dashboard`)

### Route and data loading

Add an explicit Server Component at `src/app/(dashboard)/dashboard/menus/page.tsx`. It loads the management tree through a typed function in `src/lib/api/menus.ts`, using the logged-in access-token cookie through the established server-only API client pattern. The existing dashboard layout remains the authentication guard.

Server Actions colocated with the page expose the save operation to the client without exposing the token. On success the action returns the new opaque tree version, the page refreshes, and a success toast uses the same **Save arrangement** vocabulary. On `409 Conflict`, the UI preserves staged work and instructs the user to refresh before retrying.

### Components and pure tree logic

Keep responsibilities separated:

- `menu-tree-editor.tsx`: editor state, dirty state, undo history, save/discard lifecycle, and live announcements.
- `menu-tree-row.tsx`: one visual tree item, drag handle, drop indicators, expansion, badges, and More trigger.
- `move-menu-dialog.tsx`: accessible non-drag destination and position form.
- `menu-tree-operations.ts`: pure functions for flattening, rebuilding, ancestry checks, projected depth, moving a subtree, normalizing sibling order, and generating the API payload.

The tree editor receives a complete immutable server snapshot and version. Client edits create new tree state; server-derived props are never mutated. Expanded state is independent from ordering state.

## Backend Architecture (`cps-api`)

### Read endpoint

Add `GET /menus/management-tree`, protected by the controller's existing JWT and `SUPER_ADMIN` guards. Unlike the existing `GET /menus/tree`, it returns every menu, including hidden and inactive records, as:

```ts
{
  version: string;
  menus: ManagementMenuNode[];
}
```

`ManagementMenuNode` includes `id`, `parentId`, `code`, `nameTh`, `nameEn`, `menuType`, `path`, `icon`, `sortOrder`, `isVisible`, `isActive`, and recursive `children`. Existing `/menus/tree` behavior remains unchanged.

The opaque `version` is a deterministic digest of ordering-relevant state for every menu (`id`, `parentId`, `sortOrder`, `menuType`, and `updatedAt`). Clients compare and return the value but never interpret it.

### Atomic reorder endpoint

Add `PATCH /menus/reorder`, declared before `PATCH /menus/:id`, with this request:

```ts
{
  version: string;
  items: Array<{
    id: string;
    parentId: string | null;
    sortOrder: number;
  }>;
}
```

The client sends every menu exactly once. Within one database transaction, the service locks the menu rows, recomputes the current version, and returns `409 Conflict` if it differs. It then validates:

- item IDs are unique and exactly match the complete database set;
- every non-null parent exists;
- no item is its own parent;
- the graph contains no cycle and every node resolves to a root;
- maximum depth is four;
- `BUTTON` nodes have no children;
- every sibling group uses unique, contiguous zero-based `sortOrder` values.

After validation, the service updates `parentId` and `sortOrder` for all changed rows. It preserves `BUTTON`; all other root nodes become `MAIN`, and all other nested nodes become `SUB`. The transaction either commits every change or commits none. The response contains the new version and number of changed records.

No create/edit/delete contract changes in this delivery.

## Error Handling and Concurrency

- Invalid moves are prevented in the client and rejected independently by the API.
- Validation responses identify the offending item or relationship without exposing internals.
- A stale version returns `409` before any update, preventing silent last-write-wins behavior between administrators.
- Network or server failures retain local staged state and keep Save enabled for retry.
- A successful save replaces the local baseline, clears undo history, and marks the editor clean.

## Testing Strategy

### Backend

- DTO validation for missing/duplicate IDs, parent formats, negative or non-integer sort order.
- Service tests for sibling reorder, cross-parent move, whole-subtree move, MAIN/SUB conversion, and BUTTON preservation.
- Rejection tests for self-parent, descendant cycle, depth 5, BUTTON parent, incomplete/extra IDs, non-contiguous order, and stale version.
- Transaction test proving no partial update when any validation or write fails.
- Controller test confirming both management endpoints remain `SUPER_ADMIN` only.

### Frontend

- Pure-operation tests for before/inside/after moves, cross-level moves, subtree preservation, depth projection, cycle blocking, order normalization, and undo.
- Component tests for drop indicators, hidden/inactive labels, dirty controls, server errors, and accessible Move dialog.
- Keyboard verification for tab order, dialog operation, Escape cancellation, focus restoration, and live announcements.
- Pointer/touch smoke tests at desktop, tablet, and mobile widths.
- Existing TypeScript, ESLint, and production build checks in both repositories.

## Delivery Sequence

1. Implement and test management-tree read and atomic reorder endpoints in `cps-api`.
2. Add typed menu API access and Server Actions in `admin-dashboard`.
3. Implement pure tree operations with tests.
4. Build the responsive editor, drag behavior, Move dialog, staged save, undo, and error states.
5. Run backend and frontend verification, then perform authenticated browser QA against the local API.

## Success Criteria

- A super administrator can move a menu before, after, or inside another eligible menu across any branch up to level 4.
- The entire moved subtree remains intact and no invalid tree can be staged or persisted.
- Hidden and inactive menus remain visible and identifiable in the management editor.
- No database state changes until Save arrangement is selected.
- Concurrent edits cannot silently overwrite one another.
- The same move can be completed without drag-and-drop.
- The sidebar reflects the newly saved arrangement after refresh through its existing `/auth/me` menu tree.
