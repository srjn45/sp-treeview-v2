# sp-treeview v4 — Headless Core + Web Component

**Date**: 2026-07-10
**Status**: Approved — executed via warden autopilot
**Supersedes**: the Angular/Material implementation under `src/app/sp-treeview/` (kept in place, frozen)

---

## 1. Why

The Angular 21 implementation has verified defects rooted in one design decision: the
`Node` class mixes consumer data, per-widget view state (checked/collapsed/hidden/progress),
a `_config` back-reference, and change-detection callbacks. Verified in a live browser
(2026-07-10):

- Lazy-loaded children never render until the next unrelated click — `setConfigRecursively`
  is last-writer-wins, so when nodes are shared by several widgets, `popLoad()` fires
  `detectChanges()` on the wrong component instance.
- Search leaves the header progress bar stuck forever (push/pop happen on different config
  objects) and shows no results and no empty state.
- Search over a lazy tree fires `loadChildren` for every unloaded branch (unbounded fan-out).
- Radio mode never persists selection to the model (`getSelectedValues()` empty).
- Delete matches by `value` equality → duplicate values delete siblings; `track node.value`
  breaks on duplicates.
- Collapsed dropdown panels stay in the DOM and remain click/tab targets.
- No tests, no ARIA roles, no keyboard navigation, hardcoded colors.

The goal is **one widget usable from any framework** (React, Vue, Svelte, Astro, plain
JS/jQuery) with a **fully overridable theme**. That means: a framework-agnostic, fully
unit-tested state engine ("headless core") plus a native Web Component as the reference UI.
No Angular, no Angular Material in the new packages.

## 2. Package layout (npm workspaces monorepo)

```
/package.json                 ← becomes workspace root (workspaces: ["packages/*"])
/packages/core                ← @sp-treeview/core    — zero-dependency TS state engine
/packages/element             ← @sp-treeview/element — Lit web components <sp-tree>, <sp-tree-select>
/examples/                    ← plain-HTML demo (primary), minimal React usage example
/src/, /angular.json, …       ← legacy Angular demo: FROZEN. Do not modify except the
                                 root package.json changes listed in task `scaffold`.
```

Root scripts drive the gate: `npm run lint` / `npm test` / `npm run build` must cover both
packages (`npm run <script> --workspaces --if-present`). The legacy Angular demo is **not**
part of the gate.

Rules for all new code:

- TypeScript strict mode; ESLint (flat config) clean.
- `@sp-treeview/core`: **zero runtime dependencies**.
- `@sp-treeview/element`: runtime deps only `lit` and `@floating-ui/dom`.
- Every task leaves root `npm run lint`, `npm test`, `npm run build` green.
- Node ≥ 20. Unit tests: vitest. Browser/e2e: Playwright (chromium already present under
  `~/.cache/ms-playwright/`; use `playwright-core` + `executablePath` if downloads fail).

## 3. Core package — `@sp-treeview/core`

### 3.1 Data model (consumer-owned, treated as immutable by the store)

```ts
interface TreeNodeData<T = unknown> {
  id: string;              // REQUIRED, unique across the tree (fixes delete-by-value bug)
  label: string;
  value?: T;
  children?: TreeNodeData<T>[];  // present = loaded branch; absent = leaf…
  hasChildren?: boolean;         // …unless hasChildren: true → lazy, unloaded branch
  disabled?: boolean;
}
```

`children: []` is a loaded branch with zero children (renders as expandable-empty), NOT a
lazy marker — `hasChildren: true` with `children` absent is the lazy marker. This replaces
the legacy `children: null | []` convention; document the mapping in the migration guide.

### 3.2 Store

