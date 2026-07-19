# sp-treeview-v2

> **v3 of this package is the sp-treeview v4 rewrite.** Versions `≤ 2.2.1` were
> an Angular (2/4/5) plugin; that line is **frozen** — no new features, no bug
> fixes. The project has been rewritten from the ground up as a
> **zero-dependency headless core + native Web Components** that work in React,
> Vue, Svelte, Angular, or plain HTML.

**Website, live demos & guides: <https://srjn45.github.io/sp-treeview-v2/>**

This package is a **compatibility alias**: it simply re-exports the new
packages so the historical name keeps working.

| Install this instead | What it is |
|---|---|
| [`@sp-treeview/element`](https://www.npmjs.com/package/@sp-treeview/element) | `<sp-tree>` and `<sp-tree-select>` Web Components (Lit) |
| [`@sp-treeview/core`](https://www.npmjs.com/package/@sp-treeview/core) | Zero-dependency headless `TreeStore` state engine |

## Usage via this alias

```bash
npm install sp-treeview-v2
```

```ts
// Registers <sp-tree> and <sp-tree-select> as a side effect.
import { TreeStore, type TreeNodeData } from 'sp-treeview-v2';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
];

const tree = document.querySelector('sp-tree')!;
tree.data = data;
```

```html
<sp-tree selection="multi" searchable></sp-tree>
```

Everything else — attributes, events, theming tokens, `::part()` names,
framework recipes — is documented on the
[website](https://srjn45.github.io/sp-treeview-v2/) and in the
[`@sp-treeview/element` README](https://www.npmjs.com/package/@sp-treeview/element).

## Coming from `2.x` (the Angular plugin)?

The API is completely different — read the
[migration guide](https://srjn45.github.io/sp-treeview-v2/reference/migration/).
The verified defects of the legacy plugin (lazy nodes not rendering, stuck
search progress, radio selection not persisting, delete-by-`value` deleting
siblings) are fixed in the rewrite.

## License

MIT. Source: <https://github.com/srjn45/sp-treeview-v2>
