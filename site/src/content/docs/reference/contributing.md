---
title: Contributing
description: Repository layout, the build gate, and how to develop sp-treeview locally.
---

Source lives at
[github.com/srjn45/sp-treeview-v2](https://github.com/srjn45/sp-treeview-v2);
bugs and feature requests go to the
[issue tracker](https://github.com/srjn45/sp-treeview-v2/issues). MIT
licensed.

## Repository layout

```
packages/core      @sp-treeview/core    — headless state engine
packages/element   @sp-treeview/element — <sp-tree>, <sp-tree-select>
examples/          plain-HTML demo, React example, Playwright e2e
docs/              theming, migration, design spec
site/              this website (Astro + Starlight + live demos)
src/, angular.json legacy Angular demo — FROZEN, not part of the build gate
```

## Develop

```bash
npm install       # root — installs all workspaces
npm run lint      # lint all workspace packages
npm test          # unit tests (vitest) + Playwright e2e
npm run build     # build core + element + examples (the gate)
```

The root `lint`/`test`/`build` scripts run across the `packages/*` and
`examples` workspaces. The legacy Angular app is **not** in the gate.

## Working on this site

```bash
# one-time: build the element package the demos embed
npm run build --workspace=@sp-treeview/element

cd site
npm install
npm run dev       # bundles the demo widget, then starts Astro dev server
```

The site deploys to GitHub Pages automatically on pushes to `master` that
touch `site/`, the packages, or the workflow
(`.github/workflows/site.yml`).

## Legacy Angular demo (frozen)

The original Angular (2/4/5→21) plugin under `src/app/sp-treeview/` is kept
for reference and history only: **no new features, no bug fixes**. Its
verified defects are the reason for the v4 rewrite — see the
[migration guide](/sp-treeview-v2/reference/migration/).
