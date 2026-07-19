# @sp-treeview/core

Framework-agnostic, zero-dependency TypeScript state engine for tree views — the
"headless core" behind [`@sp-treeview/element`](https://www.npmjs.com/package/@sp-treeview/element). It owns the tree
data projection, expansion, multi/single selection with cascade + indeterminate
state, lazy async child loading, and filtering. It renders nothing: you read
`rows()` and drive it with commands from any framework (React, Vue, Svelte,
Angular, plain JS) or from a custom renderer.

- **Zero runtime dependencies.** TypeScript, strict mode.
- All view state lives **in the store, keyed by node id** — never mutated onto
  your data objects, so two stores can share one immutable data array.

**Website, live demos & guides: <https://srjn45.github.io/sp-treeview-v2/>**

```bash
npm install @sp-treeview/core
```

> Version `4.0.0`. Node ≥ 20, ES2022 module output.

---

## Quick start

```ts
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  {
    id: 'india',
    label: 'India',
    children: [
      { id: 'mh', label: 'Maharashtra', children: [
        { id: 'mumbai', label: 'Mumbai' },
        { id: 'pune', label: 'Pune' },
      ] },
    ],
  },
  // hasChildren:true + no `children` key → lazy, not-yet-loaded branch.
  { id: 'usa', label: 'USA', hasChildren: true },
  // children:[] → a loaded branch that happens to be empty (expandable-empty).
  { id: 'empty', label: 'Empty group', children: [] },
];

const store = new TreeStore({
  data,
  selection: 'multi',   // 'none' | 'single' | 'multi'  (default 'none')
  cascade: true,        // parent<->child propagation (multi only, default true)
  loadChildren: async (node) => {
    // Called lazily the first time a `hasChildren` node is expanded.
    return node.id === 'usa'
      ? [{ id: 'ca', label: 'California' }, { id: 'ny', label: 'New York' }]
      : [];
  },
  loadOnce: true,       // cache loaded children (default true)
  initialExpanded: ['india'],
  initialChecked: ['mumbai'],
});

// Re-read rows() on any change and repaint your UI.
const unsubscribe = store.subscribe(() => {
  for (const row of store.rows()) {
    // …render each row (see below)…
  }
});
```

Render straight from the flat `rows()` projection — each row carries everything a
row needs, including the ARIA metadata:

```ts
for (const row of store.rows()) {
  const indent = '  '.repeat(row.level - 1);
  const box = row.checked === 'checked' ? '[x]'
    : row.checked === 'indeterminate' ? '[-]'
    : '[ ]';
  // aria-level=row.level, aria-setsize=row.setSize, aria-posinset=row.posInSet
  console.log(`${indent}${box} ${row.node.label}`);
  if (row.loading) console.log(`${indent}    (loading…)`);
  if (row.loadError) console.log(`${indent}    error: ${row.loadError.message}`);
}
```

---

## Data model

```ts
interface TreeNodeData<T = unknown> {
  id: string;                    // REQUIRED, unique across the ENTIRE tree
  label: string;
  value?: T;                     // your own payload, opaque to the store
  children?: TreeNodeData<T>[];  // present = loaded branch
  hasChildren?: boolean;         // true + children absent = lazy, unloaded branch
  disabled?: boolean;            // skipped by cascade and by keyboard/pointer toggling
}
```

The data is **consumer-owned and treated as immutable** by the store. Three
distinct branch shapes:

| Shape | Meaning |
|---|---|
| `children` absent, `hasChildren` unset/false | **Leaf** — not expandable |
| `children: [ … ]` (incl. `children: []`) | **Loaded branch** — `[]` renders as expandable-empty |
| `hasChildren: true`, `children` absent | **Lazy branch** — expanding triggers `loadChildren` |

`id` **must be unique across the whole tree**. The constructor (and `addNode`)
throw `Error: Duplicate node id: "<id>"` otherwise. This is what fixes the legacy
delete-by-`value` bug where duplicate values deleted siblings.

---

## `TreeStore` API

### Constructor

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

### Reads (all O(1) or cached)

| Method | Returns | Notes |
|---|---|---|
| `rows()` | `Row<T>[]` | Flat projection of the **visible** tree. Cached; rebuilt on any change. |
| `getNode(id)` | `TreeNodeData<T> \| undefined` | The consumer node object for `id`. |
| `getChecked()` | `TreeNodeData<T>[]` | Multi: **topmost** fully-checked nodes (does not descend into a checked subtree). `[]` outside multi. |
| `getCheckedLeaves()` | `TreeNodeData<T>[]` | Multi: every checked leaf node. `[]` outside multi. |
| `getSelected()` | `TreeNodeData<T> \| null` | Single mode: the selected node, else `null`. |
| `isAllChecked()` | `boolean` | Multi: `true` iff ≥1 enabled node exists and **every** enabled node (including lazily-loaded ones) is checked — the exact set `setAllChecked(true)` targets. Drives the element's `allSelected` flag. |

```ts
const topChecked = store.getChecked();       // topmost fully-checked
const checkedLeaves = store.getCheckedLeaves();
const selectedNode = store.getSelected();    // single mode only
const oneNode = store.getNode('india');
const allChecked = store.isAllChecked();
```

### The `Row` projection

```ts
interface Row<T = unknown> {
  node: TreeNodeData<T>;
  level: number;       // 1-based; maps to aria-level
  setSize: number;     // aria-setsize (siblings visible at this level)
  posInSet: number;    // aria-posinset (1-based)
  expandable: boolean;
  expanded: boolean;
  checked: CheckedState;   // 'checked' | 'unchecked' | 'indeterminate'
  selected: boolean;
  loading: boolean;
  loadError: Error | null;
  matched: boolean;    // true when this node matched the active filter itself
}

type CheckedState = 'checked' | 'unchecked' | 'indeterminate';
type SelectionMode = 'none' | 'single' | 'multi';
```

Collapsed and filtered-out nodes are **absent** from `rows()` — not hidden with
CSS — so a renderer that iterates `rows()` never keeps offscreen interactive
targets in the DOM.

### Commands

```ts
// expansion
store.expand(id);              // lazy node → triggers loadChildren (see below)
store.collapse(id);
store.toggleExpanded(id);

// selection (multi)
store.setChecked(id, true);
store.toggleChecked(id);
store.setAllChecked(true);     // check/uncheck all enabled nodes

// selection (single)
store.select(id);              // exactly one selected/checked node

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

### Reactivity

```ts
const off = store.subscribe((e: TreeChangeEvent) => {
  switch (e.type) {
    case 'rows': /* anything affecting rows() */ break;
    case 'checked': console.log('checked changed:', e.ids); break;
    case 'selected': console.log('selected id:', e.id); break;
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

A single logical command may emit several events (e.g. a check emits `checked`
then `rows`). Most UIs simply re-read `rows()` on any event.

---

## Semantics (the rules the tests encode)

These are the guarantees the store is unit-tested against (§3.3 of the design
spec). They exist because each corresponds to a verified bug in the legacy
Angular widget.

### Cascade checking (multi + `cascade: true`)

- Checking a node checks **all non-disabled descendants**; unchecking unchecks
  them. **Disabled** nodes (and their subtrees) are skipped by cascade and
  excluded from "all children checked" counts.
- After a change, ancestor state is recomputed by walking **only the ancestor
  path** (child counts are cached per parent) — `O(depth × branching)`, never a
  whole-tree rescan.
- A parent is `indeterminate` iff its enabled children are mixed; `checked` iff
  all enabled children are checked; otherwise `unchecked`.
- `getChecked()` returns the **topmost** fully-checked nodes (a checked parent
  stands in for its subtree); `getCheckedLeaves()` returns individual leaves.

With `cascade: false`, `setChecked` toggles exactly one node and never
propagates.

### Single selection

`select(id)` sets **exactly one** selected/checked node, clearing the previous
one, and persists it in the store (`getSelected()`), fixing the legacy radio bug
where selection never reached the model.

```ts
const single = new TreeStore({ data, selection: 'single' });
single.select('india');
const chosen = single.getSelected(); // TreeNodeData | null
```

### Lazy loading + staleness

`expand(id)` on a lazy node (`hasChildren: true`, `children === undefined`) with a
`loadChildren` callback:

1. sets `loading` on the row and emits `load: start`;
2. calls `loadChildren(node)`;
3. on **resolve**: attaches the children, clears `loading`, expands the node, and
   re-applies **cascade** (a checked parent checks the new children) and the
   **active filter** to the new subtree; emits `load: success`;
4. on **reject**: sets `loadError` (the node stays collapsed); emits
   `load: error`. `retryLoad(id)` re-attempts (only after a failure).

Guards:

- **Concurrent** `expand` on an already-loading node is a no-op.
- **Collapse during load** keeps the load in flight but cancels the auto-expand,
  so the node does not pop open when the promise resolves.
- **Staleness:** a resolve/reject that arrives after `setData()` replaced the
  tree is discarded (an internal epoch token) — no writes to the new tree.
- With `loadOnce: true` (default) children are cached and a re-expand does not
  re-load; with `loadOnce: false` each expand re-fetches and replaces them.

### Filtering

- Matches **loaded nodes only** — filtering **never** triggers `loadChildren`
  (this kills the legacy unbounded lazy fan-out).
- A match reveals and expands **all its ancestors**; non-matching subtrees drop
  out of `rows()` entirely (they are not CSS-hidden). `row.matched` marks the
  direct matches so the UI can highlight them.
- The default matcher is a case-insensitive substring test on `label`; pass
  `matcher` to override:

  ```ts
  const byPrefix = new TreeStore({
    data,
    matcher: (query, node) => node.label.toLowerCase().startsWith(query.toLowerCase()),
  });
  byPrefix.setFilter('mum');
  ```

- `clearFilter()` restores the **pre-filter expansion state** (a snapshot taken
  at the first `setFilter`). An empty result set makes `rows()` return `[]` so the
  UI can show its empty state.

---

## Types

All exported from the package root:

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

## License

MIT. Part of [sp-treeview v4](https://github.com/srjn45/sp-treeview-v2).
