---
title: Lazy loading
description: Load branches on first expand with per-node spinners, error rows with Retry, and staleness guards.
---

Mark a branch as lazy with `hasChildren: true` and **no `children` key**, and
provide a `loadChildren` callback:

```ts
tree.data = [
  { id: 'canada', label: 'Canada', hasChildren: true },
];

tree.loadChildren = async (node) => {
  const res = await fetch(`/api/regions/${node.id}/children`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // TreeNodeData[]
};
```

Try it live in the [Lazy loading & errors demo](/sp-treeview-v2/#demos).

## What happens on expand

Expanding a lazy node:

1. shows a per-node **spinner** (the row gets `aria-busy`);
2. calls `loadChildren(node)`;
3. on **resolve** — attaches the children, expands the node, and re-applies
   **cascade** (a checked parent checks the newly-loaded children) and any
   **active filter** to the new subtree;
4. on **reject** — the node stays collapsed and shows an inline **error row
   with a Retry button**; the element also fires `sp-load-error` with
   `{ node, error }`.

## Caching: `loadOnce`

With `loadOnce: true` (the **default**) children are cached — re-expanding
does not re-fetch. Set `loadOnce = false` (via the property) to re-fetch and
replace children on every expand:

```ts
tree.loadOnce = false; // property, not attribute — the default is true
```

## Guards you get for free

These edge cases are handled by the store (and unit-tested):

- **Concurrent expands** of an already-loading node are a no-op — one fetch.
- **Collapse during load** keeps the fetch in flight but cancels the
  auto-expand, so the node doesn't pop open when the promise resolves.
- **Staleness**: if `setData()` replaces the tree while a load is in flight,
  the late resolve/reject is discarded — no writes into the new tree.
- **Search never triggers lazy loads** — filtering matches loaded nodes only,
  so a keystroke can't fan out into N network requests.

## Empty vs. lazy vs. leaf

Don't use `children: []` as the lazy marker (that was the v3 convention — see
the [migration guide](/sp-treeview-v2/reference/migration/)):

| Shape | Meaning |
|---|---|
| `children` absent | Leaf — no expander |
| `children: []` | Loaded branch that is genuinely empty |
| `hasChildren: true`, no `children` | Lazy — expanding calls `loadChildren` |
