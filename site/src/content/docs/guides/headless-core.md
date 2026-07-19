---
title: Headless core
description: Use @sp-treeview/core's TreeStore alone and render the tree with any framework or none.
---

`@sp-treeview/core` is a framework-agnostic, **zero-dependency** TypeScript
state engine. It owns the tree data projection, expansion, multi/single
selection with cascade + indeterminate state, lazy loading, and filtering —
and renders **nothing**. You read `rows()` and drive it with commands from any
framework, or from a custom renderer.

```bash
npm install @sp-treeview/core
```

## The loop

1. Create a `TreeStore` with your data and options.
2. `subscribe()` to changes.
3. On any change, re-read `rows()` — a flat projection of the **visible**
   tree — and repaint.
4. Translate user input into store commands (`toggleExpanded`,
   `toggleChecked`, `setFilter`, …).

```ts
import { TreeStore, type TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [
      { id: 'mumbai', label: 'Mumbai' },
      { id: 'pune', label: 'Pune' },
    ] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy
];

const store = new TreeStore({
  data,
  selection: 'multi',
  cascade: true,
  loadChildren: async (node) =>
    node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [],
  initialExpanded: ['india'],
  initialChecked: ['mumbai'],
});

const unsubscribe = store.subscribe(() => render(store.rows()));

function render(rows) {
  for (const row of rows) {
    const indent = '  '.repeat(row.level - 1);
    const box = row.checked === 'checked' ? '[x]'
      : row.checked === 'indeterminate' ? '[-]'
      : '[ ]';
    console.log(`${indent}${box} ${row.node.label}`);
  }
}
```

Each `Row` carries everything a renderer needs — including ARIA metadata
(`level`, `setSize`, `posInSet`), `expanded`, `checked`, `loading`,
`loadError`, and `matched`. Collapsed and filtered-out nodes are **absent**
from `rows()`, so a renderer that iterates it never keeps offscreen
interactive targets in the DOM.

## Why the store never touches your data

All view state lives in the store, **keyed by node id** — never mutated onto
your data objects. That means:

- your data can be `const`, frozen, or shared between two stores;
- replacing the data (`setData`) cleanly resets all view state;
- there are no hidden back-references or class instances — plain objects in,
  plain objects out.

## Mixing headless and elements

The element accepts a pre-built store via its `store` property — useful for
initial expansion/selection, a custom `matcher`, or sharing one store between
your own UI and an `<sp-tree>`:

```ts
document.querySelector('sp-tree').store = store;
```

When `store` is set, the element ignores its own `data` / `selection` /
`cascade` / `loadOnce` / `loadChildren` inputs and drives yours.

Full command/event surface: [TreeStore API](/sp-treeview-v2/reference/tree-store/).
