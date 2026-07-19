---
title: Angular
description: Use the sp-treeview custom elements in Angular with CUSTOM_ELEMENTS_SCHEMA — property binding and events work natively.
---

`<sp-tree>` and `<sp-tree-select>` are standard custom elements, and Angular
has first-class support for them — **no wrapper module**. The pattern:

1. Import `@sp-treeview/element` once for its registration side effect (in
   `main.ts` or the component file).
2. Add `CUSTOM_ELEMENTS_SCHEMA` to the component so the compiler accepts the
   unknown tags.
3. Bind inputs with `[property]` syntax — Angular sets **DOM properties** on
   custom elements, which is exactly what the object/function inputs need.
4. Listen with `(sp-change)` like any other event.

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import type { TreeNodeData } from '@sp-treeview/core';
import '@sp-treeview/element';

const DATA: TreeNodeData[] = [
  { id: 'india', label: 'India', children: [
    { id: 'mh', label: 'Maharashtra', children: [{ id: 'mumbai', label: 'Mumbai' }] },
  ] },
  { id: 'usa', label: 'USA', hasChildren: true }, // lazy branch
];

@Component({
  selector: 'app-region-picker',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <sp-tree
      selection="multi"
      searchable
      [data]="data"
      [loadChildren]="loadChildren"
      (sp-change)="onChange($event)"
    ></sp-tree>
    <p>Selected: {{ labels().length ? labels().join(', ') : '(none)' }}</p>
  `,
})
export class RegionPickerComponent {
  data = DATA;
  labels = signal<string[]>([]);

  loadChildren = async (node: TreeNodeData): Promise<TreeNodeData[]> =>
    node.id === 'usa' ? [{ id: 'ca', label: 'California' }] : [];

  onChange(e: Event) {
    const detail = (e as CustomEvent<{ checked: TreeNodeData[] }>).detail;
    this.labels.set(detail.checked.map((n) => n.label));
  }
}
```

## The select field in a form

`<sp-tree-select>` is **form-associated**: inside a `<form>` it submits a JSON
array of checked ids under its `name`, with no Angular forms wiring needed.
For reactive forms, listen to `sp-change` and write into your `FormControl`:

```ts
template: `
  <sp-tree-select
    variant="dropdown"
    placeholder="Pick regions…"
    [data]="data"
    (sp-change)="regions.setValue(idsOf($event))"
  ></sp-tree-select>
`
// idsOf(e) { return (e as CustomEvent<{checked: TreeNodeData[]}>).detail.checked.map(n => n.id); }
```

## Notes

- Booleans that default to `true` (`cascade`, `load-once`) are switched off
  through **property binding** — `[cascade]="false"` — not by omitting the
  attribute.
- Keep `data` **stable** (a field, not a getter that allocates) — assigning a
  new array replaces the tree and resets its view state.
- Coming from the legacy `sp-treeview` **Angular plugin** (npm `sp-treeview-v2 ≤ 2.2.1`)?
  The API is completely different — read the
  [migration guide](/sp-treeview-v2/reference/migration/).