```ts
type CheckedState = 'checked' | 'unchecked' | 'indeterminate';
type SelectionMode = 'none' | 'single' | 'multi';

interface TreeStoreOptions<T> {
  data: TreeNodeData<T>[];
  selection?: SelectionMode;          // default 'none'
  cascade?: boolean;                  // default true (multi only): parent↔child propagation
  loadChildren?: (node: TreeNodeData<T>) => Promise<TreeNodeData<T>[]>;
  loadOnce?: boolean;                 // default true: cache loaded children
  matcher?: (query: string, node: TreeNodeData<T>) => boolean; // default: case-insensitive substring on label
  initialChecked?: string[];
  initialExpanded?: string[];
}

interface Row<T> {                    // flattened projection of the VISIBLE tree
  node: TreeNodeData<T>;
  level: number;                      // 1-based (maps to aria-level)
  setSize: number; posInSet: number;  // aria-setsize / aria-posinset
  expandable: boolean; expanded: boolean;
  checked: CheckedState; selected: boolean;
  loading: boolean; loadError: Error | null;
  matched: boolean;                   // true if it matched the active filter itself
}

class TreeStore<T = unknown> {
  // reads — all O(1) or cached
  rows(): Row<T>[];                   // cached; invalidated by any state change
  getChecked(): TreeNodeData<T>[];    // multi: topmost fully-checked nodes (legacy semantics)
  getCheckedLeaves(): TreeNodeData<T>[];
  getSelected(): TreeNodeData<T> | null;  // single mode
  getNode(id: string): TreeNodeData<T> | undefined;
  // commands
  expand(id): void; collapse(id): void; toggleExpanded(id): void;
  setChecked(id, checked: boolean): void; toggleChecked(id): void;
  select(id): void;                   // single mode; also sets checked state on the node
  setAllChecked(checked: boolean): void;
  setFilter(query: string): void; clearFilter(): void;
  retryLoad(id): void;
  setData(data): void; addNode(parentId: string | null, node): void;
  removeNode(id): void; updateNode(id, patch): void;
  // reactivity
  subscribe(fn: (e: TreeChangeEvent) => void): () => void;
}

type TreeChangeEvent =
  | { type: 'rows' }                                   // anything affecting rows()
  | { type: 'checked'; ids: string[] }
  | { type: 'selected'; id: string | null }
  | { type: 'load'; id: string; status: 'start' | 'success' | 'error' };
```

### 3.3 Semantics (the rules the tests encode)

**View state lives in the store, keyed by id** (`Set<string>` / `Map<string, …>`) — never
on the data objects. Two stores can share one data array without interference.

**Cascade checking (multi + cascade):** checking a node checks all non-disabled descendants;
unchecking unchecks them. Ancestor recomputation walks **only the ancestor path** (children
counts cached per parent), not the whole tree — O(depth × branching), never O(n²).
Indeterminate iff descendants are mixed. Disabled nodes are skipped by cascade and excluded
from "all children checked" counts.

**Lazy loading:** `expand(id)` on `hasChildren && children === undefined` (or `loadOnce:
false`) sets `loading`, calls `loadChildren`, and on resolve attaches children, clears
loading, expands, and re-applies cascade (parent checked → new children checked) and the
active filter to the new subtree. On reject: `loadError` set, node stays collapsed,
`retryLoad(id)` re-attempts. Guards: concurrent `expand` on a loading node is a no-op; a
resolve arriving after `setData()` replaced the tree is discarded (staleness token);
collapse during load keeps loading but does not auto-expand on resolve.

**Filtering:** matches only **loaded** nodes — never triggers loadChildren (kills the
fan-out bug). A match reveals and expands all ancestors; non-matching subtrees drop out of
`rows()` (not CSS-hidden). `matched` marks direct matches so the UI can highlight.
`clearFilter()` restores the pre-filter expansion state (snapshot taken at first
`setFilter`). Empty result → `rows()` is `[]`; UI shows the empty state.

**Single selection:** `select(id)` sets exactly one selected/checked node, clearing the
previous one — persisted in the store (fixes the radio bug).

### 3.4 Tests (vitest)

Cover every rule in 3.3 plus: duplicate-id rejection (throw on construction/addNode),
add/remove/update invalidation, subscribe/unsubscribe, out-of-order async resolutions
(fake timers), disabled-node cascade edge cases. Target ≥ 90% line coverage of
`packages/core/src`; enforce via vitest coverage thresholds in the package config.

## 4. Element package — `@sp-treeview/element`

