---
title: What is sp-treeview?
description: A framework-agnostic tree view for the web — a zero-dependency headless state engine plus native Web Components.
---

sp-treeview is a tree view for the web that works **everywhere**: a
zero-dependency headless state engine plus native Web Components you can drop
into React, Vue, Svelte, Angular, or plain HTML — with a fully overridable
theme.

It ships as two packages:

| Package | What it is |
|---|---|
| `@sp-treeview/core` | Zero-dependency TypeScript state engine (`TreeStore`) — data projection, cascade/indeterminate selection, lazy loading, filtering. Renders nothing. |
| `@sp-treeview/element` | Native Web Components `<sp-tree>` (inline tree) and `<sp-tree-select>` (dropdown/overlay form field), built on [Lit](https://lit.dev) over the core. |

Because `<sp-tree>` and `<sp-tree-select>` are standard custom elements, there
are **no per-framework wrapper packages** — the same element works in every
stack.

## Features

- Tree view with unlimited nesting, rendered as a cheap flat indented list —
  collapsed and filtered-out rows are **not in the DOM**.
- Multi-select (checkbox) with **cascade + indeterminate** state, or
  single-select (radio); optional "All" row.
- **Lazy loading** with per-node spinners, inline error rows with Retry, and
  staleness guards.
- **Search/filter** that reveals matches with their ancestors and never
  triggers lazy loads.
- Dropdown or overlay **select field with removable chips**; form-associated —
  works in plain `<form>`s.
- **WAI-ARIA tree pattern**: roles, `aria-*` attributes, roving tabindex, full
  keyboard navigation, type-ahead.
- **Fully themeable** via `--sp-tree-*` CSS custom properties and `::part()` —
  light and dark defaults built in. Custom-drawn checkboxes/radios, no Material
  dependency.

Try everything live on the [home page](/sp-treeview-v2/#demos).

## Architecture in one paragraph

All view state (checked, expanded, loading, filter) lives **in the store, keyed
by node id** — it is never mutated onto your data objects, so your data stays
immutable and two widgets can even share one data array. The UI is a thin
renderer over the store's flat `rows()` projection. You can use the elements
as-is, or take `@sp-treeview/core` alone and build your own renderer — see
[Headless core](/sp-treeview-v2/guides/headless-core/).

## About v4

v4 is a **ground-up rewrite** of the original Angular/Material plugin
(`sp-treeview-v2` v3). The legacy Angular implementation is frozen — no new
features, no bug fixes — and its known defects (lazy nodes not rendering, stuck
search progress, radio selection not persisting, delete-by-value deleting
siblings) are structurally fixed in v4. Coming from v3? Read the
[migration guide](/sp-treeview-v2/reference/migration/).

> Current version: `4.0.0-alpha.0` · Node ≥ 20 · ESM only · MIT license.
