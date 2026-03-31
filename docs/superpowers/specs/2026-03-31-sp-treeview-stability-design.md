# sp-treeview-v2 Stability Fix — Design Spec

**Date**: 2026-03-31
**Status**: Approved
**Scope**: Fix 4 broken features — filter, add/remove, collapse/expand, partial selection (indeterminate checkbox)

---

## Root Causes

Two distinct bugs, both must be fixed.

### Bug 1 — Template Context `Object.create` Mismatch (primary)

In `SpTreeviewNodeComponent.ngOnInit()`, the template context is created via:
```ts
this.context = Object.create(this.contextPrototype ?? SpTreeviewNodeTemplateContext.prototype)
```

`SpTreeviewNodeTemplateContext` defines its handlers (`onCollapseExpand`, `onCheckChange`, `onRadioChange`, `onDelete`, `onAddChild`, `onLoadChildren`) as **class-field arrow functions** — these are instance properties, not prototype methods. `Object.create(prototype)` only inherits prototype methods. So all six handler variables in the default template resolve to `undefined`. Every user interaction (click collapse, check checkbox, click delete/add) silently does nothing.

### Bug 2 — OnPush Change Detection with Mutable State (secondary)

All `Node` mutations (`children` loaded, `collapsed` toggled, `checked` changed) happen in-place with no `markForCheck()` or `detectChanges()` call. Angular's `OnPush` only re-renders when an `@Input()` reference changes or CD is explicitly triggered. So even if Bug 1 were fixed, most state changes would not appear in the UI.

---

## Design

### Principle

> All change detection is owned by `SpTreeviewComponent`. Node components inject CDR only for the one case where they own the interaction directly (local collapse toggle). Five `detectChanges()` calls at the tree root handle everything else.

### Fix 1: Context Handler Binding (`sp-treeview-node.component.ts`)

After `Object.create(...)` in `ngOnInit()`, explicitly assign all six handler functions as arrow functions defined on the component class (so they close over `this` and have CDR access):

```
context.onCollapseExpand  ← arrow fn on component, calls cdr.markForCheck()
context.onCheckChange     ← arrow fn on component
context.onRadioChange     ← arrow fn on component
context.onDelete          ← arrow fn on component
context.onAddChild        ← arrow fn on component
context.onLoadChildren    ← arrow fn on component
```

`SpTreeviewNodeComponent` injects `ChangeDetectorRef`. It is used **only** in `onCollapseExpand` for the local synchronous toggle case (see below). All other CDR work is done by the parent tree component.

`SpTreeviewNodeTemplateContext` class is unchanged. Its handler logic stays for custom-template consumers who instantiate the context directly.

### Fix 2: Async Load Notification (`tree-level-config.ts`)

Add a single optional callback:
```ts
onPopLoad: (() => void) | null = null;
```

Call it in `popLoad()` when the load stack empties:
```ts
popLoad(): void {
  this.loadChildrenStack.pop();
  if (this.loadChildrenStack.length === 0) {
    this.progress = false;
    this.onPopLoad?.();   // ← new
  }
}
```

`SpTreeviewComponent` wires this in `ngOnInit()` to call `this.cdr.detectChanges()`. Cleared in `ngOnDestroy()`.

### Fix 3: detectChanges at Tree Root (`sp-treeview.component.ts`)

Inject `ChangeDetectorRef`. Add `cdr.detectChanges()` at the end of these methods:

| Method | Trigger | Why detectChanges here |
|---|---|---|
| `onChange()` | checkbox or radio state changed | All checked/indeterminate state is set by the time this runs; one detectChanges re-renders the full tree |
| `onDelete()` | after `this.delete.emit(node)` | App handler is synchronous — mutation is done before emit returns |
| `onAddChild()` | after `this.addChild.emit(node)` | Same — synchronous |
| `applySearch()` | after all trees searched | All `nodeState.hidden` mutations are done |
| `onRemoveRoot` callback | wired in `ngOnInit` | Reassign `this.nodes` then `detectChanges()` |

### Collapse/Expand Detail

`onCollapseExpand` has two paths:

**Path A — lazy load** (collapsed=true, children empty, loadOnce=true):
- Sets `node.progress = true`, emits `loadChildren`
- `SpTreeviewComponent.onLoadChildren` → `pushLoad()` → emits `@Output loadChildren`
- `AppComponent` calls `node.loadChildren(children)` after delay
- `node.loadChildren()` sets `node.children`, `collapsed = false`, calls `popLoad()`
- `popLoad()` fires `onPopLoad` → `SpTreeviewComponent.cdr.detectChanges()` ✓

**Path B — sync toggle** (already loaded, or collapsing):
- Toggles `node.nodeState.collapsed`
- Calls `this.cdr.markForCheck()` on the node component's own CDR
- Zone.js (click event) triggers a CD cycle, node component is rechecked ✓

### Edge Cases

| Scenario | Handled by |
|---|---|
| Root delete | `onRemoveRoot`: `this.nodes = filtered` + `detectChanges()` |
| Non-root delete | `onDelete()` → `detectChanges()` after synchronous `removeMe()` |
| Add child (in-place push) | `onAddChild()` → `detectChanges()` force-reruns `@for` with current array |
| Indeterminate checkbox | `onChange()` → `detectChanges()` re-renders all nodes with INDETERMINATE state |
| Search, no lazy loads | `applySearch()` → `syncProgress()` clears progress → `detectChanges()` |
| Search with lazy loads | Each match triggers `pushLoad()`; `popLoad()` fires `onPopLoad` → `detectChanges()` |

---

## Files Changed

| File | Change summary |
|---|---|
| `src/app/sp-treeview/model/tree-level-config.ts` | Add `onPopLoad` field; call it in `popLoad()` |
| `src/app/sp-treeview/sp-treeview-node/sp-treeview-node.component.ts` | Inject CDR; define 6 handler arrow fns; assign to context in `ngOnInit()` |
| `src/app/sp-treeview/sp-treeview/sp-treeview.component.ts` | Inject CDR; wire `onPopLoad`; add `detectChanges()` to 5 methods |
| `src/app/sp-treeview/sp-treeview/sp-treeview.component.html` | Minor: ensure `(checkboxSelect)` output binding is correct on `sp-treeview-node` |

**No changes to**: `Node`, `NodeState`, `Config`, `NodeLevelConfig`, `SpTreeviewNodeTemplateContext`, dropdown/overlay components, `app.component.ts`.

---

## Not In Scope

- Converting `Node` to use Angular Signals (public API change, future consideration)
- Packaging as npm library (next phase after stability confirmed)
- Testing the overlay and dropdown variants (same fixes apply, validate manually)
