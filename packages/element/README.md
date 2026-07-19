# @sp-treeview/element

Native **Web Components** for tree selection, built on [Lit](https://lit.dev) over
the framework-agnostic [`@sp-treeview/core`](https://www.npmjs.com/package/@sp-treeview/core) state engine. Two custom
elements:

- **`<sp-tree>`** — an inline, WAI-ARIA tree with checkbox/radio selection, lazy
  loading, and a built-in search box.
- **`<sp-tree-select>`** — a form field (dropdown or overlay) whose value is a
  tree selection, with removable chips.

Because they are standard custom elements, they work in **React, Vue, Svelte,
Angular, plain HTML/JS** — no per-framework wrapper.

**Website, live demos & guides: <https://srjn45.github.io/sp-treeview-v2/>**

```bash
npm install @sp-treeview/element
# peer/runtime deps: lit, @floating-ui/dom (installed automatically)
```

```ts
// Importing the package registers <sp-tree> and <sp-tree-select> as a side effect.
import '@sp-treeview/element';
```

> Version `4.0.0`. Node ≥ 20. Ships ESM only.

---

## `<sp-tree>`

An inline tree. Renders `store.rows()` as a **flat, indented list** — collapsed
and filtered-out rows are not in the DOM.

### Properties & attributes

Object/function inputs (`data`, `loadChildren`, `renderNode`, `store`) are DOM
**properties** — set them via JS/framework binding, not string attributes.
Primitive inputs also have a reflected attribute.

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `data` | — | `TreeNodeData[]` | `[]` | The tree data (see core data model). |
| `selection` | `selection` | `'none' \| 'single' \| 'multi'` | `'none'` | Selection mode. |
| `cascade` | `cascade` | `boolean` | `true` | Parent↔child propagation (multi). |
| `loadOnce` | `load-once` | `boolean` | `true` | Cache lazily-loaded children. |
| `loadChildren` | — | `(node) => Promise<TreeNodeData[]>` | — | Lazy loader for `hasChildren` nodes. |
| `searchable` | `searchable` | `boolean` | `false` | Render the built-in search box. |
| `showAllNode` | `show-all-node` | `boolean` | `false` | Render a top "All" row wired to `setAllChecked`. |
| `renderNode` | — | `(node, ctx) => TemplateResult` | — | Custom row content (Lit template). |
| `store` | — | `TreeStore` | — | Use an existing store instead of building one from `data`/`selection`/… |

> `cascade` and `loadOnce` default to `true`; because they are boolean
> attributes, set them to `false` through the **property** (`el.loadOnce = false`
> / `.loadOnce=${false}`), not by omitting an attribute.

### Events

All events are `composed` and `bubbling` (`CustomEvent`).

| Event | `detail` | Fires |
|---|---|---|
| `sp-change` | multi: `{ checked: TreeNodeData[], allSelected: boolean }`; single: `{ selected: TreeNodeData \| null }` | On any selection change. |
| `sp-expand` | `{ node: TreeNodeData }` | A row expands. |
| `sp-collapse` | `{ node: TreeNodeData }` | A row collapses. |
| `sp-load-error` | `{ node: TreeNodeData, error: Error }` | A lazy load rejects. |

The multi-mode `sp-change` reports the concrete checked nodes plus
`allSelected` — there is **no sentinel "ALL" node** in the payload.

### `::part()` names

Style internals from outside the shadow DOM via parts (full list and the CSS
custom-property tokens are in [the theming guide](https://srjn45.github.io/sp-treeview-v2/guides/theming/)):

`tree`, `row`, `all-row`, `toggle`, `checkbox`, `radio`, `label`, `match`,
`spinner`, `error`, `retry`, `search`, `search-input`, `search-clear`, `empty`.

```css
sp-tree::part(row) { padding-block: 2px; }
sp-tree::part(match) { background: gold; }
```

---

## `<sp-tree-select>`

A form field whose value is a tree selection. The trigger shows selected leaves
as removable chips (wrapping to 2 rows, then a `+N` overflow chip); activating it
opens a panel that embeds an `<sp-tree>`. The panel — and every node in it — is
**removed from the DOM while closed**, so a closed field leaves no hidden
tab/click targets.

### Additional properties & attributes

Everything from `<sp-tree>` is forwarded, plus:

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `variant` | `variant` | `'dropdown' \| 'overlay'` | `'dropdown'` | Floating panel vs. full-viewport modal sheet. |
| `placeholder` | `placeholder` | `string` | `'Select…'` | Shown when nothing is selected. |
| `selection` | `selection` | `'none' \| 'single' \| 'multi'` | `'multi'` | Note: defaults to `multi` here (`<sp-tree>` defaults to `none`). |

### Methods

`open()`, `close()`, `toggle()` — imperative panel control (the field, `Escape`,
click-outside, and the panel's **Done** button also drive it). On open, focus
moves into the panel; on close it returns to the trigger.

### Events

Emits the same `sp-change` as `<sp-tree>` (re-dispatched from the embedded tree);
`sp-expand` / `sp-collapse` / `sp-load-error` from the inner tree also bubble out.

### Form participation

`static formAssociated = true`: the field sets its form value (via
`ElementInternals`) to a **JSON array of checked node ids**, so it works in plain
`<form>`s and framework form libraries.

```html
<form>
  <sp-tree-select name="regions"></sp-tree-select>
</form>
```

```ts
const fd = new FormData(form);
fd.get('regions'); // e.g. '["mumbai","pune"]'
```

### Additional `::part()` names

Plus the forwarded `<sp-tree>` parts above:

`field`, `placeholder`, `chip`, `chip-overflow`, `chip-remove`, `backdrop`,
`panel`, `done`.

---

## Usage

The data + lazy loader used below:

```ts
import type { TreeNodeData } from '@sp-treeview/core';

const data: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true },
];

const loadChildren = (node: TreeNodeData): Promise<TreeNodeData[]> =>
  new Promise((resolve) =>
    setTimeout(() => resolve(node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : []), 300),
  );

interface MultiChangeDetail { checked: TreeNodeData[]; allSelected: boolean }
```

### Plain JS / TypeScript

```ts
import { SpTree } from '@sp-treeview/element';

const tree = document.createElement('sp-tree') as SpTree;
// Object/function inputs are DOM *properties*, never attributes.
tree.data = data;
tree.loadChildren = loadChildren;
// Primitive inputs may be attributes or properties.
tree.selection = 'multi';
tree.cascade = true;
tree.searchable = true;

tree.addEventListener('sp-change', (e) => {
  const detail = (e as CustomEvent<MultiChangeDetail>).detail;
  console.log('checked:', detail.checked.map((n) => n.label), 'all:', detail.allSelected);
});

document.body.append(tree);
```

The dropdown/overlay field is wired the same way:

```ts
import { SpTreeSelect } from '@sp-treeview/element';

const select = document.createElement('sp-tree-select') as SpTreeSelect;
select.data = data;
select.loadChildren = loadChildren;
select.variant = 'dropdown';        // or 'overlay'
select.selection = 'multi';
select.searchable = true;
select.placeholder = 'Pick regions…';

select.addEventListener('sp-change', (e) => {
  const detail = (e as CustomEvent<MultiChangeDetail>).detail;
  console.log('selected leaves:', detail.checked.map((n) => n.label));
});

document.body.append(select);
```

Plain HTML with an import map (no bundler):

```html
<script type="importmap">
  { "imports": {
    "lit": "https://esm.sh/lit@3",
    "@floating-ui/dom": "https://esm.sh/@floating-ui/dom@1",
    "@sp-treeview/core": "https://esm.sh/@sp-treeview/core@4.0.0",
    "@sp-treeview/element": "https://esm.sh/@sp-treeview/element@4.0.0"
  } }
</script>
<sp-tree-select id="picker" selection="multi" searchable></sp-tree-select>
<script type="module">
  import '@sp-treeview/element';
  document.getElementById('picker').data = [/* … */];
</script>
```

### React

`<sp-tree>` / `<sp-tree-select>` are custom elements, so React uses them
directly — **no wrapper package**. Set object/function inputs through a `ref`;
listen for `sp-change` with `addEventListener`.

```tsx
import { useEffect, useRef, useState } from 'react';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTreeSelect } from '@sp-treeview/element';
import '@sp-treeview/element';

// JSX typings for the custom elements (no wrapper package needed).
type CustomElementProps<E> = React.HTMLAttributes<E> & { ref?: React.Ref<E>; key?: React.Key; class?: string };
type SpTreeSelectProps = CustomElementProps<SpTreeSelect> & {
  variant?: 'dropdown' | 'overlay';
  selection?: 'none' | 'single' | 'multi';
  searchable?: boolean;
  placeholder?: string;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements { 'sp-tree-select': SpTreeSelectProps }
  }
}

export function RegionPicker() {
  const ref = useRef<SpTreeSelect>(null);
  const [labels, setLabels] = useState<string[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.data = data;                 // object/function inputs → properties
    el.loadChildren = loadChildren;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ checked: TreeNodeData[] }>).detail;
      setLabels(detail.checked.map((n) => n.label));
    };
    el.addEventListener('sp-change', onChange);
    return () => el.removeEventListener('sp-change', onChange);
  }, []);

  return (
    <div>
      <sp-tree-select ref={ref} variant="dropdown" selection="multi" searchable placeholder="Pick regions…" />
      <p>Selected: {labels.length ? labels.join(', ') : '(none)'}</p>
    </div>
  );
}
```

### Vue 3

Tell Vue that `sp-*` are custom elements (in your build config:
`compilerOptions.isCustomElement = (tag) => tag.startsWith('sp-')`, or the Vite
`@vitejs/plugin-vue` `template.compilerOptions.isCustomElement` option). Then
bind object/function inputs imperatively via a template ref.

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { TreeNodeData } from '@sp-treeview/core';
import type { SpTreeSelect } from '@sp-treeview/element';
import '@sp-treeview/element';

interface MultiChangeDetail { checked: TreeNodeData[]; allSelected: boolean }

const picker = ref<SpTreeSelect | null>(null);
const labels = ref<string[]>([]);

function onChange(e: Event) {
  const detail = (e as CustomEvent<MultiChangeDetail>).detail;
  labels.value = detail.checked.map((n) => n.label);
}

onMounted(() => {
  const el = picker.value;
  if (!el) return;
  el.data = data;                 // object/function inputs → properties
  el.loadChildren = loadChildren;
  el.addEventListener('sp-change', onChange);
});

onBeforeUnmount(() => {
  picker.value?.removeEventListener('sp-change', onChange);
});
</script>

<template>
  <sp-tree-select ref="picker" variant="dropdown" selection="multi" searchable placeholder="Pick regions…" />
  <p>Selected: {{ labels.length ? labels.join(', ') : '(none)' }}</p>
</template>
```

---

## Theming

Every visual value flows through `--sp-tree-*` CSS custom properties (light + dark
defaults built in); structural restyling uses `::part()`. See
[the theming guide](https://srjn45.github.io/sp-treeview-v2/guides/theming/) for the full token table and a worked
dark-theme override.

## Accessibility

Implements the WAI-ARIA tree pattern: `role="tree"`/`treeitem`, `aria-level`,
`aria-setsize`, `aria-posinset`, `aria-expanded`, `aria-checked` (incl.
`"mixed"`), `aria-disabled`, `aria-busy`, roving tabindex, arrow-key navigation,
`Home`/`End`, `Enter`/`Space` to toggle, and type-ahead.

## License

MIT. Part of [sp-treeview v4](https://github.com/srjn45/sp-treeview-v2).
