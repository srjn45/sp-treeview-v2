---
title: TreeStore API
description: Constructor options, reads, commands, reactivity, and the tested semantics of @sp-treeview/core.
---

The headless state engine behind the elements. Zero runtime dependencies,
strict TypeScript, ES2022 modules.

```ts
import {
  TreeStore,
  VERSION,
  type TreeNodeData,
  type Row,
  type CheckedState,
  type SelectionMode,
  type TreeStoreOptions,
  type TreeChangeEvent,
} from '@sp-treeview/core';
```

## Constructor

```ts
new TreeStore<T>(options: TreeStoreOptions<T>)

interface TreeStoreOptions<T = unknown> {
  data: TreeNodeData<T>[];
  selection?: SelectionMode;          // 'none' | 'single' | 'multi' — default 'none'
  cascade?: boolean;                  // default true (multi only)
  loadChildren?: (node: TreeNodeData<T>) => Promise<TreeNodeData<T>[]>;
  loadOnce?: boolean;                 // default true — cache loaded children
  matcher?: (query: string, node: TreeNodeData<T>) => boolean; // default: case-insensitive substring on label
  initialChecked?: string[];          // multi mode only; disabled ids are ignored
  initialExpanded?: string[];
}
```

Throws `Error: Duplicate node id: "<id>"` if two nodes anywhere in the tree
share an id.

## Reads

| Method | Returns | Notes |
|---|---|---|
| `rows()` | `Row<T>[]` | Flat projection of the **visible** tree. Cached; rebuilt on any change. |
| `getNode(id)` | `TreeNodeData<T> \| undefined` | The consumer node object for `id`. |
| `getChecked()` | `TreeNodeData<T>[]` | Multi: **topmost** fully-checked nodes (a checked parent stands in for its subtree). `[]` outside multi. |
| `getCheckedLeaves()` | `TreeNodeData<T>[]` | Multi: every checked leaf node. `[]` outside multi. |
| `getSelected()` | `TreeNodeData<T> \| null` | Single mode: the selected node, else `null`. |
| `isAllChecked()` | `boolean` | Multi: `true` iff ≥1 enabled node exists and **every** enabled node is checked. Drives the element's `allSelected` flag. |

### The `Row` projection

```ts
interface Row<T = unknown> {
  node: TreeNodeData<T>;
  level: number;       // 1-based; maps to aria-level
  setSize: number;     // aria-setsize
  posInSet: number;    // aria-posinset (1-based)
  expandable: boolean;
  expanded: boolean;
  checked: CheckedState;   // 'checked' | 'unchecked' | 'indeterminate'
  selected: boolean;
  loading: boolean;
  loadError: Error | null;
  matched: boolean;    // this node matched the active filter itself
}
```

Collapsed and filtered-out nodes are **absent** from `rows()` — not hidden
with CSS.

## Commands

```ts
// expansion
store.expand(id);              // lazy node → triggers loadChildren
store.collapse(id);
store.toggleExpanded(id);

// selection (multi)
store.setChecked(id, true);
store.toggleChecked(id);
store.setAllChecked(true);     // check/uncheck all enabled nodes

// selection (single)
store.select(id);              // exactly one selected node

// filtering
store.setFilter('mum');
store.clearFilter();

// lazy loading
store.retryLoad(id);           // re-attempt after a load error

// mutation
store.setData(nextData);                 // replace the tree; resets ALL view state
store.addNode(parentId | null, node);    // parentId null → new root; throws on dup id
store.updateNode(id, { label: '…' });    // shallow patch (id is immutable)
store.removeNode(id);
```

## Reactivity

```ts
const off = store.subscribe((e: TreeChangeEvent) => {
  switch (e.type) {
    case 'rows': /* anything affecting rows() */ break;
    case 'checked': console.log('checked:', e.ids); break;
    case 'selected': console.log('selected:', e.id); break;
    case 'load': console.log(`load ${e.id}: ${e.status}`); break;
  }
});
off(); // unsubscribe

type TreeChangeEvent =
  | { type: 'rows' }
  | { type: 'checked'; ids: string[] }
  | { type: 'selected'; id: string | null }
  | { type: 'load'; id: string; status: 'start' | 'success' | 'error' };
```

A single logical command may emit several events (a check emits `checked`
then `rows`). Most UIs simply re-read `rows()` on any event.

## Semantics (the rules the tests encode)

Each of these corresponds to a verified bug in the legacy v3 widget.

### Cascade checking (multi + `cascade: true`)

- Checking a node checks **all non-disabled descendants**; unchecking
  unchecks them. Disabled subtrees are skipped and excluded from "all
  children checked" counts.
- Ancestor state is recomputed by walking **only the ancestor path** —
  `O(depth × branching)`, never a whole-tree rescan.
- A parent is `indeterminate` iff its enabled children are mixed.
- With `cascade: false`, `setChecked` toggles exactly one node.

### Single selection

`select(id)` sets **exactly one** selected node, clears the previous one, and
persists it (`getSelected()`).

### Lazy loading + staleness

`expand(id)` on a lazy node sets `loading`, calls `loadChildren(node)`, then
on resolve attaches children, expands, and re-applies cascade and the active
filter to the new subtree; on reject sets `loadError` (node stays collapsed;
`retryLoad(id)` re-attempts). Guards: concurrent expand is a no-op; collapse
during load cancels the auto-expand; a resolve arriving after `setData()` is
discarded (epoch token); `loadOnce: false` re-fetches on every expand.

### Filtering

Matches **loaded nodes only** — never triggers `loadChildren`. A match
reveals and expands its ancestors; non-matching subtrees drop out of
`rows()`. `clearFilter()` restores the pre-filter expansion snapshot.
