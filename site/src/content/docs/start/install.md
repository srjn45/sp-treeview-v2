---
title: Install
description: Install @sp-treeview/element (the Web Components) or @sp-treeview/core (the headless engine) in any project.
---

sp-treeview ships as two ESM packages. Most projects want the elements:

```bash
# the Web Components — <sp-tree> and <sp-tree-select>
# (pulls in @sp-treeview/core, lit, and @floating-ui/dom automatically)
npm install @sp-treeview/element
```

If you are building your own renderer, the headless engine has **zero runtime
dependencies**:

```bash
npm install @sp-treeview/core
```

> Requirements: Node ≥ 20 for tooling; any evergreen browser at runtime.
> Both packages are **ESM only**. Current version: `4.0.0-alpha.0`.

## Register the elements

Importing the element package registers `<sp-tree>` and `<sp-tree-select>` as
a side effect — do it once, anywhere before first use:

```ts
import '@sp-treeview/element';
```

## Without a bundler

Plain HTML pages can load everything from a CDN with an import map:

```html
<script type="importmap">
  { "imports": {
    "lit": "https://esm.sh/lit@3",
    "@floating-ui/dom": "https://esm.sh/@floating-ui/dom@1",
    "@sp-treeview/core": "https://esm.sh/@sp-treeview/core@4.0.0-alpha.0",
    "@sp-treeview/element": "https://esm.sh/@sp-treeview/element@4.0.0-alpha.0"
  } }
</script>
<script type="module">
  import '@sp-treeview/element';
</script>
```

See [Plain HTML / JS](/sp-treeview-v2/guides/plain-html/) for a complete page.

## TypeScript

Both packages ship their own type declarations. The types you will use most:

```ts
import type { TreeNodeData, Row, TreeStoreOptions } from '@sp-treeview/core';
import type { SpTree, SpTreeSelect } from '@sp-treeview/element';
```

Next: the [Quickstart](/sp-treeview-v2/start/quickstart/).
