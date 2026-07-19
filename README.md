# sp-treeview

A framework-agnostic tree view for the web: a **zero-dependency headless state
engine** plus **native Web Components** you can drop into React, Vue, Svelte,
Angular, or plain HTML — with a fully overridable theme.

**Website & live demos: <https://srjn45.github.io/sp-treeview-v2/>**

> **v4 is a ground-up rewrite** of the original Angular/Material plugin. The
> legacy Angular demo under `src/` is **frozen** (see [below](#legacy-angular-demo-frozen)).
> If you're coming from v3, read the
> [migration guide](docs/migration-v3-to-v4.md).

## Packages

| Package | What it is |
|---|---|
| [`@sp-treeview/core`](packages/core) | Zero-dependency TypeScript state engine (`TreeStore`) — data projection, cascade/indeterminate selection, lazy loading, filtering. Renders nothing. |
| [`@sp-treeview/element`](packages/element) | Native Web Components `<sp-tree>` (inline) and `<sp-tree-select>` (dropdown/overlay field), built on Lit over the core. |

## Features

- Tree view with unlimited nesting, rendered as a cheap flat indented list —
  collapsed/filtered rows are **not in the DOM**.
- Multi-select (checkbox) with **cascade + indeterminate**, or single-select
  (radio); optional "All" row.
- **Lazy loading** with per-node spinners, error rows + retry, staleness guards.
- **Search/filter** that reveals matches with their ancestors and never triggers
  lazy loads.
- Dropdown or overlay **field with removable chips**; form-associated (works in
  plain `<form>`s).
- **WAI-ARIA tree pattern**: roles, `aria-*`, roving tabindex, full keyboard nav.
- **Fully themeable** via `--sp-tree-*` CSS custom properties and `::part()` —
  light + dark defaults built in. Custom-drawn checkboxes/radios, no Material.

## Install

```bash
# core only (bring your own UI)
npm install @sp-treeview/core

# the Web Components (pulls in core, lit, @floating-ui/dom)
npm install @sp-treeview/element
```

> `4.0.0-alpha.0`. Node ≥ 20, ESM only.

## Quick start

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
tree.data = data;                                  // object inputs are properties
tree.loadChildren = async (node) =>
  node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];
tree.addEventListener('sp-change', (e) => {
  const { checked } = (e as CustomEvent<{ checked: TreeNodeData[] }>).detail;
  console.log(checked.map((n) => n.label));
});
```

```html
<sp-tree selection="multi" searchable></sp-tree>
```

Framework usage (React / Vue / plain JS), events, and `::part()` names are in the
[`@sp-treeview/element` README](packages/element/README.md). The store API and
its semantics are in the [`@sp-treeview/core` README](packages/core/README.md).

## Documentation

- [Website — live demos, guides, and full reference](https://srjn45.github.io/sp-treeview-v2/)
- [Core API reference & semantics](packages/core/README.md)
- [Web Components: attributes, events, parts, framework usage](packages/element/README.md)
- [Theming — token table & dark-theme example](docs/theming.md)
- [Migrating from v3 (Angular) to v4](docs/migration-v3-to-v4.md)
- [Design spec](docs/specs/2026-07-10-headless-core-web-component.md)
- Runnable demo: [`examples/index.html`](examples/index.html) (plain HTML, all
  three variants + a themed section); minimal React usage in
  [`examples/react.tsx`](examples/react.tsx).

## Repository layout

```
packages/core      @sp-treeview/core    — headless state engine
packages/element   @sp-treeview/element — <sp-tree>, <sp-tree-select>
examples/          plain-HTML demo, React example, Playwright e2e
docs/              theming, migration, design spec
site/              promotional website + docs (Astro/Starlight, live demos)
src/, angular.json legacy Angular demo — FROZEN, not part of the build gate
```

## Develop

```bash
npm install
npm run lint      # lint all workspace packages
npm test          # unit tests (vitest) + e2e
npm run build     # build core + element + examples (the gate)
```

The root `lint`/`test`/`build` scripts run across the `packages/*` and `examples`
workspaces. The legacy Angular app is **not** in the gate; build it separately
with `npm run build:app` if needed.

## Legacy Angular demo (FROZEN)

The original Angular (2/4/5→21) plugin lives under `src/app/sp-treeview/` and the
demo app under `src/`. It is **frozen**: kept for reference and history, but it
receives **no new features and no bug fixes**, and is excluded from the v4 build
gate. Its verified defects (lazy nodes not rendering, stuck search progress,
radio selection not persisting, delete-by-`value` deleting siblings) are the
reason for the v4 rewrite and are fixed in the new packages. New work should use
`@sp-treeview/core` + `@sp-treeview/element`. See the
[migration guide](docs/migration-v3-to-v4.md).

## Source & issues

- Source: https://github.com/srjn45/sp-treeview-v2
- Issues: https://github.com/srjn45/sp-treeview-v2/issues

## License

MIT © [srjn45](mailto:srajanpathak45@gmail.com)
