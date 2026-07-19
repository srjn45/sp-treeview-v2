---
title: Quickstart
description: A working multi-select tree with lazy loading in under a minute.
---

Install the elements:

```bash
npm install @sp-treeview/element
```

Add the element to your markup. Primitive inputs (`selection`, `searchable`,
`cascade`, …) work as attributes:

```html
<sp-tree selection="multi" searchable></sp-tree>
```

Wire it up. **Object and function inputs (`data`, `loadChildren`, `renderNode`,
`store`) are DOM properties** — set them from JS, not as string attributes:

```ts
import '@sp-treeview/element';
import type { TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
];

const tree = document.querySelector('sp-tree')!;
tree.data = data;
tree.loadChildren = async (node) =>
  node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];

tree.addEventListener('sp-change', (e) => {
  const { checked, allSelected } = (e as CustomEvent<{
    checked: TreeNodeData[]; allSelected: boolean;
  }>).detail;
  console.log(checked.map((n) => n.label), allSelected);
});
```

That's a complete, accessible, searchable, lazily-loading multi-select tree.

## The three data shapes

Every node needs a **unique `id`** (across the whole tree) and a `label`. The
`children` / `hasChildren` combination decides the node's behavior:

| Shape | Meaning |
|---|---|
| `children` absent | **Leaf** — not expandable |
| `children: [ … ]` (including `[]`) | **Loaded branch** — `[]` renders as expandable-empty |
| `hasChildren: true`, `children` absent | **Lazy branch** — expanding calls `loadChildren` |

## A select field instead

Want a form control rather than an inline tree? Same data, same events:

```html
<sp-tree-select selection="multi" searchable placeholder="Pick regions…"></sp-tree-select>
```

```ts
const select = document.querySelector('sp-tree-select')!;
select.data = data;
select.loadChildren = loadChildren;
```

The field shows the selection as removable chips and participates in native
forms. See [The select field](/sp-treeview-v2/guides/tree-select/).

## Where next

- Using a framework? [React](/sp-treeview-v2/guides/react/) ·
  [Vue 3](/sp-treeview-v2/guides/vue/) ·
  [Plain HTML](/sp-treeview-v2/guides/plain-html/)
- Restyle it: [Theming](/sp-treeview-v2/guides/theming/)
- Full APIs: [`<sp-tree>`](/sp-treeview-v2/reference/sp-tree/) ·
  [`TreeStore`](/sp-treeview-v2/reference/tree-store/)
