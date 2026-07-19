---
title: <sp-tree-select> API
description: Properties, methods, events, form participation, and parts of the dropdown/overlay select field.
---

A form field whose value is a tree selection. The trigger shows selected
leaves as removable chips (wrapping to 2 rows, then a `+N` overflow chip);
activating it opens a panel that embeds an `<sp-tree>`. The panel — and every
node in it — is **removed from the DOM while closed**.

```ts
import '@sp-treeview/element';
import { SpTreeSelect } from '@sp-treeview/element';
```

## Properties & attributes

Everything from [`<sp-tree>`](/sp-treeview-v2/reference/sp-tree/) is forwarded
(`data`, `cascade`, `loadOnce`, `loadChildren`, `searchable`, `showAllNode`,
`renderNode`, `store`), plus:

| Property | Attribute | Type | Default | Description |
|---|---|---|---|---|
| `variant` | `variant` | `'dropdown' \| 'overlay'` | `'dropdown'` | Floating panel vs. full-viewport modal sheet. |
| `placeholder` | `placeholder` | `string` | `'Select…'` | Shown when nothing is selected. |
| `selection` | `selection` | `'none' \| 'single' \| 'multi'` | `'multi'` | **Defaults to `multi` here** (`<sp-tree>` defaults to `none`). |

## Methods

| Method | Description |
|---|---|
| `open()` | Open the panel; focus moves into it. |
| `close()` | Close the panel; focus returns to the trigger. |
| `toggle()` | Toggle open/closed. |

The field itself, `Escape`, click-outside, and the panel's **Done** button
also drive open/close.

## Events

Emits the same `sp-change` as `<sp-tree>` (re-dispatched from the embedded
tree); `sp-expand` / `sp-collapse` / `sp-load-error` from the inner tree also
bubble out. See the [`<sp-tree>` events table](/sp-treeview-v2/reference/sp-tree/#events).

## Form participation

`static formAssociated = true`: the field sets its form value (via
`ElementInternals`) to a **JSON array of checked node ids**, so it works in
plain `<form>`s and framework form libraries.

```html
<form>
  <sp-tree-select name="regions"></sp-tree-select>
</form>
```

```ts
new FormData(form).get('regions'); // e.g. '["mumbai","pune"]'
```

## `::part()` names

All `<sp-tree>` parts are re-exported via `exportparts`
(`sp-tree-select::part(row)` works), plus:

`field`, `placeholder`, `chip`, `chip-overflow`, `chip-remove`, `backdrop`,
`panel`, `done`.

```css
sp-tree-select::part(chip) { border-radius: 999px; }
sp-tree-select::part(done) { font-weight: 700; }
```
