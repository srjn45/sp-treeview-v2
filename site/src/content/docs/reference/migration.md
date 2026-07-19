---
title: Migrating from v3 (Angular) to v4
description: Map the legacy Angular SpTreeviewModule concepts to the v4 headless core and Web Components.
---

sp-treeview **v4 is a ground-up rewrite**: a framework-agnostic state engine
(`@sp-treeview/core`) plus native Web Components (`@sp-treeview/element`).
There is **no Angular `SpTreeviewModule`** anymore. The legacy Angular/Material
implementation still exists in the repo but is **frozen** — no new features,
no bug fixes.

:::note[Why the rewrite]
The legacy `Node` class mixed your data with per-widget view state
(`checked`/`collapsed`/`hidden`/`progress`), a `_config` back-reference, and
change-detection callbacks. That coupling caused the lazy-render,
stuck-progress, radio-not-persisting, and delete-by-`value` bugs. v4 keeps
**all view state in the store, keyed by `id`**, and never mutates your data.
:::

## The three breaking model changes

### 1. `children: []` → `hasChildren: true` (lazy marker)

The legacy convention overloaded `children` (`null` = leaf, `[]` = lazy,
array = loaded). v4 makes the lazy marker explicit and frees `children: []`
to mean a genuinely empty, loaded branch:

```ts
// v3: lazy branch                      // v4: lazy branch
{ name: 'USA', value: 'usa',            { id: 'usa', label: 'USA',
  children: [] }                          hasChildren: true }

// v3: leaf                             // v4: leaf
{ name: 'Mumbai', value: 'mumbai',      { id: 'mumbai', label: 'Mumbai' }
  children: null }
```

### 2. `value` (identity) → `id` (required, unique)

Legacy code identified nodes by `value` and matched by equality — two nodes
with the same `value` deleted each other's siblings. v4 requires a string
**`id` unique across the whole tree** (the store throws on duplicates). Your
old `value` becomes the optional, opaque `value?: T` payload.

```ts
// v3
{ name: 'India', value: 'india', children: [ /* … */ ] }
// v4 — `name` → `label`, `value` → required unique `id`
{ id: 'india', label: 'India', value: 'india', children: [ /* … */ ] }
```

### 3. Sentinel "All" node → `allSelected` boolean

Legacy multi-select pushed a synthetic `new Node('All', 'ALL')` into the
`change` payload when everything was checked. v4's `sp-change` reports the
**concrete checked nodes plus an `allSelected` flag**:

```ts
// v3 (Angular @Output)
change.subscribe((nodes: Node[]) => {
  const all = nodes.some(n => n.value === 'ALL');   // sentinel detection
});

// v4 (Web Component event)
el.addEventListener('sp-change', (e) => {
  const { checked, allSelected } = (e as CustomEvent).detail;
});
```

## Data model mapping

| Legacy (`Node` / `NodeLike`) | v4 (`TreeNodeData`) |
|---|---|
| `name` | `label` |
| `value` (identity) | `id` (required, unique) — plus optional `value?` payload |
| `children: []` (lazy) | `hasChildren: true` (children absent) |
| `children: null` (leaf) | `children` absent |
| `children: [Node…]` | `children: [ … ]` |
| `nodeState.checked` (`1`/`0`/`-1`) | store-managed `Row.checked` (`'checked'`/`'unchecked'`/`'indeterminate'`) — **not on your data** |
| `nodeState.collapsed` | store expansion (`initialExpanded`, `expand()`); `Row.expanded` |
| `nodeState.disabled` | `disabled?: boolean` |
| `nodeState.hidden` | *(removed)* — filtering drops nodes from `rows()` instead |
| `progress` | store-managed `Row.loading` |
| `Node.fromJson()` / `toNodeArray()` | *(removed)* — plain objects, no class instances |
| `Node.parent`, `_config`, `setConfigRecursively()` | *(removed)* — the store holds structure/state |

## Config mapping

| Legacy config | v4 |
|---|---|
| `TreeLevelConfig.select` = `SELECT_NONE`/`SELECT_CHECKBOX`/`SELECT_RADIO` | `selection` = `'none'`/`'multi'`/`'single'` |
| `TreeLevelConfig.loadOnce` | `loadOnce` option / `load-once` attribute |
| `TreeLevelConfig.allNode` | `<sp-tree>` `show-all-node` attribute |
| `TreeLevelConfig.search` | `<sp-tree>` `searchable` attribute |
| `TreeLevelConfig.deleteNode` / `addChild`, `NodeLevelConfig` | *(no built-in add/delete UI)* — use `store.addNode()`/`removeNode()` + `renderNode` |
| `cascade` (implicit, always on) | `cascade` option (default `true`, can disable) |

## Events & API mapping

| Legacy | v4 |
|---|---|
| `<sp-treeview>` component | `<sp-tree>` element |
| dropdown / overlay components | `<sp-tree-select variant="dropdown" \| "overlay">` |
| `@Output() change` (with `ALL` sentinel) | `sp-change` event — `{ checked, allSelected }` (multi) / `{ selected }` (single) |
| `@Output() loadChildren` + `node.loadChildren(children)` | `loadChildren: (node) => Promise<TreeNodeData[]>` property |
| `@Output() delete` + `Node.removeMe()` | `store.removeNode(id)` |
| `@Output() addChild` + `Node.addChild(node)` | `store.addNode(parentId, node)` |
| `getSelectedValues()` | `store.getChecked()` / `getCheckedLeaves()` / `getSelected()` |
| custom node `template` (`TemplateRef`) | `renderNode: (node, ctx) => TemplateResult` |

## Behavioural differences worth knowing

- **Collapsed/filtered rows are not in the DOM.** Legacy hid them with
  `nodeState.hidden`; v4 omits them from `rows()`.
- **Search never triggers lazy loads.** Legacy `filter()` called
  `loadChildren` for every empty branch.
- **Selection persists in single mode** — `select(id)` is stored and
  returned by `getSelected()`.
- **No `Node` class / `fromJson`.** Pass plain objects; the store treats them
  as immutable.

## Not yet ported

An Angular wrapper package and a built-in add/delete-node UI are follow-ups.
For now, drive add/remove through `store.addNode` / `store.removeNode` and
render custom controls via `renderNode`.
