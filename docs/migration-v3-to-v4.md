# Migrating from v3 (Angular) to v4

sp-treeview **v4 is a ground-up rewrite**: a framework-agnostic state engine
([`@sp-treeview/core`](../packages/core)) plus native Web Components
([`@sp-treeview/element`](../packages/element)). There is **no Angular
`SpTreeviewModule`** anymore. The legacy Angular/Material implementation under
`src/app/sp-treeview/` still exists but is **frozen** — no new features, no bug
fixes. This guide maps the old concepts to their v4 equivalents.

> Why the rewrite: the legacy `Node` class mixed your data with per-widget view
> state (`checked`/`collapsed`/`hidden`/`progress`), a `_config` back-reference,
> and change-detection callbacks. That coupling caused the lazy-render,
> stuck-progress, radio-not-persisting, and delete-by-`value` bugs. v4 keeps
> **all view state in the store, keyed by `id`**, and never mutates your data.

---

## The three breaking model changes

### 1. `children: []` → `hasChildren: true` (lazy marker)

The legacy convention overloaded `children`:

| Legacy `Node.children` | Meaning |
|---|---|
| `null` (or omitted) | leaf |
| `[]` (empty array) | **lazy** branch — expanding fires the `loadChildren` event |
| `[Node, …]` | loaded branch |

v4 makes the lazy marker explicit and frees `children: []` to mean a genuinely
empty (but loaded) branch:

| v4 `TreeNodeData` | Meaning |
|---|---|
| `children` absent | leaf |
| `hasChildren: true` (children absent) | **lazy** branch — expanding calls `loadChildren` |
| `children: []` | loaded branch that is empty (expandable-empty) |
| `children: [ … ]` | loaded branch |

```ts
// v3: lazy branch
{ name: 'USA', value: 'usa', children: [] }
// v4: lazy branch
{ id: 'usa', label: 'USA', hasChildren: true }

// v3: leaf
{ name: 'Mumbai', value: 'mumbai', children: null }
// v4: leaf
{ id: 'mumbai', label: 'Mumbai' }
```

### 2. `value` (identity) → `id` (required, unique)

Legacy code identified nodes by `value` and matched by equality — so two nodes
with the same `value` deleted each other's siblings and broke `track`. v4
requires a string **`id` that is unique across the whole tree**; the store throws
`Duplicate node id: "…"` on construction or `addNode` otherwise. Your old `value`
becomes the optional, opaque `value?: T` payload (or just fold it into `id`).

```ts
// v3
{ name: 'India', value: 'india', children: [ … ] }
// v4  — `name` → `label`, `value` → required unique `id` (keep `value` if you need the payload)
{ id: 'india', label: 'India', value: 'india', children: [ … ] }
```

### 3. Sentinel "All" node → `allSelected` boolean

Legacy multi-select emitted `change` with a synthetic `new Node('All', 'ALL')`
in the array when everything was checked, so consumers had to detect the sentinel
`value === 'ALL'`. v4's `sp-change` reports the **concrete checked nodes plus an
`allSelected` flag** — no sentinel to special-case.

```ts
// v3 (Angular @Output)
change.subscribe((nodes: Node[]) => {
  const all = nodes.some(n => n.value === 'ALL');   // sentinel detection
});

// v4 (Web Component event)
el.addEventListener('sp-change', (e) => {
  const { checked, allSelected } = (e as CustomEvent).detail; // checked: TreeNodeData[]
});
```

---

## Data model mapping

| Legacy (`Node` / `NodeLike`) | v4 (`TreeNodeData`) |
|---|---|
| `name` | `label` |
| `value` (identity) | `id` (required, unique) — plus optional `value?` for payload |
| `children: []` (lazy) | `hasChildren: true` (children absent) |
| `children: null` (leaf) | `children` absent |
| `children: [Node…]` | `children: [ … ]` |
| `nodeState.checked` (`CHECKED`/`UNCHECKED`/`INDETERMINATE` = `1`/`0`/`-1`) | store-managed `Row.checked` (`'checked'`/`'unchecked'`/`'indeterminate'`) — **not on your data** |
| `nodeState.collapsed` | store expansion (`initialExpanded`, `expand()`); `Row.expanded` |
| `nodeState.disabled` | `disabled?: boolean` |
| `nodeState.hidden` | *(removed)* — filtering drops nodes from `rows()` instead of hiding them |
| `progress` | store-managed `Row.loading` |
| `Node.fromJson()` / `toNodeArray()` | *(removed)* — v4 data is plain objects, no class instances |
| `Node.parent`, `_config`, `setConfigRecursively()` | *(removed)* — the store holds structure/state |

