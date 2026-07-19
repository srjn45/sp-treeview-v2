---
title: The select field
description: <sp-tree-select> — a dropdown/overlay form field whose value is a tree selection, with removable chips.
---

`<sp-tree-select>` is a form field whose value is a tree selection. The
trigger shows selected leaves as **removable chips** (wrapping to two rows,
then a `+N` overflow chip); activating it opens a panel that embeds a full
`<sp-tree>`. Try both variants in the [live demos](/sp-treeview-v2/#demos).

```html
<sp-tree-select
  variant="dropdown"
  selection="multi"
  searchable
  placeholder="Pick regions…">
</sp-tree-select>
```

```ts
const select = document.querySelector('sp-tree-select');
select.data = data;               // properties, like <sp-tree>
select.loadChildren = loadChildren;
select.addEventListener('sp-change', (e) => {
  console.log(e.detail.checked, e.detail.allSelected);
});
```

Everything `<sp-tree>` accepts is forwarded (`data`, `selection`, `cascade`,
`searchable`, `loadChildren`, `renderNode`, `store`, …), plus:

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `variant` | `variant` | `'dropdown' \| 'overlay'` | `'dropdown'` | Floating panel vs. full-viewport modal sheet. |
| `placeholder` | `placeholder` | `string` | `'Select…'` | Shown when nothing is selected. |
| `selection` | `selection` | `'none' \| 'single' \| 'multi'` | `'multi'` | Note: defaults to `multi` here (`<sp-tree>` defaults to `none`). |

## Dropdown vs. overlay

- **`dropdown`** — a floating panel anchored to the field (positioned with
  Floating UI: flips and resizes to stay in the viewport). Best on desktop.
- **`overlay`** — a full-viewport modal sheet with a backdrop. Best on small
  screens.

Either way, the panel — and every tree node in it — is **removed from the DOM
while closed**: a closed field leaves no hidden tab or click targets.

## Opening and closing

The field opens on click/`Enter`/`Space`; `Escape`, clicking outside, and the
panel's **Done** button close it. On open, focus moves into the panel; on
close it returns to the trigger. Imperative control:

```ts
select.open();
select.close();
select.toggle();
```

## Form participation

The element is form-associated (`static formAssociated = true`). It sets its
form value via `ElementInternals` to a **JSON array of checked node ids**:

```html
<form>
  <sp-tree-select name="regions" selection="multi"></sp-tree-select>
</form>
```

```ts
new FormData(form).get('regions'); // e.g. '["mumbai","pune"]'
```

This works with plain form submission and with framework form libraries that
read `FormData`.

## Styling

All `<sp-tree>` parts are re-exported (so `sp-tree-select::part(row)` works),
plus field-specific parts: `field`, `placeholder`, `chip`, `chip-overflow`,
`chip-remove`, `backdrop`, `panel`, `done`.

```css
sp-tree-select::part(chip) { border-radius: 999px; }
sp-tree-select::part(panel) { border: 2px solid var(--brand); }
```

See [Theming](/sp-treeview-v2/guides/theming/) for the token table.
