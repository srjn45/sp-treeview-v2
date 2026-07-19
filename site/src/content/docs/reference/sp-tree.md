---
title: <sp-tree> API
description: Properties, attributes, events, keyboard interaction, and parts of the inline tree element.
---

An inline, WAI-ARIA tree with checkbox/radio selection, lazy loading, and a
built-in search box. Renders the store's `rows()` as a **flat, indented
list** — collapsed and filtered-out rows are not in the DOM.

```ts
import '@sp-treeview/element';          // registers the element
import { SpTree } from '@sp-treeview/element'; // the class, for typing
```

## Properties & attributes

Object/function inputs (`data`, `loadChildren`, `renderNode`, `store`) are DOM
**properties** — set them via JS/framework binding, not string attributes.
Primitive inputs also have a reflected attribute.

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `data` | — | `TreeNodeData[]` | `[]` | The tree data ([data model](/sp-treeview-v2/reference/data-model/)). |
| `selection` | `selection` | `'none' \| 'single' \| 'multi'` | `'none'` | Selection mode. |
| `cascade` | `cascade` | `boolean` | `true` | Parent↔child propagation (multi). |
| `loadOnce` | `load-once` | `boolean` | `true` | Cache lazily-loaded children. |
| `loadChildren` | — | `(node) => Promise<TreeNodeData[]>` | — | Lazy loader for `hasChildren` nodes. |
| `searchable` | `searchable` | `boolean` | `false` | Render the built-in search box. |
| `showAllNode` | `show-all-node` | `boolean` | `false` | Render a top "All" row wired to `setAllChecked`. |
| `renderNode` | — | `(node, ctx) => TemplateResult` | — | Custom row content (Lit template); `ctx` is `{ row, store }`. |
| `store` | — | `TreeStore` | — | Use an existing store; `data`/`selection`/`cascade`/`loadOnce`/`loadChildren` are then ignored. |

:::caution
`cascade` and `loadOnce` default to `true`. Because they are boolean
attributes, set them to `false` through the **property** (`el.loadOnce =
false`), not by omitting the attribute.
:::

## Events

All events are `composed`, bubbling `CustomEvent`s.

| Event | `detail` | Fires |
|---|---|---|
| `sp-change` | multi: `{ checked: TreeNodeData[], allSelected: boolean }` · single: `{ selected: TreeNodeData \| null }` | On any selection change. |
| `sp-expand` | `{ node: TreeNodeData }` | A row expands. |
| `sp-collapse` | `{ node: TreeNodeData }` | A row collapses. |
| `sp-load-error` | `{ node: TreeNodeData, error: Error }` | A lazy load rejects. |

The multi-mode `sp-change` reports the concrete checked nodes plus
`allSelected` — there is **no sentinel "ALL" node** in the payload (that was
v3; see [migration](/sp-treeview-v2/reference/migration/)).

## Keyboard interaction

The full WAI-ARIA tree pattern with a roving tabindex:

| Key | Action |
|---|---|
| `↓` / `↑` | Move focus to the next / previous visible row |
| `→` | Expand a collapsed branch, else move into the first child |
| `←` | Collapse an expanded branch, else move to the parent |
| `Home` / `End` | First / last visible row |
| `Enter` / `Space` | Toggle check (multi) / select (single) |
| *printable characters* | Type-ahead to the next matching label |

ARIA: `role="tree"`/`treeitem`, `aria-level`, `aria-setsize`,
`aria-posinset`, `aria-expanded`, `aria-checked` (including `"mixed"`),
`aria-disabled`, `aria-busy`.

## `::part()` names

`tree`, `row`, `all-row`, `toggle`, `checkbox`, `radio`, `label`, `match`,
`spinner`, `error`, `retry`, `search`, `search-input`, `search-clear`,
`empty`.

```css
sp-tree::part(row) { padding-block: 2px; }
sp-tree::part(match) { background: gold; }
```

Tokens and a worked dark theme: [Theming](/sp-treeview-v2/guides/theming/).
