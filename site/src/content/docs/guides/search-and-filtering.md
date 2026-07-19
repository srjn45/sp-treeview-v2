---
title: Search & filtering
description: The built-in search box, match highlighting, and the filtering semantics behind them.
---

Add the built-in search box with the `searchable` attribute:

```html
<sp-tree selection="multi" searchable></sp-tree>
```

Typing filters the tree (debounced), highlights matching text, and shows an
empty state when nothing matches. Try it in the
[hero demo](/sp-treeview-v2/) — search for `mu`.

## Semantics

- A match reveals and expands **all of its ancestors**, so you always see
  where a result lives.
- Non-matching subtrees are **dropped from the DOM entirely** — not hidden
  with CSS — so large filtered trees stay cheap and there are no invisible
  tab stops.
- Filtering matches **loaded nodes only** and **never triggers lazy loads**
  (the legacy v3 behavior of firing `loadChildren` for every unloaded branch
  is gone by design).
- Clearing the search restores the **pre-search expansion state**.
- Direct matches are wrapped in a `<mark part="match">` — style it with
  `sp-tree::part(match)`.

## Custom matching (headless)

The element's search box uses the store's default matcher: a case-insensitive
substring test on `label`. When driving the store yourself you can filter
programmatically and swap the matcher:

```ts
import { TreeStore } from '@sp-treeview/core';

const store = new TreeStore({
  data,
  // prefix match instead of substring
  matcher: (query, node) =>
    node.label.toLowerCase().startsWith(query.toLowerCase()),
});

store.setFilter('mum');
store.clearFilter();
```

You can pass such a store straight to the element via its `store` property —
the search box then uses your matcher:

```ts
document.querySelector('sp-tree').store = store;
```

## Styling the search UI

Relevant `::part()` names: `search`, `search-input`, `search-clear`, `match`,
`empty`.

```css
sp-tree::part(search-input) { border-radius: 999px; }
sp-tree::part(match) { background: gold; }
```