```ts
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  {
    id: 'india',                 // was `value` — now a REQUIRED, unique id
    label: 'India',              // was `name`
    children: [                  // loaded branch (unchanged shape)
      { id: 'mumbai', label: 'Mumbai' },      // leaf: no children key (was children: null)
    ],
  },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy: was children: []
];
```

---

## Config mapping (`Config` / `TreeLevelConfig` → options & attributes)

| Legacy config | v4 |
|---|---|
| `TreeLevelConfig.select` = `SELECT_NONE`/`SELECT_CHECKBOX`/`SELECT_RADIO` | `selection` = `'none'`/`'multi'`/`'single'` |
| `TreeLevelConfig.loadOnce` | `loadOnce` option / `load-once` attribute |
| `TreeLevelConfig.allNode` | `<sp-tree>` `show-all-node` attribute |
| `TreeLevelConfig.search` | `<sp-tree>` `searchable` attribute |
| `TreeLevelConfig.deleteNode` / `addChild`, `NodeLevelConfig` | *(no built-in add/delete UI)* — use `store.addNode()`/`removeNode()` and `renderNode` for custom controls |
| `cascade` (implicit, always on) | `cascade` option (default `true`, can disable) |

```ts
const store = new TreeStore({
  data,
  selection: 'multi',            // SELECT_CHECKBOX → 'multi', SELECT_RADIO → 'single', SELECT_NONE → 'none'
  cascade: true,
  loadOnce: true,                // TreeLevelConfig.loadOnce → loadOnce; allNode → element `showAllNode`
  loadChildren: async (node) => (node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : []),
});
```

---

## Events & API mapping

| Legacy | v4 |
|---|---|
| `<sp-treeview>` component | `<sp-tree>` element |
| dropdown / overlay components | `<sp-tree-select variant="dropdown" \| "overlay">` |
| `@Output() change: EventEmitter<Node[]>` (with `ALL` sentinel) | `sp-change` event, `detail: { checked, allSelected }` (multi) / `{ selected }` (single) |
| `@Output() loadChildren` + `node.loadChildren(children)` | `loadChildren: (node) => Promise<TreeNodeData[]>` option / property |
| `@Output() delete` + `Node.removeMe()` | `store.removeNode(id)` |
| `@Output() addChild` + `Node.addChild(node)` | `store.addNode(parentId, node)` |
| `getSelectedValues()` | `store.getChecked()` / `getCheckedLeaves()` / `getSelected()` |
| `nodeState.checked` reads | `store.rows()[i].checked` |
| custom node `template` (`TemplateRef`) | `renderNode: (node, ctx) => TemplateResult` |

```ts
// getSelectedValues() → getChecked()/getCheckedLeaves()/getSelected()
const checked: TreeNodeData[] = store.getChecked();
// The legacy sentinel `new Node('All', 'ALL')` in the change payload is gone:
const allSelected: boolean = store.isAllChecked();

// Node.addChild / removeMe → store commands
store.addNode('india', { id: 'pune', label: 'Pune' }); // was parent.addChild(node)
store.removeNode('pune');                               // was node.removeMe()
store.updateNode('india', { label: 'Republic of India' });
```

---

## Behavioural differences worth knowing

- **Collapsed/filtered rows are not in the DOM.** Legacy hid them with
  `nodeState.hidden`; v4 omits them from `rows()`. There are no offscreen
  interactive/tab targets, and big trees stay cheap.
- **Search never triggers lazy loads.** Legacy `filter()` called `loadChildren`
  for every empty branch (unbounded fan-out); v4 filtering matches only
  already-loaded nodes.
- **Selection persists in single mode.** The legacy radio bug (selection never
  reaching the model) is gone — `select(id)` is stored and returned by
  `getSelected()`.
- **No `Node` class / `fromJson`.** Pass plain objects; the store treats them as
  immutable and never writes view state back onto them.

## Not yet ported

An Angular wrapper package and built-in add/delete node UI are follow-ups (see
the design spec §7). For now, drive add/remove through `store.addNode` /
`store.removeNode` and render custom controls via `renderNode`.