Two custom elements built on Lit, using the core store internally.

### 4.1 `<sp-tree>` — inline tree

- Properties: `data`, `selection`, `cascade`, `loadOnce`, `loadChildren` (function prop),
  `searchable` (renders built-in search box), `showAllNode`, `renderNode` (optional
  `(node, ctx) => TemplateResult` render prop for custom row content; default renders label).
- Events (composed, bubbling): `sp-change` `{detail: {checked: TreeNodeData[], allSelected:
  boolean}}` (multi) / `{detail: {selected}}` (single), `sp-expand`, `sp-collapse`,
  `sp-load-error` `{detail: {node, error}}`.
- Rendering: iterate `store.rows()` as a **flat list** (each row indented via
  `--sp-tree-indent × level`) — collapsed/filtered nodes are *not in the DOM* (fixes the
  hidden-but-interactive bug and keeps big trees cheap). Per-node loading = small inline
  spinner next to the label (not a full-width bar); load error = inline error row with a
  Retry button. Search box: debounced 250 ms, clear (✕) button, "No results" empty state,
  match highlighting via `<mark part="match">`.
- The "All" row (when `showAllNode`) is a regular row at level 1 wired to
  `setAllChecked`; `sp-change` reports `allSelected: true` plus the concrete checked nodes —
  **no sentinel 'ALL' node** in the payload.

### 4.2 `<sp-tree-select>` — dropdown / overlay field

- Attributes: `variant="dropdown" | "overlay"` (one component, no copy-paste pair),
  `placeholder`; everything from `<sp-tree>` forwarded.
- Trigger field: selected chips with per-chip remove (removal updates cascade correctly),
  wraps to max 2 rows then shows a "+N" overflow chip; placeholder when empty.
- Panel: positioned with `@floating-ui/dom` (flip + shift + size middlewares) for
  `dropdown`; full-viewport modal sheet for `overlay`. Open/close: click trigger, `Escape`
  closes, click-outside closes, focus moves into the panel on open and **returns to the
  trigger** on close; panel is removed from the DOM when closed.
- Form participation: `static formAssociated = true` + `ElementInternals.setFormValue`
  (JSON array of checked ids) so it works in plain `<form>`s and framework form libraries.

### 4.3 Accessibility (WAI-ARIA tree pattern — required, not optional)

`role="tree"` / `role="treeitem"` with `aria-level`, `aria-setsize`, `aria-posinset`,
`aria-expanded` (expandable rows only), `aria-checked` (incl. `"mixed"`), `aria-disabled`,
`aria-multiselectable` on the tree in multi mode. Roving tabindex (one tab stop). Keys:
`↓/↑` move, `→` expand/first child, `←` collapse/parent, `Home/End` first/last visible row,
`Enter`/`Space` toggle selection, type-ahead to the next row starting with the typed
character. `aria-busy` while a node loads. The search input and "Done" button are ordinary
tab stops.

### 4.4 Theming (fully overridable)

All visual values flow through CSS custom properties, defined on `:host` with light-first
defaults and dark values behind `@media (prefers-color-scheme: dark)`; consumers override
tokens on the element or any ancestor. Token set (document in the theming guide):

```
--sp-tree-font-family, --sp-tree-font-size, --sp-tree-row-height, --sp-tree-indent,
--sp-tree-radius, --sp-tree-fg, --sp-tree-fg-muted, --sp-tree-bg, --sp-tree-bg-hover,
--sp-tree-accent, --sp-tree-accent-fg, --sp-tree-border, --sp-tree-danger,
--sp-tree-chip-bg, --sp-tree-chip-fg, --sp-tree-panel-bg, --sp-tree-panel-shadow,
--sp-tree-focus-ring
```

Structural restyling via shadow parts on every meaningful element:
`::part(row | toggle | checkbox | radio | label | match | spinner | error | retry | search |
search-input | search-clear | empty | all-row | field | chip | chip-remove | panel | done)`.
Checkbox/radio are custom-drawn (CSS + inline SVG check/dash) so they follow the tokens —
no native-appearance mismatch across browsers, no Material.

