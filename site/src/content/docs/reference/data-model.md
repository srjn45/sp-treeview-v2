---
title: Data model
description: TreeNodeData — the plain-object node shape shared by the core and the elements.
---

Both packages consume the same plain-object node shape:

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

The data is **consumer-owned and treated as immutable** — the store never
writes view state (checked/expanded/loading) onto your objects.

## Branch shapes

| Shape | Meaning |
|---|---|
| `children` absent, `hasChildren` unset/false | **Leaf** — not expandable |
| `children: [ … ]` (incl. `children: []`) | **Loaded branch** — `[]` renders as expandable-empty |
| `hasChildren: true`, `children` absent | **Lazy branch** — expanding triggers `loadChildren` |

## `id` uniqueness

`id` **must be unique across the whole tree** — not just among siblings. The
store's constructor (and `addNode`) throw `Error: Duplicate node id: "<id>"`
otherwise. This is what fixes the legacy v3 delete-by-`value` bug where
duplicate values deleted each other's siblings.

If your backend has no natural ids, derive one from the path
(`'india/mh/mumbai'`) or generate one at fetch time.

## `value` payload

`value?: T` is an opaque payload for your own use (database keys, full DTOs,
…). The store and elements never read it; it comes back to you in events and
`getChecked()` results:

```ts
interface Region { code: string; population: number }

const data: TreeNodeData<Region>[] = [
  { id: 'mum', label: 'Mumbai', value: { code: 'MUM', population: 20_000_000 } },
];

tree.addEventListener('sp-change', (e) => {
  const codes = e.detail.checked.map((n) => n.value?.code);
});
```

## `disabled`

Disabled nodes render greyed out, are skipped by pointer/keyboard toggling,
and are **excluded from cascade** — checking a parent does not check its
disabled descendants, and a parent counts as "all checked" when all of its
*enabled* children are checked.
