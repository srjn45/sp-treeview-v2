---
title: Svelte
description: Use the sp-treeview custom elements in Svelte — props land on DOM properties automatically.
---

`<sp-tree>` and `<sp-tree-select>` are standard custom elements, so Svelte uses
them directly — **no wrapper package**. Svelte decides per attribute whether to
set a DOM **property** or an attribute by checking whether the property exists
on the element, so make sure `@sp-treeview/element` is imported (registering
the elements) before the component renders.

```svelte
<script>
  import '@sp-treeview/element'; // registers <sp-tree> / <sp-tree-select>

  const data = [
    { id: 'india', label: 'India', children: [
      { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
    ] },
    { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
  ];

  const loadChildren = async (node) =>
    node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];

  let labels = $state([]);

  function onChange(e) {
    labels = e.detail.checked.map((n) => n.label);
  }
</script>

<sp-tree
  selection="multi"
  searchable
  {data}
  {loadChildren}
  onsp-change={onChange}
></sp-tree>

<p>Selected: {labels.length ? labels.join(', ') : '(none)'}</p>
```

- `{data}` / `{loadChildren}` land on the element's **properties** — exactly
  what the object/function inputs require.
- In Svelte 5, an attribute starting with `on` is an event handler, so
  `onsp-change={…}` listens for the `sp-change` custom event. In **Svelte 4**
  use the directive form `on:sp-change={onChange}` instead.

## Explicit wiring (works everywhere)

If you prefer not to rely on the prop heuristic — or you target older Svelte —
bind the element and wire it imperatively:

```svelte
<script>
  import { onMount } from 'svelte';
  import '@sp-treeview/element';

  let el;
  let labels = [];

  onMount(() => {
    el.data = data;
    el.loadChildren = loadChildren;
    const onChange = (e) => (labels = e.detail.checked.map((n) => n.label));
    el.addEventListener('sp-change', onChange);
    return () => el.removeEventListener('sp-change', onChange);
  });
</script>

<sp-tree bind:this={el} selection="multi" searchable></sp-tree>
```

## Notes

- Booleans that default to `true` (`cascade`, `loadOnce`) are switched off via
  the **property** (`el.loadOnce = false` in the explicit wiring, or
  `loadOnce={false}` as a prop) — omitting the attribute is not enough.
- Keep `data` **stable** — assigning a new array replaces the tree and resets
  its view state.
- The select field works the same way; it is form-associated, so inside a
  `<form>` it submits a JSON array of checked ids under its `name` — see
  [the select field](/sp-treeview-v2/guides/tree-select/).