## 5. Examples & e2e

`examples/index.html`: plain HTML + `<script type="module">` demo with the India/USA
dataset from the legacy demo, a fake async `loadChildren` (300 ms), all three variants
(inline, dropdown, overlay) — each variant gets **its own store/data copy** — plus a themed
section overriding tokens (e.g. dark + custom accent) to prove overridability.
`examples/react.tsx`: minimal React 19 usage (typed wrapper-free custom element usage) —
compile-checked in CI but not shipped.

Playwright e2e against the demo (these six journeys are exactly what is broken in v3):

1. Expand a lazy node → spinner appears inline → children render when the promise resolves
   (no extra click needed).
2. Type a search term → matching leaf revealed with ancestors expanded; no stuck
   progress; clearing restores the prior expansion; nonsense query shows "No results".
3. Check a leaf → ancestors go indeterminate; check its sibling → parent becomes checked;
   `sp-change` payloads correct.
4. Dropdown: select two leaves, remove one chip → tree state and event payload update.
5. Keyboard-only: tab to tree, navigate with arrows, expand with `→`, check with `Space`,
   open dropdown with `Enter`, close with `Escape`, focus returns to trigger.
6. Closed dropdown panel: its content is absent from the DOM (no hidden interactive nodes).

## 6. Docs

- `packages/core/README.md` — store API reference + semantics rules from §3.3.
- `packages/element/README.md` — element attributes/properties/events/slots/parts + a
  "use with React / Vue / plain JS" section.
- `docs/theming.md` — token table with defaults, part list, worked dark-theme example.
- `docs/migration-v3-to-v4.md` — legacy `Node`/`Config` → new API mapping (incl.
  `children: []` → `hasChildren: true`, value-uniqueness → `id`, `change` sentinel-ALL →
  `allSelected` flag).
- Root `README.md` — rewritten around v4 packages; legacy Angular demo noted as frozen.

## 7. Non-goals (do NOT do in this run)

- No Angular wrapper package (follow-up after v4 ships).
- No virtualization yet — the flat-row rendering makes it easy to add later; leave a note.
- No fixing of legacy `src/app/sp-treeview/` bugs; it stays frozen and out of the gate.
- No publishing to npm (version `4.0.0-alpha.0`, `"private": false` but no publish step).

## 8. Task breakdown (autopilot)

| id | Depends on | Scope |
|---|---|---|
| `scaffold` | — | Workspace root conversion, toolchain fix, package skeletons, gate scripts |
| `core-tree-state` | scaffold | Data model, store, expansion, rows() projection, subscribe + tests |
| `core-selection` | core-tree-state | Cascade multi-check, indeterminate, single select + tests |
| `core-lazy` | core-selection | Async loadChildren orchestration, error/retry, staleness + tests |
| `core-filter` | core-lazy | Filter/reveal/restore, matcher, no-fan-out + tests |
| `element-tree` | core-filter | `<sp-tree>` rendering, tokens, parts, demo page |
| `element-a11y` | element-tree | ARIA tree pattern, keyboard nav, selection UI, events |
| `element-search-lazy` | element-a11y | Search UI, spinners, error/retry rows |
| `element-select` | element-a11y | `<sp-tree-select>` dropdown/overlay, chips, floating-ui, forms |
| `e2e-examples` | element-search-lazy, element-select | examples/, React example, Playwright e2e (§5) |
| `docs` | e2e-examples | §6 docs + root README |

`scaffold` details (it unblocks everything): in root `package.json` bump `ng-packagr` →
`^21.0.0` and `@angular/language-service` → `^21.2.0` so plain `npm install` resolves
(today it needs `--legacy-peer-deps`); add `"workspaces": ["packages/*"]`; add root
`lint`/`test`/`build` scripts that run workspace scripts with `--workspaces --if-present`
(legacy `ng build` stays available as `build:app` and is NOT in the gate); create both
package skeletons (strict tsconfig, vitest in core, vite + vitest in element, shared ESLint
flat config, `.gitignore` additions); regenerate `package-lock.json`.
